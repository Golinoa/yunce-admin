import { ActivityStatus, BannerStatus, Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';

// 统一的 weekday 工具：周日=0, 周一=1, ..., 周六=6
const getDayOfWeek = (date: Date): number => date.getDay();

const HOME_OPERATION_SLOTS = ['HOME_BANNER', 'HOME_POPUP', 'HOME_CARD', 'HOME_NOTICE', 'HOME_FLOATING'] as const;

const buildActionConfig = (
  jumpType?: null | string,
  jumpValue?: null | string,
  actionConfig?: Prisma.JsonValue | null,
) => {
  if (actionConfig && typeof actionConfig === 'object' && !Array.isArray(actionConfig)) {
    return actionConfig as Record<string, unknown>;
  }

  const normalizedJumpType = jumpType?.toUpperCase();

  if (!normalizedJumpType || normalizedJumpType === 'NONE') {
    return { type: 'NONE' };
  }

  if (normalizedJumpType === 'WEBVIEW') {
    return { type: 'WEBVIEW', url: jumpValue ?? '' };
  }

  if (normalizedJumpType === 'MINI_PROGRAM') {
    return { appId: jumpValue ?? '', type: 'MINI_PROGRAM' };
  }

  return { path: jumpValue ?? '', type: normalizedJumpType };
};

const normalizeDisplayConfig = (displayConfig?: Prisma.JsonValue | null) => {
  if (displayConfig && typeof displayConfig === 'object' && !Array.isArray(displayConfig)) {
    return displayConfig as Record<string, unknown>;
  }

  return null;
};

// ==================== 教师首页聚合 ====================

export const getTeacherHome = async (teacherId: string) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  const dayOfWeek = getDayOfWeek(now); // 周日=0, 周一=1, ..., 周六=6

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      profile: { select: { id: true, nickname: true, avatar: true, name: true } },
    },
  });

  if (!teacher) throw new NotFoundError('教师不存在');

  // 并行查询首页所需数据
  const [
    students,
    studentCount,
    todaySchedules,
    recentRecords,
    todayRecordCount,
    totalRemainingHours,
    unreadNotificationCount,
    activePackageCount,
  ] = await Promise.all([
    // 学生列表（最近 10 个）
    prisma.student.findMany({
      where: { teacherId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        avatar: true,
        nickname: true,
        coursePackages: {
          where: { status: 'ACTIVE' },
          select: { totalHours: true, usedHours: true },
        },
      },
    }),

    prisma.student.count({
      where: { teacherId, status: 'ACTIVE' },
    }),

    // 今日排课
    prisma.schedule.findMany({
      where: { teacherId, dayOfWeek },
      include: {
        class: { select: { id: true, name: true, subject: true } },
      },
      orderBy: { startTime: 'asc' },
    }),

    // 最近消课记录（5 条）
    prisma.lessonRecord.findMany({
      where: { teacherId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        student: { select: { id: true, name: true, avatar: true } },
      },
    }),

    // 今日消课数
    prisma.lessonRecord.count({
      where: {
        teacherId,
        lessonDate: { gte: todayStart, lte: todayEnd },
        status: 'NORMAL',
      },
    }),

    // 所有活跃课包剩余课时总数
    prisma.coursePackage.aggregate({
      where: { teacherId, status: 'ACTIVE' },
      _sum: { totalHours: true, usedHours: true },
    }),

    // 未读通知数
    prisma.notification.count({
      where: {
        receiverId: teacher.profileId,
        read: false,
      },
    }),

    // 活跃课包数
    prisma.coursePackage.count({
      where: { teacherId, status: 'ACTIVE' },
    }),
  ]);

  // 计算学生剩余课时
  const studentsWithHours = students.map((s) => {
    const totalHours = s.coursePackages.reduce((sum, p) => sum + p.totalHours, 0);
    const usedHours = s.coursePackages.reduce((sum, p) => sum + p.usedHours, 0);
    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      nickname: s.nickname,
      remainingHours: totalHours - usedHours,
    };
  });

  // 计算总剩余课时
  const remainingHours = (totalRemainingHours._sum.totalHours ?? 0) - (totalRemainingHours._sum.usedHours ?? 0);

  return {
    teacher: {
      id: teacher.id,
      nickname: teacher.profile?.nickname,
      name: teacher.profile?.name,
      avatar: teacher.profile?.avatar,
      institution: teacher.institution,
      inviteCode: teacher.inviteCode,
    },
    stats: {
      studentCount,
      todayScheduleCount: todaySchedules.length,
      todayRecordCount,
      activePackageCount,
      totalRemainingHours: remainingHours,
      unreadNotificationCount,
    },
    students: studentsWithHours,
    todaySchedules: todaySchedules.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      class: s.class
        ? { id: s.class.id, name: s.class.name, subject: s.class.subject }
        : null,
      note: s.note,
      color: s.color,
    })),
    recentRecords: recentRecords.map((r) => ({
      id: r.id,
      lessonDate: r.lessonDate,
      duration: r.duration,
      hoursUsed: r.hoursUsed,
      content: r.content,
      performance: r.performance,
      student: r.student,
    })),
  };
};

