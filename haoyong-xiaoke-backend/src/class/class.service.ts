import { Prisma, ClassStatus, LessonStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ConflictError, BusinessError } from '../utils/errors';
import { assertTeacherOwnsClass, assertTeacherOwnsStudent } from '../utils/permission';
import {
  applyPackageHoursDelta,
  calculateHoursUsed,
  lockCoursePackageForUpdate,
} from '../utils/lesson-hours';
import type { CreateClassInput, UpdateClassInput, ClassListQuery, AddStudentInput, CheckinInput } from './class.validator';

// ==================== 权限校验 ====================

const classDetailArgs = Prisma.validator<Prisma.ClassDefaultArgs>()({
  include: {
    teacher: { include: { profile: { select: { nickname: true } } } },
    students: {
      include: {
        student: { select: { id: true, name: true, avatar: true, gender: true } },
      },
      orderBy: { joinedAt: 'desc' },
    },
    schedules: {
      orderBy: { dayOfWeek: 'asc' },
    },
    lessonRecords: {
      take: 5,
      orderBy: { lessonDate: 'desc' },
      select: { id: true, lessonDate: true, duration: true },
    },
  },
});

type ClassDetailPayload = Prisma.ClassGetPayload<typeof classDetailArgs>;

// ==================== 班级列表 ====================

export const listClasses = async (teacherId: string, query: ClassListQuery) => {
  const { page, pageSize, status, keyword } = query;

  const where: Prisma.ClassWhereInput = { teacherId };

  if (status) where.status = status;
  if (keyword) where.name = { contains: keyword };

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { students: true, schedules: true } },
      },
    }),
    prisma.class.count({ where }),
  ]);

  const list = classes.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject,
    grade: c.grade,
    schedule: c.schedule,
    location: c.location,
    status: c.status,
    studentCount: c._count.students,
    scheduleCount: c._count.schedules,
    createdAt: c.createdAt,
  }));

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 班级详情 ====================

export const getClassDetail = async (classId: string, teacherId: string) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const cls = await prisma.class.findUnique({ where: { id: classId }, ...classDetailArgs });

  if (!cls) throw new NotFoundError('班级不存在');

  const typedClass: ClassDetailPayload = cls;

  return {
    id: typedClass.id,
    name: typedClass.name,
    subject: typedClass.subject,
    grade: typedClass.grade,
    schedule: typedClass.schedule,
    location: typedClass.location,
    status: typedClass.status,
    teacher: typedClass.teacher
      ? { id: typedClass.teacher.id, nickname: typedClass.teacher.profile?.nickname }
      : null,
    students: typedClass.students.map((cs) => ({
      id: cs.student.id,
      name: cs.student.name,
      avatar: cs.student.avatar,
      gender: cs.student.gender,
      joinedAt: cs.joinedAt,
    })),
    schedules: typedClass.schedules,
    recentLessons: typedClass.lessonRecords,
    createdAt: typedClass.createdAt,
  };
};

// ==================== 创建班级 ====================

export const createClass = async (teacherId: string, input: CreateClassInput) => {
  const data: Prisma.ClassCreateInput = {
    name: input.name,
    subject: input.subject ?? null,
    grade: input.grade ?? null,
    schedule: input.schedule ?? null,
    location: input.location ?? null,
    teacher: { connect: { id: teacherId } },
  };

  return prisma.class.create({ data });
};

// ==================== 更新班级 ====================

export const updateClass = async (classId: string, teacherId: string, input: UpdateClassInput) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const data: Prisma.ClassUpdateInput = {
    name: input.name,
    subject: input.subject ?? null,
    grade: input.grade ?? null,
    schedule: input.schedule ?? null,
    location: input.location ?? null,
  };

  return prisma.class.update({ where: { id: classId }, data });
};

// ==================== 删除班级（软删除） ====================

export const deleteClass = async (classId: string, teacherId: string) => {
  await assertTeacherOwnsClass(classId, teacherId);

  await prisma.class.update({
    where: { id: classId },
    data: { status: ClassStatus.DISBANDED },
  });
};

// ==================== 班级学生列表 ====================

