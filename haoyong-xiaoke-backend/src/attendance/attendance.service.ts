import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError } from '../utils/errors';
import type {
  CreateAttendanceInput,
  UpdateAttendanceInput,
  AttendanceListQuery,
  AttendanceStatsQuery,
  CreateSalaryTemplateInput,
  UpdateSalaryTemplateInput,
  SalaryTemplateListQuery,
  CreateTemporaryRescheduleInput,
  BatchRescheduleInput,
  TemporaryRescheduleListQuery,
} from './attendance.validator';

// ==================== Attendance (考勤) ====================

// 考勤列表
export const listAttendances = async (query: AttendanceListQuery) => {
  const { page, pageSize, teacherId, dateFrom, dateTo, status } = query;

  const where: Prisma.AttendanceWhereInput = {};
  if (teacherId) where.teacherId = teacherId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const [list, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        teacher: {
          include: { profile: { select: { name: true } } },
        },
      },
      orderBy: { date: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.attendance.count({ where }),
  ]);

  return {
    list: list.map((a) => ({
      id: a.id,
      teacherId: a.teacherId,
      teacherName: a.teacher.profile?.name || '未知',
      date: a.date,
      status: a.status,
      checkInTime: a.checkInTime,
      checkOutTime: a.checkOutTime,
      remark: a.remark,
      createdAt: a.createdAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 记录考勤
export const createAttendance = async (input: CreateAttendanceInput, teacherId: string) => {
  const date = new Date(input.date);

  // 检查是否已记录
  const existing = await prisma.attendance.findUnique({
    where: { teacherId_date: { teacherId, date } },
  });

  if (existing) {
    throw new BusinessError('当日已记录考勤', 422);
  }

  const attendance = await prisma.attendance.create({
    data: {
      teacherId,
      date,
      status: input.status,
      checkInTime: input.checkInTime ? new Date(input.checkInTime) : undefined,
      checkOutTime: input.checkOutTime ? new Date(input.checkOutTime) : undefined,
      remark: input.remark,
    },
  });

  return attendance;
};

// 更新考勤
export const updateAttendance = async (id: string, input: UpdateAttendanceInput) => {
  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance) throw new NotFoundError('考勤记录不存在');

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      ...input,
      checkInTime: input.checkInTime ? new Date(input.checkInTime) : undefined,
      checkOutTime: input.checkOutTime ? new Date(input.checkOutTime) : undefined,
    },
  });

  return updated;
};

// 删除考勤
export const deleteAttendance = async (id: string) => {
  const attendance = await prisma.attendance.findUnique({ where: { id } });
  if (!attendance) throw new NotFoundError('考勤记录不存在');

  await prisma.attendance.delete({ where: { id } });
};

// 考勤统计
export const getAttendanceStats = async (query: AttendanceStatsQuery) => {
  const { teacherId, dateFrom, dateTo } = query;

  const where: Prisma.AttendanceWhereInput = {};
  if (teacherId) where.teacherId = teacherId;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const records = await prisma.attendance.findMany({
    where,
    select: { status: true },
  });

  const present = records.filter((r) => r.status === 'present').length;
  const late = records.filter((r) => r.status === 'late').length;
  const absent = records.filter((r) => r.status === 'absent').length;
  const leave = records.filter((r) => r.status === 'leave').length;

  return {
    total: records.length,
    present,
    late,
    absent,
    leave,
    attendanceRate: records.length > 0 ? ((present + late) / records.length * 100).toFixed(1) : '0',
  };
};

// ==================== SalaryTemplate (薪资模板) ====================

