import { Prisma, Role, LessonStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, BusinessError } from '../utils/errors';
import {
  countLessonRecords,
  findLessonRecordDetail,
  findLessonRecordList,
  findLessonRecordsForCalendar,
  findStudentMonthlyLessonRecords,
} from './lesson-record.repository';
import {
  assertParentBoundToStudent,
  assertTeacherOwnsStudent,
  resolveParentAuthorizedStudentIds,
} from '../utils/permission';
import {
  applyPackageHoursDelta,
  calculateHoursUsed,
  lockCoursePackageForUpdate,
  lockLessonRecordForUpdate,
  normalizeLessonHoursUsed,
} from '../utils/lesson-hours';
import type { CreateLessonRecordInput, UpdateLessonRecordInput, LessonRecordListQuery } from './lesson-record.validator';

// ==================== 创建消课 ====================

export const createLessonRecord = async (teacherId: string, input: CreateLessonRecordInput) => {
  // 验证学生归属
  await assertTeacherOwnsStudent(input.studentId, teacherId);

  let remainingHours: number | null = null;
  const hoursUsed = calculateHoursUsed(input.duration);

  // 使用事务处理课时扣减
  const record = await prisma.$transaction(async (tx) => {
    // 若指定 packageId，扣减课时（使用行级锁防止并发超扣）
    if (input.packageId) {
      const pkg = await lockCoursePackageForUpdate(tx, input.packageId);

      if (!pkg) throw new NotFoundError('课时套餐不存在');
      if (pkg.studentId !== input.studentId) throw new BusinessError('该套餐不属于此学生');
      if (pkg.status !== 'ACTIVE') throw new BusinessError('该套餐已失效');
      const { newUsedHours, newStatus } = applyPackageHoursDelta(pkg, hoursUsed);

      await tx.coursePackage.update({
        where: { id: input.packageId },
        data: { usedHours: newUsedHours, status: newStatus },
      });

      remainingHours = pkg.totalHours - newUsedHours;
    }

    // 若指定 classId，验证班级归属
    if (input.classId) {
      const cls = await tx.class.findUnique({ where: { id: input.classId } });
      if (!cls) throw new NotFoundError('班级不存在');
      if (cls.teacherId !== teacherId) throw new ForbiddenError('无权操作该班级');
    }

    // 若指定 scheduleId，验证排课归属
    if (input.scheduleId) {
      const schedule = await tx.schedule.findUnique({ where: { id: input.scheduleId } });
      if (!schedule) throw new NotFoundError('排课不存在');
      if (input.classId && schedule.classId !== input.classId) {
        throw new BusinessError('排课不属于指定班级');
      }
    }

    // 创建消课记录
    const data: Prisma.LessonRecordCreateInput = {
      teacherId,
      student: { connect: { id: input.studentId } },
      lessonDate: new Date(input.lessonDate),
      duration: input.duration,
      hoursUsed,
      content: input.content ?? null,
      homework: input.homework ?? null,
      status: LessonStatus.NORMAL,
    };

    if (input.packageId) {
      data.package = { connect: { id: input.packageId } };
    }
    if (input.classId) {
      data.class = { connect: { id: input.classId } };
    }
    if (input.scheduleId) {
      data.schedule = { connect: { id: input.scheduleId } };
    }

    return tx.lessonRecord.create({ data });
  });

  // 查询关联信息用于响应
  const fullRecord = await prisma.lessonRecord.findUnique({
    where: { id: record.id },
    include: {
      student: { select: { name: true } },
      package: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  return {
    id: record.id,
    studentId: record.studentId,
    studentName: fullRecord?.student.name ?? null,
    packageId: record.packageId,
    packageName: fullRecord?.package?.name ?? null,
    classId: record.classId,
    className: fullRecord?.class?.name ?? null,
    lessonDate: record.lessonDate,
    duration: record.duration,
    content: record.content,
    homework: record.homework,
    status: record.status,
    remainingHours,
    createdAt: record.createdAt,
  };
};

// ==================== 消课列表 ====================

export const listLessonRecords = async (
  userId: string,
  role: Role,
  profileId: string | null,
  query: LessonRecordListQuery,
) => {
  const { page, pageSize, studentId, classId, startDate, endDate, status } = query;

  const where: Prisma.LessonRecordWhereInput = {};

  // 角色过滤
  if (role === Role.TEACHER) {
    where.student = { teacherId: userId };
  } else {
    // PARENT：查绑定学生的记录
    const studentIds = await resolveParentAuthorizedStudentIds(profileId, undefined, {
      missingProfileMessage: '无权查看该学生的记录',
      forbiddenMessage: '无权查看该学生的记录',
    });
    where.studentId = { in: studentIds };
  }

  // 筛选条件：注意家长端的 studentId 必须在授权集合内
  if (studentId) {
    if (role === Role.TEACHER) {
      where.studentId = studentId;
    } else {
      const [authorizedStudentId] = await resolveParentAuthorizedStudentIds(profileId, studentId, {
        missingProfileMessage: '无权查看该学生的记录',
        forbiddenMessage: '无权查看该学生的记录',
      });
      where.studentId = authorizedStudentId;
    }
  }
  if (classId) where.classId = classId;
  if (status) where.status = status;
  if (startDate || endDate) {
    const lessonDateFilter: Prisma.DateTimeFilter = {};
    if (startDate) lessonDateFilter.gte = new Date(startDate);
    if (endDate) lessonDateFilter.lte = new Date(endDate);
    where.lessonDate = lessonDateFilter;
  }

  const [records, total] = await Promise.all([
    findLessonRecordList(where, page, pageSize),
    countLessonRecords(where),
  ]);

  const list = records.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.name,
    studentAvatar: r.student.avatar,
    packageName: r.package?.name ?? null,
    className: r.class?.name ?? null,
    lessonDate: r.lessonDate,
    duration: r.duration,
    hoursUsed: r.hoursUsed,
    content: r.content,
    status: r.status,
    createdAt: r.createdAt,
  }));

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ==================== 消课详情 ====================

export const getLessonRecordDetail = async (
  recordId: string,
  userId: string,
  role: Role,
  profileId: string | null,
) => {
  const record = await findLessonRecordDetail(recordId);

  if (!record) throw new NotFoundError('消课记录不存在');

  // 权限校验
  if (role === Role.TEACHER) {
    const student = await prisma.student.findUnique({ where: { id: record.studentId } });
    if (!student || student.teacherId !== userId) throw new ForbiddenError('无权查看该记录');
  } else {
    await assertParentBoundToStudent(profileId, record.studentId, {
      missingProfileMessage: '无权查看该记录',
      forbiddenMessage: '无权查看该记录',
    });
  }

  return {
    id: record.id,
    student: record.student,
    package: record.package,
    class: record.class,
    schedule: record.schedule,
    lessonDate: record.lessonDate,
    duration: record.duration,
    content: record.content,
    homework: record.homework,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

// ==================== 更新消课 ====================

export const updateLessonRecord = async (
  recordId: string,
  teacherId: string,
  input: UpdateLessonRecordInput,
) => {
  const record = await prisma.lessonRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new NotFoundError('消课记录不存在');

  // 验证归属
  await assertTeacherOwnsStudent(record.studentId, teacherId);

  // 处理状态变更
  if (input.status && input.status !== record.status) {
    return handleStatusChange(recordId, record, input);
  }

  // 普通更新
  const data: Prisma.LessonRecordUpdateInput = {};
  if (input.content !== undefined) data.content = input.content;
  if (input.homework !== undefined) data.homework = input.homework;

  const updated = await prisma.lessonRecord.update({
    where: { id: recordId },
    data,
  });

  return updated;
};

// 状态变更处理（含课时回滚/扣减）
const handleStatusChange = async (
  recordId: string,
  record: {
    id: string;
    status: string;
    packageId: string | null;
    studentId: string;
    duration: number;
    hoursUsed: number | null;
  },
  input: UpdateLessonRecordInput,
) => {
  return prisma.$transaction(async (tx) => {
    const lockedRecord = await lockLessonRecordForUpdate(tx, recordId);
    if (!lockedRecord) {
      throw new NotFoundError('消课记录不存在');
    }

    const oldStatus = lockedRecord.status as LessonStatus;
    const newStatus = input.status!;
    const hoursUsed = normalizeLessonHoursUsed(lockedRecord);

    if (oldStatus === newStatus) {
      throw new BusinessError('消课记录状态已更新，请刷新后重试', 409);
    }

    // NORMAL → CANCELLED：课时回滚
    if (oldStatus === LessonStatus.NORMAL && newStatus === LessonStatus.CANCELLED) {
      if (lockedRecord.packageId) {
        const pkg = await lockCoursePackageForUpdate(tx, lockedRecord.packageId);

        if (pkg) {
          const { newUsedHours, newStatus: nextStatus } = applyPackageHoursDelta(pkg, -hoursUsed);
          await tx.coursePackage.update({
            where: { id: lockedRecord.packageId },
            data: { usedHours: newUsedHours, status: nextStatus },
          });
        }
      }
    }

    // CANCELLED → NORMAL：重新扣减
    if (oldStatus === LessonStatus.CANCELLED && newStatus === LessonStatus.NORMAL) {
      if (lockedRecord.packageId) {
        const pkg = await lockCoursePackageForUpdate(tx, lockedRecord.packageId);

        if (pkg) {
          const { newUsedHours, newStatus: newPkgStatus } = applyPackageHoursDelta(pkg, hoursUsed);
          await tx.coursePackage.update({
            where: { id: lockedRecord.packageId },
            data: { usedHours: newUsedHours, status: newPkgStatus },
          });
        }
      }
    }

    const data: Prisma.LessonRecordUpdateInput = { status: newStatus };
    if (input.content !== undefined) data.content = input.content;
    if (input.homework !== undefined) data.homework = input.homework;

    return tx.lessonRecord.update({
      where: { id: recordId },
      data,
    });
  });
};

// ==================== 删除消课 ====================

export const deleteLessonRecord = async (recordId: string, teacherId: string) => {
  await prisma.$transaction(async (tx) => {
    const record = await lockLessonRecordForUpdate(tx, recordId);
    if (!record) throw new NotFoundError('消课记录不存在');

    // 验证归属
    const student = await tx.student.findUnique({ where: { id: record.studentId } });
    if (!student || student.teacherId !== teacherId) {
      throw new ForbiddenError('无权操作该消课记录');
    }

    // 若记录关联了套餐且状态为 NORMAL，回滚课时
    if (record.packageId && record.status === LessonStatus.NORMAL) {
      const pkg = await lockCoursePackageForUpdate(tx, record.packageId);

      if (pkg) {
        const hoursUsed = normalizeLessonHoursUsed(record);
        const { newUsedHours, newStatus: newPkgStatus } = applyPackageHoursDelta(pkg, -hoursUsed);
        await tx.coursePackage.update({
          where: { id: record.packageId },
          data: { usedHours: newUsedHours, status: newPkgStatus },
        });
      }
    }

    // 物理删除
    await tx.lessonRecord.delete({ where: { id: recordId } });
  });
};

// ==================== 学生课时统计 ====================

export const getStudentHours = async (
  studentId: string,
  userId: string,
  role: Role,
  profileId: string | null,
) => {
  // 权限校验
  if (role === Role.TEACHER) {
    await assertTeacherOwnsStudent(studentId, userId);
  } else {
    await assertParentBoundToStudent(profileId, studentId, {
      missingProfileMessage: '无权查看该记录',
      forbiddenMessage: '无权查看该记录',
    });
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      coursePackages: {
        select: {
          id: true,
          name: true,
          totalHours: true,
          usedHours: true,
          status: true,
          validEnd: true,
        },
      },
    },
  });

  if (!student) throw new NotFoundError('学生不存在');

  const totalHours = student.coursePackages.reduce((sum, p) => sum + p.totalHours, 0);
  const usedHours = student.coursePackages.reduce((sum, p) => sum + p.usedHours, 0);

  // 月度统计：最近 12 个月
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const monthlyRecords = await findStudentMonthlyLessonRecords(studentId, twelveMonthsAgo);

  // 应用层聚合
  const monthMap = new Map<string, { lessonCount: number; totalDuration: number }>();
  for (const r of monthlyRecords) {
    const month = r.lessonDate.toISOString().slice(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { lessonCount: 0, totalDuration: 0 };
    existing.lessonCount += 1;
    existing.totalDuration += r.duration;
    monthMap.set(month, existing);
  }

  const monthlyStats = Array.from(monthMap.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, stats]) => ({ month, ...stats }));

  return {
    studentId: student.id,
    studentName: student.name,
    totalPackages: student.coursePackages.length,
    totalHours,
    usedHours,
    remainingHours: totalHours - usedHours,
    packages: student.coursePackages.map((p) => ({
      ...p,
      remainingHours: p.totalHours - p.usedHours,
    })),
    monthlyStats,
  };
};

