import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError, ConflictError } from '../utils/errors';
import { fenToYuanNumber, yuanToFen } from '../utils/currency';
import type {
  CreateTeacherInput,
  UpdateTeacherInput,
  TeacherListQuery,
  ResignInput,
  BatchConfirmInput,
  ExecutePayInput,
  AddDeductionInput,
  CreateSalaryModelInput,
  UpdateSalaryModelInput,
  SalarySettingsInput,
  CreateSalaryRecordInput,
} from './teacher.validator';

const ROLE_TEXT_MAP: Record<string, string> = {
  lead: '主讲',
  assist: '助教',
  parttime: '兼职',
};

// ==================== 教师列表 ====================

export const listTeachers = async (query: TeacherListQuery) => {
  const { page, pageSize, role, subject, status, keyword } = query;

  const where: Prisma.TeacherWhereInput = {};

  if (role) where.role = role;
  if (subject) where.subject = { contains: subject };
  if (status) where.status = status;
  if (keyword) {
    where.profile = {
      OR: [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
        { nickname: { contains: keyword } },
      ],
    };
  }

  const [teachers, total] = await Promise.all([
    prisma.teacher.findMany({
      where,
      include: {
        profile: { select: { id: true, name: true, nickname: true, phone: true, avatar: true } },
        salaryModel: { select: { id: true, name: true, base: true, rate: true, attend: true, perf: true } },
        _count: {
          select: {
            students: { where: { status: 'ACTIVE' } },
            classes: { where: { status: 'ACTIVE' } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.teacher.count({ where }),
  ]);

  // 批量获取本月消课时长（避免 N+1）
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const teacherIds = teachers.map((t) => t.id);

  const lessonStats = await prisma.lessonRecord.groupBy({
    by: ['teacherId'],
    where: {
      teacherId: { in: teacherIds },
      status: 'NORMAL',
      lessonDate: { gte: monthStart, lte: monthEnd },
    },
    _sum: { duration: true },
    _count: { id: true },
  });

  const lessonStatsMap = new Map(lessonStats.map((s) => [s.teacherId, s]));

  const list = teachers.map((t) => {
    const stats = lessonStatsMap.get(t.id);
    const name = t.profile.name || t.profile.nickname || '未命名';
    return {
      id: t.id,
      name,
      phone: t.profile.phone ?? '',
      avatar: t.profile.avatar,
      role: t.role,
      roleText: ROLE_TEXT_MAP[t.role] ?? t.role,
      subject: t.subject ?? '',
      institution: t.institution ?? '',
      color: t.color,
      status: t.status,
      hours: stats?._sum.duration ?? 0,
      students: t._count.students,
      classes: t._count.classes,
      salaryModel: t.salaryModel
        ? {
            id: t.salaryModel.id,
            name: t.salaryModel.name,
            base: fenToYuanNumber(t.salaryModel.base),
            rate: fenToYuanNumber(t.salaryModel.rate),
            attend: fenToYuanNumber(t.salaryModel.attend),
            perf: fenToYuanNumber(t.salaryModel.perf),
          }
        : null,
      payRemark: t.payRemark,
      resignType: t.resignType,
      resignDate: t.resignDate?.toISOString().slice(0, 10) ?? null,
      resignReason: t.resignReason,
      createdAt: t.createdAt.toISOString().slice(0, 10),
    };
  });

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 教师详情 ====================

export const getTeacherDetail = async (teacherId: string) => {
  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: {
      profile: { select: { id: true, name: true, nickname: true, phone: true, avatar: true } },
      salaryModel: true,
      deductions: { orderBy: { createdAt: 'desc' }, take: 20 },
      salaryRecords: { orderBy: { month: 'desc' }, take: 12 },
    },
  });

  if (!teacher) throw new NotFoundError('教师不存在');

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [lessonStats, studentCount, classCount] = await Promise.all([
    prisma.lessonRecord.aggregate({
      where: {
        teacherId,
        status: 'NORMAL',
        lessonDate: { gte: monthStart, lte: monthEnd },
      },
      _sum: { duration: true },
      _count: { id: true },
    }),
    prisma.student.count({ where: { teacherId, status: 'ACTIVE' } }),
    prisma.class.count({ where: { teacherId, status: 'ACTIVE' } }),
  ]);

  return {
    id: teacher.id,
    name: teacher.profile.name || teacher.profile.nickname || '未命名',
    phone: teacher.profile.phone ?? '',
    avatar: teacher.profile.avatar,
    role: teacher.role,
    roleText: ROLE_TEXT_MAP[teacher.role] ?? teacher.role,
    subject: teacher.subject ?? '',
    institution: teacher.institution ?? '',
    color: teacher.color,
    status: teacher.status,
    inviteCode: teacher.inviteCode,
    hours: lessonStats._sum.duration ?? 0,
    lessonCount: lessonStats._count.id ?? 0,
    students: studentCount,
    classes: classCount,
    salaryModel: teacher.salaryModel
      ? {
          ...teacher.salaryModel,
          base: fenToYuanNumber(teacher.salaryModel.base),
          rate: fenToYuanNumber(teacher.salaryModel.rate),
          attend: fenToYuanNumber(teacher.salaryModel.attend),
          perf: fenToYuanNumber(teacher.salaryModel.perf),
        }
      : null,
    payRemark: teacher.payRemark,
    deductions: teacher.deductions.map((d) => ({
      ...d,
      amount: fenToYuanNumber(d.amount),
    })),
    payHistory: teacher.salaryRecords.map((r) => ({
      ...r,
      amount: fenToYuanNumber(r.amount),
      paidAt: r.paidAt?.toISOString().slice(0, 10) ?? null,
    })),
    resignType: teacher.resignType,
    resignDate: teacher.resignDate?.toISOString().slice(0, 10) ?? null,
    resignReason: teacher.resignReason,
    createdAt: teacher.createdAt.toISOString().slice(0, 10),
  };
};

// ==================== 创建教师 ====================

export const createTeacher = async (input: CreateTeacherInput) => {
  // 检查手机号是否已注册
  const existingProfile = await prisma.profile.findUnique({
    where: { phone: input.phone },
  });

  if (existingProfile) {
    throw new ConflictError('该手机号已注册');
  }

  // 若指定薪资模型，验证存在
  if (input.salaryModelId) {
    const model = await prisma.salaryModel.findUnique({ where: { id: input.salaryModelId } });
    if (!model) throw new NotFoundError('薪资模型不存在');
  }

  // 事务：创建 Profile + Teacher
  const result = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: {
        name: input.name,
        phone: input.phone,
        role: 'TEACHER',
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        profileId: profile.id,
        role: input.role,
        subject: input.subject,
        institution: input.institution,
        color: input.color ?? '#5EC8A8',
        salaryModelId: input.salaryModelId,
      },
      include: {
        profile: { select: { id: true, name: true, phone: true, avatar: true } },
      },
    });

    return teacher;
  });

  return {
    id: result.id,
    name: result.profile.name,
    phone: result.profile.phone,
    avatar: result.profile.avatar,
    role: result.role,
    roleText: ROLE_TEXT_MAP[result.role] ?? result.role,
    subject: result.subject,
    institution: result.institution,
    color: result.color,
    status: result.status,
    createdAt: result.createdAt.toISOString().slice(0, 10),
  };
};

// ==================== 更新教师 ====================

export const updateTeacher = async (teacherId: string, input: UpdateTeacherInput) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw new NotFoundError('教师不存在');

  // 若更新薪资模型，验证存在
  if (input.salaryModelId) {
    const model = await prisma.salaryModel.findUnique({ where: { id: input.salaryModelId } });
    if (!model) throw new NotFoundError('薪资模型不存在');
  }

  // 若更新姓名，同步到 Profile
  if (input.name) {
    await prisma.profile.update({
      where: { id: teacher.profileId },
      data: { name: input.name },
    });
  }

  const data: Prisma.TeacherUpdateInput = {};
  if (input.role !== undefined) data.role = input.role;
  if (input.subject !== undefined) data.subject = input.subject;
  if (input.institution !== undefined) data.institution = input.institution;
  if (input.color !== undefined) data.color = input.color;
  if (input.payRemark !== undefined) data.payRemark = input.payRemark;
  if (input.salaryModelId !== undefined) {
    data.salaryModel = input.salaryModelId
      ? { connect: { id: input.salaryModelId } }
      : { disconnect: true };
  }

  return prisma.teacher.update({
    where: { id: teacherId },
    data,
  });
};