// ==================== 家长首页聚合 ====================

export const getParentHome = async (parentId: string) => {
  // 查找家长绑定的学生
  const parent = await prisma.studentParent.findUnique({
    where: { id: parentId },
    include: {
      profile: { select: { nickname: true, avatar: true, name: true } },
    },
  });

  if (!parent) throw new NotFoundError('家长不存在');

  // 查找绑定的学生
  const bindings = await prisma.studentParent.findMany({
    where: { profileId: parent.profileId, bindStatus: 'BOUND' },
    select: { studentId: true },
  });

  const studentIds = bindings
    .map((b) => b.studentId)
    .filter((id): id is string => id !== null);

  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);

  const classBindings = await prisma.classStudent.findMany({
    where: {
      studentId: { in: studentIds },
    },
    select: { classId: true },
  });

  const classIds = classBindings.map((binding) => binding.classId);

  // 并行查询
  const [students, recentRecords, unreadNotificationCount, todaySchedules] = await Promise.all([
    // 学生列表（含课包信息）
    prisma.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        avatar: true,
        nickname: true,
        coursePackages: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, totalHours: true, usedHours: true, validEnd: true },
        },
      },
    }),

    // 最近消课记录
    prisma.lessonRecord.findMany({
      where: { studentId: { in: studentIds } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        student: { select: { id: true, name: true } },
      },
    }),

    // 未读通知数
    prisma.notification.count({
      where: { receiverId: parent.profileId ?? '', read: false },
    }),

    // 今日课表：优先通过 class -> classStudents 链路查询，兼容一对一 studentId 排课
    prisma.schedule.findMany({
      where: {
        dayOfWeek,
        OR: [
          { classId: { in: classIds } },
          { studentId: { in: studentIds } },
        ],
      },
      include: {
        class: { select: { id: true, name: true, subject: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  // 计算学生剩余课时
  const studentsWithHours = students.map((s) => {
    const totalHours = s.coursePackages.reduce((sum, p) => sum + p.totalHours, 0);
    const usedHours = s.coursePackages.reduce((sum, p) => sum + p.usedHours, 0);
    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      nickname: s.nickname,
      remainingHours: totalHours - usedHours,
      packages: s.coursePackages.map((p) => ({
        id: p.id,
        name: p.name,
        totalHours: p.totalHours,
        usedHours: p.usedHours,
        remainingHours: p.totalHours - p.usedHours,
        validEnd: p.validEnd,
      })),
    };
  });

  return {
    parent: {
      id: parent.id,
      nickname: parent.profile?.nickname,
      name: parent.profile?.name,
      avatar: parent.profile?.avatar,
      relation: parent.relation,
    },
    stats: {
      studentCount: studentsWithHours.length,
      totalRemainingHours: studentsWithHours.reduce((sum, s) => sum + s.remainingHours, 0),
      unreadNotificationCount,
      todayScheduleCount: todaySchedules.length,
    },
    students: studentsWithHours,
    recentRecords: recentRecords.map((r) => ({
      id: r.id,
      lessonDate: r.lessonDate,
      duration: r.duration,
      hoursUsed: r.hoursUsed,
      content: r.content,
      performance: r.performance,
      student: r.student,
    })),
    todaySchedules: todaySchedules.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      class: s.class
        ? { id: s.class.id, name: s.class.name, subject: s.class.subject }
        : null,
      note: s.note,
      color: s.color,
    })),
  };
};

// ==================== 未读通知数 ====================

export const getUnreadNotificationCount = async (profileId: string) => {
  const count = await prisma.notification.count({
    where: { receiverId: profileId, read: false },
  });
  return { count };
};