export const listClassStudents = async (classId: string, teacherId: string) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const classStudents = await prisma.classStudent.findMany({
    where: { classId },
    include: {
      student: { select: { id: true, name: true, avatar: true, gender: true, phone: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return classStudents.map((cs) => ({
    id: cs.student.id,
    name: cs.student.name,
    avatar: cs.student.avatar,
    gender: cs.student.gender,
    phone: cs.student.phone,
    joinedAt: cs.joinedAt,
  }));
};

// ==================== 添加学生到班级 ====================

export const addStudentToClass = async (classId: string, teacherId: string, input: AddStudentInput) => {
  await assertTeacherOwnsClass(classId, teacherId);

  // 验证学生归属
  await assertTeacherOwnsStudent(input.studentId, teacherId);

  // 检查是否已在班级中
  const existing = await prisma.classStudent.findUnique({
    where: { classId_studentId: { classId, studentId: input.studentId } },
  });
  if (existing) throw new ConflictError('该学生已在班级中');

  await prisma.classStudent.create({
    data: { classId, studentId: input.studentId },
  });
};

// ==================== 移除班级学生 ====================

export const removeStudentFromClass = async (classId: string, studentId: string, teacherId: string) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const classStudent = await prisma.classStudent.findUnique({
    where: { classId_studentId: { classId, studentId } },
  });
  if (!classStudent) throw new NotFoundError('该学生不在此班级中');

  await prisma.classStudent.delete({
    where: { id: classStudent.id },
  });
};

// 计算排课时长（分钟）
const calcScheduleDuration = (startTime: string, endTime: string): number => {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  return (endHour * 60 + endMin) - (startHour * 60 + startMin);
};

// ==================== 班级签到 ====================

export const checkin = async (classId: string, teacherId: string, input: CheckinInput) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const results: Array<{
    studentId: string;
    studentName: string;
    recordId: string | null;
    status: 'success' | 'failed';
    reason?: string;
  }> = [];

  let createdCount = 0;
  let failedCount = 0;

  // 获取班级中的学生 ID 集合
  const classStudents = await prisma.classStudent.findMany({
    where: { classId },
    select: { studentId: true },
  });
  const classStudentIds = new Set(classStudents.map((cs) => cs.studentId));

  const lessonDate = new Date(input.date);
  const dayOfWeek = lessonDate.getDay();

  // 按签到日期匹配班级排课，避免固定取第一条排课导致课时口径漂移
  const classSchedules = await prisma.schedule.findMany({
    where: { classId, dayOfWeek },
    select: { startTime: true, endTime: true },
  });
  const scheduleDurations = classSchedules
    .map((schedule) => calcScheduleDuration(schedule.startTime, schedule.endTime))
    .filter((duration) => duration > 0);
  const uniqueDurations = [...new Set(scheduleDurations)];

  if (uniqueDurations.length === 0) {
    throw new BusinessError('签到日期未配置有效排课，无法签到', 422);
  }

  if (uniqueDurations.length > 1) {
    throw new BusinessError('签到日期存在多个不同时长的排课，无法自动确定课时', 422);
  }

  const defaultDuration = uniqueDurations[0];

  // 逐个处理学生
  for (const studentId of input.studentIds) {
    // 验证学生归属
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student || student.teacherId !== teacherId) {
      results.push({ studentId, studentName: student?.name ?? '', recordId: null, status: 'failed', reason: '学生不存在或不属于当前教师' });
      failedCount++;
      continue;
    }

    // 验证学生在班级中
    if (!classStudentIds.has(studentId)) {
      results.push({ studentId, studentName: student.name, recordId: null, status: 'failed', reason: '学生不在此班级中' });
      failedCount++;
      continue;
    }

    // 使用事务处理每个学生的签到
    try {
      const record = await prisma.$transaction(async (tx) => {
        const duration = defaultDuration;
        const hoursUsed = calculateHoursUsed(duration);

        // 若指定 packageId，扣减课时（每个学生使用自己的套餐）
        let usedPackageId = input.packageId;
        if (usedPackageId) {
          const pkg = await lockCoursePackageForUpdate(tx, usedPackageId);
          if (!pkg) throw new BusinessError('课时套餐不存在');
          if (pkg.studentId !== studentId) throw new BusinessError('该套餐不属于此学生');
          if (pkg.status !== 'ACTIVE') throw new BusinessError('该套餐已失效');

          const { newUsedHours, newStatus } = applyPackageHoursDelta(pkg, hoursUsed);
          await tx.coursePackage.update({
            where: { id: usedPackageId },
            data: { usedHours: newUsedHours, status: newStatus },
          });
        }

        // 创建消课记录（duration 从排课计算）
        const data: Prisma.LessonRecordCreateInput = {
          teacherId,
          student: { connect: { id: studentId } },
          class: { connect: { id: classId } },
          lessonDate,
          duration,
          hoursUsed,
          content: input.content ?? null,
          homework: input.homework ?? null,
          status: LessonStatus.NORMAL,
        };

        if (usedPackageId) {
          data.package = { connect: { id: usedPackageId } };
        }

        return tx.lessonRecord.create({ data });
      });

      results.push({ studentId, studentName: student.name, recordId: record.id, status: 'success' });
      createdCount++;
    } catch (error: unknown) {
      results.push({
        studentId,
        studentName: student.name,
        recordId: null,
        status: 'failed',
        reason: error instanceof Error ? error.message : '未知错误',
      });
      failedCount++;
    }
  }

  return { createdCount, failedCount, records: results };
};

// ==================== 转班（事务） ====================

export const transferClass = async (
  classId: string,
  teacherId: string,
  input: { studentId: string; targetClassId: string },
) => {
  await assertTeacherOwnsClass(classId, teacherId);
  await assertTeacherOwnsClass(input.targetClassId, teacherId);

  // 验证学生在原班级
  const classStudent = await prisma.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId,
        studentId: input.studentId,
      },
    },
  });

  if (!classStudent) throw new NotFoundError('学生不在此班级中');

  // 检查是否已在目标班级
  const existing = await prisma.classStudent.findUnique({
    where: {
      classId_studentId: {
        classId: input.targetClassId,
        studentId: input.studentId,
      },
    },
  });

  if (existing) throw new ConflictError('学生已在目标班级中');

  // 事务：从原班级移除，加入新班级
  return prisma.$transaction(async (tx) => {
    await tx.classStudent.delete({
      where: {
        classId_studentId: {
          classId,
          studentId: input.studentId,
        },
      },
    });

    return tx.classStudent.create({
      data: {
        classId: input.targetClassId,
        studentId: input.studentId,
      },
    });
  });
};

// ==================== 结束班级 ====================

export const endClass = async (classId: string, teacherId: string) => {
  await assertTeacherOwnsClass(classId, teacherId);

  const cls = await prisma.class.findUnique({ where: { id: classId } });
  if (!cls) throw new NotFoundError('班级不存在');
  if (cls.status === ClassStatus.DISBANDED) {
    throw new BusinessError('班级已结束', 422);
  }

  return prisma.class.update({
    where: { id: classId },
    data: { status: ClassStatus.DISBANDED },
  });
};