// ==================== 教师离职 ====================

export const resignTeacher = async (teacherId: string, input: ResignInput) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw new NotFoundError('教师不存在');

  if (teacher.status === 'resigned') {
    throw new BusinessError('该教师已离职', 422);
  }

  return prisma.teacher.update({
    where: { id: teacherId },
    data: {
      status: 'resigned',
      resignType: input.resignType,
      resignDate: new Date(),
      resignReason: input.reason,
    },
  });
};

// ==================== 确认薪资（单条） ====================

export const confirmSalary = async (recordId: string) => {
  const record = await prisma.salaryRecord.findUnique({ where: { id: recordId } });
  if (!record) throw new NotFoundError('薪资记录不存在');

  if (record.status !== 'pending') {
    throw new BusinessError(`该记录状态为 ${record.status}，无法确认`, 422);
  }

  const updatedRecord = await prisma.salaryRecord.update({
    where: { id: recordId },
    data: { status: 'confirmed' },
  });

  return {
    ...updatedRecord,
    amount: fenToYuanNumber(updatedRecord.amount),
  };
};

// ==================== 批量确认薪资 ====================

export const batchConfirmSalary = async (input: BatchConfirmInput) => {
  const result = await prisma.salaryRecord.updateMany({
    where: {
      id: { in: input.ids },
      status: 'pending',
    },
    data: { status: 'confirmed' },
  });

  if (result.count === 0) {
    throw new BusinessError('没有可确认的记录（可能已确认或不存在）', 422);
  }

  return { confirmedCount: result.count };
};

// ==================== 发放薪资 ====================