export const getOperationContent = async () => {
  const now = new Date();

  const [banners, activities] = await Promise.all([
    prisma.banner.findMany({
      where: {
        status: BannerStatus.ACTIVE,
        slotKey: { in: [...HOME_OPERATION_SLOTS] },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ slotKey: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
    prisma.activity.findMany({
      where: {
        status: ActivityStatus.ACTIVE,
        slotKey: { in: [...HOME_OPERATION_SLOTS] },
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ slotKey: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
  ]);

  const grouped = {
    banners: banners
      .filter((item) => item.slotKey === 'HOME_BANNER')
      .map((item) => ({
        actionConfig: buildActionConfig(item.jumpType, item.jumpValue, item.actionConfig),
        displayConfig: normalizeDisplayConfig(item.displayConfig),
        endsAt: item.endsAt,
        id: item.id,
        imageUrl: item.imageUrl,
        slotKey: item.slotKey,
        sortOrder: item.sortOrder,
        startsAt: item.startsAt,
        templateKey: item.templateKey,
        title: item.title,
      })),
    cards: activities
      .filter((item) => item.slotKey === 'HOME_CARD')
      .map((item) => ({
        actionConfig: buildActionConfig(item.jumpType, item.jumpValue, item.actionConfig),
        content: item.content,
        coverImageUrl: item.coverImageUrl,
        displayConfig: normalizeDisplayConfig(item.displayConfig),
        endsAt: item.endsAt,
        id: item.id,
        slotKey: item.slotKey,
        sortOrder: item.sortOrder,
        startsAt: item.startsAt,
        summary: item.summary,
        templateKey: item.templateKey,
        title: item.title,
      })),
    floatings: activities
      .filter((item) => item.slotKey === 'HOME_FLOATING')
      .map((item) => ({
        actionConfig: buildActionConfig(item.jumpType, item.jumpValue, item.actionConfig),
        content: item.content,
        coverImageUrl: item.coverImageUrl,
        displayConfig: normalizeDisplayConfig(item.displayConfig),
        id: item.id,
        slotKey: item.slotKey,
        summary: item.summary,
        templateKey: item.templateKey,
        title: item.title,
      })),
    notices: activities
      .filter((item) => item.slotKey === 'HOME_NOTICE')
      .map((item) => ({
        actionConfig: buildActionConfig(item.jumpType, item.jumpValue, item.actionConfig),
        content: item.content,
        displayConfig: normalizeDisplayConfig(item.displayConfig),
        id: item.id,
        slotKey: item.slotKey,
        summary: item.summary,
        templateKey: item.templateKey,
        title: item.title,
      })),
    popups: activities
      .filter((item) => item.slotKey === 'HOME_POPUP')
      .map((item) => ({
        actionConfig: buildActionConfig(item.jumpType, item.jumpValue, item.actionConfig),
        content: item.content,
        coverImageUrl: item.coverImageUrl,
        displayConfig: normalizeDisplayConfig(item.displayConfig),
        endsAt: item.endsAt,
        id: item.id,
        slotKey: item.slotKey,
        startsAt: item.startsAt,
        summary: item.summary,
        templateKey: item.templateKey,
        title: item.title,
      })),
  };

  return {
    placements: {
      banners: grouped.banners,
      cards: grouped.cards,
      floatings: grouped.floatings,
      notices: grouped.notices,
      popups: grouped.popups,
    },
    updatedAt: now,
  };
};

// ==================== 教师首页统计（按时段） ====================

export const getTeacherHomeStats = async (teacherId: string, period: string = 'month') => {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'week':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'month':
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
  }

  const [lessonCount, totalHours, studentCount, packageCount] = await Promise.all([
    prisma.lessonRecord.count({
      where: {
        teacherId,
        lessonDate: { gte: startDate },
        status: 'NORMAL',
      },
    }),
    prisma.lessonRecord.aggregate({
      where: {
        teacherId,
        lessonDate: { gte: startDate },
        status: 'NORMAL',
      },
      _sum: { duration: true },
    }),
    prisma.student.count({
      where: { teacherId, status: 'ACTIVE' },
    }),
    prisma.coursePackage.count({
      where: { teacherId, status: 'ACTIVE' },
    }),
  ]);

  return {
    period,
    lessonCount,
    totalHours: totalHours._sum.duration ?? 0,
    studentCount,
    packageCount,
  };
};

// ==================== 教师首页待办事项 ====================

export const getTeacherTodos = async (teacherId: string) => {
  const now = new Date();

  const [pendingLeaves, expiringPackages, activePackages] = await Promise.all([
    // 待审批请假
    prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
        OR: [
          { teacherId },
          {
            teacherId: null,
            student: { teacherId },
          },
        ],
      },
    }),

    // 即将过期的课包（7 天内）
    prisma.coursePackage.count({
      where: {
        teacherId,
        status: 'ACTIVE',
        validEnd: {
          gte: now,
          lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),

    // 课时不足的学生（剩余 < 5 课时）
    prisma.coursePackage.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
      },
      select: {
        studentId: true,
        totalHours: true,
        usedHours: true,
      },
    }),
  ]);

  const lowHourStudentCount = activePackages.reduce((studentHoursMap, pkg) => {
    const remainingHours = pkg.totalHours - pkg.usedHours;
    const currentRemaining = studentHoursMap.get(pkg.studentId) ?? 0;
    studentHoursMap.set(pkg.studentId, currentRemaining + remainingHours);
    return studentHoursMap;
  }, new Map<string, number>());

  const lowHourStudents = Array.from(lowHourStudentCount.values()).filter(
    (remainingHours) => remainingHours < 5,
  ).length;

  return {
    pendingLeaves,
    expiringPackages,
    lowHourStudents,
  };
};