// ==================== 按月份获取消课记录 ====================

export const getRecordsByMonth = async (
  userId: string,
  role: Role,
  profileId: string | null,
  year: number,
  month: number,
  studentId?: string,
) => {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const where: Prisma.LessonRecordWhereInput = {
    lessonDate: { gte: monthStart, lte: monthEnd },
    status: LessonStatus.NORMAL,
  };

  // 角色过滤
  let allowedStudentIds: string[] = [];
  if (role === Role.TEACHER) {
    where.teacherId = userId;
  } else {
    allowedStudentIds = await resolveParentAuthorizedStudentIds(profileId, undefined, {
      missingProfileMessage: '无权查看该学生的记录',
      forbiddenMessage: '无权查看该学生的记录',
    });
    where.studentId = { in: allowedStudentIds };
  }

  if (studentId) {
    if (role === Role.PARENT) {
      [studentId] = await resolveParentAuthorizedStudentIds(profileId, studentId, {
        missingProfileMessage: '无权查看该学生的记录',
        forbiddenMessage: '无权查看该学生的记录',
      });
    }
    where.studentId = studentId;
  }

  const records = await findLessonRecordsForCalendar(where);

  return records.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.name,
    studentAvatar: r.student.avatar,
    packageName: r.package?.name ?? null,
    className: r.class?.name ?? null,
    lessonDate: r.lessonDate,
    duration: r.duration,
    hoursUsed: r.hoursUsed,
    content: r.content,
    performance: r.performance,
    homeworkImages: r.homeworkImages,
    feeAmount: r.feeAmount,
    feeMethod: r.feeMethod,
    status: r.status,
  }));
};

