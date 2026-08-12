import { Prisma, LeaveStatus, LessonStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, BusinessError } from '../utils/errors';
import { assertParentBoundToStudent, getBoundStudentIds } from '../utils/permission';
import {
  applyPackageHoursDelta,
  lockCoursePackageForUpdate,
  lockLessonRecordForUpdate,
  normalizeLessonHoursUsed,
} from '../utils/lesson-hours';
import type { CreateLeaveRequestInput, ApproveLeaveInput, LeaveListQuery } from './leave-request.validator';

const leaveListStudentArgs = Prisma.validator<Prisma.StudentDefaultArgs>()({
  select: {
    id: true,
    name: true,
    avatar: true,
    parents: {
      where: {
        bindStatus: 'BOUND',
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        profileId: true,
        profile: {
          select: { nickname: true },
        },
      },
    },
  },
});

const resolveLeaveRequestParentName = (
  parents: Array<{
    profileId: string | null;
    profile: { nickname: string | null } | null;
  }>,
  parentId: string | null,
) => {
  if (parentId) {
    const matchedParent = parents.find((parent) => parent.profileId === parentId);
    if (matchedParent?.profile?.nickname) {
      return matchedParent.profile.nickname;
    }
  }

  return parents[0]?.profile?.nickname ?? null;
};

// ==================== 创建请假 ====================