export const executePay = async (input: ExecutePayInput) => {
  const now = new Date();

  const result = await prisma.salaryRecord.updateMany({
    where: {
      id: { in: input.ids },
      status: 'confirmed',
    },
    data: {
      status: 'paid',
      paidAt: now,
      remark: input.remark,
    },
  });

  if (result.count === 0) {
    throw new BusinessError('没有可发放的记录（需先确认薪资）', 422);
  }

  return { paidCount: result.count };
};

// ==================== 添加扣款/补发 ====================

export const addDeduction = async (teacherId: string, input: AddDeductionInput) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) throw new NotFoundError('教师不存在');

  const createdDeduction = await prisma.deduction.create({
    data: {
      teacherId,
      reason: input.reason,
      amount: yuanToFen(input.amount) ?? 0,
      type: input.type,
    },
  });

  return {
    ...createdDeduction,
    amount: fenToYuanNumber(createdDeduction.amount),
  };
};

// ==================== 薪资模型 CRUD ====================

export const listSalaryModels = async () => {
  const models = await prisma.salaryModel.findMany({
    include: {
      _count: { select: { teachers: true } },
    },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return models.map((m) => ({
    ...m,
    base: fenToYuanNumber(m.base),
    rate: fenToYuanNumber(m.rate),
    attend: fenToYuanNumber(m.attend),
    perf: fenToYuanNumber(m.perf),
    teacherCount: m._count.teachers,
  }));
};

export const createSalaryModel = async (input: CreateSalaryModelInput) => {
  // 若设为默认，先取消其他默认
  if (input.isDefault) {
    await prisma.salaryModel.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const createdModel = await prisma.salaryModel.create({
    data: {
      name: input.name,
      type: input.type,
      base: yuanToFen(input.base) ?? 0,
      rate: yuanToFen(input.rate) ?? 0,
      attend: yuanToFen(input.attend) ?? 0,
      perf: yuanToFen(input.perf) ?? 0,
      isDefault: input.isDefault,
    },
  });

  return {
    ...createdModel,
    base: fenToYuanNumber(createdModel.base),
    rate: fenToYuanNumber(createdModel.rate),
    attend: fenToYuanNumber(createdModel.attend),
    perf: fenToYuanNumber(createdModel.perf),
  };
};

export const updateSalaryModel = async (id: string, input: UpdateSalaryModelInput) => {
  const model = await prisma.salaryModel.findUnique({ where: { id } });
  if (!model) throw new NotFoundError('薪资模型不存在');

  // 若设为默认，先取消其他默认
  if (input.isDefault) {
    await prisma.salaryModel.updateMany({
      where: { isDefault: true, NOT: { id } },
      data: { isDefault: false },
    });
  }

  const data: Prisma.SalaryModelUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.type !== undefined) data.type = input.type;
  if (input.base !== undefined) data.base = yuanToFen(input.base) ?? 0;
  if (input.rate !== undefined) data.rate = yuanToFen(input.rate) ?? 0;
  if (input.attend !== undefined) data.attend = yuanToFen(input.attend) ?? 0;
  if (input.perf !== undefined) data.perf = yuanToFen(input.perf) ?? 0;
  if (input.isDefault !== undefined) data.isDefault = input.isDefault;

  const updatedModel = await prisma.salaryModel.update({ where: { id }, data });

  return {
    ...updatedModel,
    base: fenToYuanNumber(updatedModel.base),
    rate: fenToYuanNumber(updatedModel.rate),
    attend: fenToYuanNumber(updatedModel.attend),
    perf: fenToYuanNumber(updatedModel.perf),
  };
};

// ==================== 发薪设置 ====================

// 发薪设置使用单例记录（id 固定为 'default'）
export const getSalarySettings = async () => {
  // 发薪设置暂返回默认值（后续可扩展独立表）
  return {
    payDay: 10,
    pushDaysBefore: 3,
    autoConfirm: false,
    pushEnabled: true,
  };
};

export const updateSalarySettings = async (input: SalarySettingsInput) => {
  // 发薪设置暂存到 NotifySetting 表（后续可扩展独立表）
  // 这里简化处理，返回输入值
  return input;
};

// ==================== 创建薪资记录 ====================

export const createSalaryRecord = async (input: CreateSalaryRecordInput) => {
  const teacher = await prisma.teacher.findUnique({ where: { id: input.teacherId } });
  if (!teacher) throw new NotFoundError('教师不存在');

  // 检查该月是否已有记录（应用层检查 + 数据库唯一约束双重保障）
  const existing = await prisma.salaryRecord.findFirst({
    where: { teacherId: input.teacherId, month: input.month },
  });
  if (existing) {
    throw new ConflictError(`教师 ${input.month} 月薪资记录已存在`);
  }

  try {
    const createdRecord = await prisma.salaryRecord.create({
      data: {
        teacherId: input.teacherId,
        month: input.month,
        amount: yuanToFen(input.amount) ?? 0,
        remark: input.remark,
        status: 'pending',
      },
    });

    return {
      ...createdRecord,
      amount: fenToYuanNumber(createdRecord.amount),
    };
  } catch (error: unknown) {
    // 并发场景下唯一约束冲突
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictError(`教师 ${input.month} 月薪资记录已存在`);
    }
    throw error;
  }
};