// ==================== 按日期范围获取消课记录 ====================

export const getRecordsByRange = async (
  userId: string,
  role: Role,
  profileId: string | null,
  startDate: string,
  endDate: string,
  studentId?: string,
) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  const where: Prisma.LessonRecordWhereInput = {
    lessonDate: { gte: start, lte: end },
    status: LessonStatus.NORMAL,
  };

  // 角色过滤
  let allowedStudentIds: string[] = [];
  if (role === Role.TEACHER) {
    where.teacherId = userId;
  } else {
    allowedStudentIds = await resolveParentAuthorizedStudentIds(profileId, undefined, {
      missingProfileMessage: '无权查看该学生的记录',
      forbiddenMessage: '无权查看该学生的记录',
    });
    where.studentId = { in: allowedStudentIds };
  }

  if (studentId) {
    if (role === Role.PARENT) {
      [studentId] = await resolveParentAuthorizedStudentIds(profileId, studentId, {
        missingProfileMessage: '无权查看该学生的记录',
        forbiddenMessage: '无权查看该学生的记录',
      });
    }
    where.studentId = studentId;
  }

  const records = await findLessonRecordsForCalendar(where);

  return records.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    studentName: r.student.name,
    studentAvatar: r.student.avatar,
    packageName: r.package?.name ?? null,
    className: r.class?.name ?? null,
    lessonDate: r.lessonDate,
    duration: r.duration,
    hoursUsed: r.hoursUsed,
    content: r.content,
    performance: r.performance,
    status: r.status,
  }));
};