export const createLeaveRequest = async (profileId: string, input: CreateLeaveRequestInput) => {
  await assertParentBoundToStudent(profileId, input.studentId, {
    missingProfileMessage: '您无权为该学生请假',
    forbiddenMessage: '您无权为该学生请假',
  });

  const student = await prisma.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, name: true, teacherId: true },
  });

  if (!student) {
    throw new NotFoundError('学生不存在');
  }

  const leaveRequest = await prisma.leaveRequest.create({
    data: {
      studentId: input.studentId,
      parentId: profileId,
      teacherId: student.teacherId,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      reason: input.reason,
      status: LeaveStatus.PENDING,
    },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  // 向教师发送通知
  const teacher = await prisma.teacher.findUnique({
    where: { id: student.teacherId },
    include: { profile: { select: { id: true } } },
  });

  if (teacher?.profile?.id) {
    await prisma.notification.create({
      data: {
        senderId: profileId,
        receiverId: teacher.profile.id,
        type: 'LEAVE',
        title: '新的请假申请',
        content: `${leaveRequest.student.name}的家长提交了请假申请（${input.startDate} 至 ${input.endDate}），原因：${input.reason}`,
      },
    });
  }

  return {
    id: leaveRequest.id,
    studentId: leaveRequest.studentId,
    studentName: leaveRequest.student.name,
    startDate: input.startDate,
    endDate: input.endDate,
    reason: leaveRequest.reason,
    status: leaveRequest.status,
    createdAt: leaveRequest.createdAt,
  };
};

// ==================== 请假列表 ====================

export const listLeaveRequests = async (
  userId: string,
  role: string,
  profileId: string | undefined,
  query: LeaveListQuery,
) => {
  const { page, pageSize, status, studentId } = query;

  const where: Prisma.LeaveRequestWhereInput = {};

  if (status) where.status = status;

  if (role === 'TEACHER') {
    // 教师查看自己学生的请假，同时兼容历史未回填 teacherId 的记录
    where.OR = studentId
      ? [
          { teacherId: userId, studentId },
          { teacherId: null, studentId, student: { teacherId: userId } },
        ]
      : [
          { teacherId: userId },
          { teacherId: null, student: { teacherId: userId } },
        ];
  } else if (role === 'PARENT') {
    if (!profileId) {
      return {
        list: [],
        pagination: { page, pageSize, total: 0, totalPages: 0 },
      };
    }

    const studentIds = await getBoundStudentIds(profileId);

    if (studentId && !studentIds.includes(studentId)) {
      throw new ForbiddenError('无权查看该学生的请假记录');
    }

    const parentStudentFilter = studentId
      ? { studentId }
      : { studentId: { in: studentIds } };

    where.OR = [
      { parentId: profileId, ...parentStudentFilter },
      {
        parentId: null,
        ...parentStudentFilter,
      },
    ];
  }

  if (role !== 'PARENT' && role !== 'TEACHER' && studentId) {
    where.studentId = studentId;
  }

  const [leaveRequests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        student: {
          select: leaveListStudentArgs.select,
        },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  const list = leaveRequests.map((lr) => ({
    id: lr.id,
    studentId: lr.studentId,
    studentName: lr.student.name,
    studentAvatar: lr.student.avatar,
    startDate: lr.startDate.toISOString().slice(0, 10),
    endDate: lr.endDate.toISOString().slice(0, 10),
    reason: lr.reason,
    status: lr.status,
    parentName: resolveLeaveRequestParentName(lr.student.parents, lr.parentId),
    createdAt: lr.createdAt,
  }));

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 审批请假 ====================

export const approveLeaveRequest = async (teacherId: string, leaveId: string, input: ApproveLeaveInput) => {
  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: { student: { select: { id: true, name: true, teacherId: true } } },
  });

  if (!leaveRequest) throw new NotFoundError('请假申请不存在');
  if ((leaveRequest.teacherId ?? leaveRequest.student.teacherId) !== teacherId) {
    throw new ForbiddenError('无权审批该请假');
  }
  if (leaveRequest.status !== LeaveStatus.PENDING) throw new BusinessError('该请假申请已处理', 422);

  let affectedLessons = 0;

  if (input.status === 'APPROVED') {
    // 事务：更新请假状态 + 取消消课 + 回滚课时
    const result = await prisma.$transaction(async (tx) => {
      const leaveUpdateResult = await tx.leaveRequest.updateMany({
        where: {
          id: leaveId,
          status: LeaveStatus.PENDING,
        },
        data: { status: LeaveStatus.APPROVED },
      });

      if (leaveUpdateResult.count !== 1) {
        throw new BusinessError('该请假申请已处理', 422);
      }

      // 查找请假时间段内的 NORMAL 消课记录
      const lessons = await tx.lessonRecord.findMany({
        where: {
          studentId: leaveRequest.studentId,
          status: LessonStatus.NORMAL,
          lessonDate: {
            gte: leaveRequest.startDate,
            lte: new Date(leaveRequest.endDate.getTime() + 86400000 - 1), // 当天 23:59:59
          },
        },
      });

      let affectedCount = 0;

      // 逐条加锁取消消课 + 回滚课时，避免并发下重复回滚
      for (const lesson of lessons) {
        const lockedLesson = await lockLessonRecordForUpdate(tx, lesson.id);
        if (!lockedLesson || lockedLesson.status !== LessonStatus.NORMAL) {
          continue;
        }

        // 先回滚课时，再修改记录状态，保证套餐与记录状态一致
        if (lockedLesson.packageId) {
          const pkg = await lockCoursePackageForUpdate(tx, lockedLesson.packageId);
          if (pkg) {
            const hoursUsed = normalizeLessonHoursUsed(lockedLesson);
            const { newUsedHours, newStatus: pkgNewStatus } = applyPackageHoursDelta(pkg, -hoursUsed);
            await tx.coursePackage.update({
              where: { id: lockedLesson.packageId },
              data: { usedHours: newUsedHours, status: pkgNewStatus },
            });
          }
        }

        await tx.lessonRecord.update({
          where: { id: lockedLesson.id },
          data: { status: LessonStatus.CANCELLED },
        });
        affectedCount += 1;
      }

      return affectedCount;
    });

    affectedLessons = result;
  } else {
    // REJECTED
    const rejectResult = await prisma.leaveRequest.updateMany({
      where: {
        id: leaveId,
        status: LeaveStatus.PENDING,
      },
      data: { status: LeaveStatus.REJECTED },
    });

    if (rejectResult.count !== 1) {
      throw new BusinessError('该请假申请已处理', 422);
    }
  }

  // 向家长发送审批结果通知
  let parentProfileId = leaveRequest.parentId;

  if (!parentProfileId) {
    const parentBinding = await prisma.studentParent.findFirst({
      where: {
        studentId: leaveRequest.studentId,
        bindStatus: 'BOUND',
      },
      include: { profile: { select: { id: true } } },
    });
    parentProfileId = parentBinding?.profile?.id ?? null;
  }

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { profile: { select: { id: true } } },
  });

  if (parentProfileId && teacher?.profile?.id) {
    const statusText = input.status === 'APPROVED' ? '已批准' : '已拒绝';
    await prisma.notification.create({
      data: {
        senderId: teacher.profile.id,
        receiverId: parentProfileId,
        type: 'LEAVE',
        title: '请假审批结果',
        content: `您为${leaveRequest.student.name}提交的请假申请（${leaveRequest.startDate.toISOString().slice(0, 10)} 至 ${leaveRequest.endDate.toISOString().slice(0, 10)}）${statusText}`,
      },
    });
  }

  return {
    id: leaveId,
    status: input.status,
    affectedLessons,
  };
};