// 薪资模板列表
export const listSalaryTemplates = async (query: SalaryTemplateListQuery) => {
  const { page, pageSize, campusId, status } = query;

  const where: Prisma.SalaryTemplateWhereInput = {};
  if (campusId) where.campusId = campusId;
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.salaryTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.salaryTemplate.count({ where }),
  ]);

  return {
    list: list.map((t) => ({
      ...t,
      baseSalary: Number(t.baseSalary),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 创建薪资模板
export const createSalaryTemplate = async (input: CreateSalaryTemplateInput) => {
  const template = await prisma.salaryTemplate.create({
    data: {
      campusId: input.campusId,
      name: input.name,
      baseSalary: input.baseSalary,
      rules: input.rules,
    },
  });

  return { ...template, baseSalary: Number(template.baseSalary) };
};

// 更新薪资模板
export const updateSalaryTemplate = async (id: string, input: UpdateSalaryTemplateInput) => {
  const template = await prisma.salaryTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError('薪资模板不存在');

  const updated = await prisma.salaryTemplate.update({
    where: { id },
    data: input,
  });

  return { ...updated, baseSalary: Number(updated.baseSalary) };
};

// 删除薪资模板
export const deleteSalaryTemplate = async (id: string) => {
  const template = await prisma.salaryTemplate.findUnique({ where: { id } });
  if (!template) throw new NotFoundError('薪资模板不存在');

  await prisma.salaryTemplate.delete({ where: { id } });
};

// ==================== TemporaryReschedule (临时调课) ====================

// 临时调课列表
export const listTemporaryReschedules = async (query: TemporaryRescheduleListQuery) => {
  const { page, pageSize, status } = query;

  const where: Prisma.TemporaryRescheduleWhereInput = {};
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.temporaryReschedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.temporaryReschedule.count({ where }),
  ]);

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 创建临时调课
export const createTemporaryReschedule = async (input: CreateTemporaryRescheduleInput, createdBy: string) => {
  const reschedule = await prisma.temporaryReschedule.create({
    data: {
      scheduleId: input.scheduleId,
      originalDate: new Date(input.originalDate),
      originalTime: input.originalTime,
      targetDate: new Date(input.targetDate),
      targetTime: input.targetTime,
      reason: input.reason,
      createdBy,
    },
  });

  return reschedule;
};

// 审批临时调课
export const approveTemporaryReschedule = async (id: string, approvedBy: string) => {
  const reschedule = await prisma.temporaryReschedule.findUnique({ where: { id } });
  if (!reschedule) throw new NotFoundError('调课记录不存在');

  if (reschedule.status !== 'pending') {
    throw new BusinessError('只能审批待处理的调课', 422);
  }

  const updated = await prisma.temporaryReschedule.update({
    where: { id },
    data: {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    },
  });

  return updated;
};

// 拒绝临时调课
export const rejectTemporaryReschedule = async (id: string, approvedBy: string) => {
  const reschedule = await prisma.temporaryReschedule.findUnique({ where: { id } });
  if (!reschedule) throw new NotFoundError('调课记录不存在');

  if (reschedule.status !== 'pending') {
    throw new BusinessError('只能审批待处理的调课', 422);
  }

  const updated = await prisma.temporaryReschedule.update({
    where: { id },
    data: {
      status: 'rejected',
      approvedBy,
      approvedAt: new Date(),
    },
  });

  return updated;
};

// 批量调课
export const createBatchReschedule = async (input: BatchRescheduleInput, createdBy: string) => {
  const batchNo = `BR${Date.now()}`;

  const batch = await prisma.batchReschedule.create({
    data: {
      batchNo,
      reason: input.reason,
      schedules: input.schedules,
      createdBy,
    },
  });

  // 同时创建各个调课记录
  for (const schedule of input.schedules) {
    await prisma.temporaryReschedule.create({
      data: {
        scheduleId: schedule.scheduleId,
        originalDate: new Date(schedule.originalDate),
        originalTime: schedule.originalTime,
        targetDate: new Date(schedule.targetDate),
        targetTime: schedule.targetTime,
        reason: input.reason,
        createdBy,
      },
    });
  }

  return batch;
};

// 批量确认调课
export const confirmBatchReschedule = async (batchNo: string, approvedBy: string) => {
  const batch = await prisma.batchReschedule.findUnique({
    where: { batchNo },
  });

  if (!batch) throw new NotFoundError('批量调课不存在');

  if (batch.status !== 'pending') {
    throw new BusinessError('只能确认待处理的批量调课', 422);
  }

  // 更新批量调课状态
  await prisma.batchReschedule.update({
    where: { batchNo },
    data: { status: 'approved', approvedBy },
  });

  // 更新相关调课记录
  const schedules = batch.schedules as Array<{scheduleId: string}>;
  await prisma.temporaryReschedule.updateMany({
    where: {
      scheduleId: { in: schedules.map((s) => s.scheduleId) },
      status: 'pending',
    },
    data: { status: 'approved', approvedBy, approvedAt: new Date() },
  });

  return batch;
};
