import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BadRequestError, ForbiddenError } from '../utils/errors';
import { fenToYuan, fenToYuanNumber, yuanToFen } from '../utils/currency';
import type {
  CreateInstallmentInput,
  UpdateInstallmentInput,
  PayInstallmentInput,
  InstallmentListQuery,
  DueSoonQuery,
} from './installment.validator';

// 创建分期计划（自动拆分为多期）
export const createInstallmentPlan = async (userId: string, role: Role, input: CreateInstallmentInput) => {
  const pkg = await prisma.coursePackage.findUnique({
    where: { id: input.packageId },
  });
  if (!pkg) throw new NotFoundError('课包不存在');
  // 数据隔离：教师只能给自己的课包创建分期
  if (role === Role.TEACHER && pkg.teacherId !== userId) {
    throw new ForbiddenError('无权操作该课包');
  }

  if (!pkg.feeAmount || pkg.feeAmount <= 0) {
    throw new BadRequestError('课包未设置费用金额，无法创建分期计划');
  }

  // 检查是否已有分期计划
  const existing = await prisma.installmentSchedule.count({
    where: { packageId: input.packageId },
  });
  if (existing > 0) {
    throw new BadRequestError('该课包已存在分期计划，请先删除后再创建');
  }

  const totalAmount = pkg.feeAmount;
  const { period, startDate, amountPerPeriod, intervalMonths } = input;

  // 内部统一按分拆分，确保总额守恒
  const manualAmountPerPeriod = yuanToFen(amountPerPeriod);
  const perPeriod = manualAmountPerPeriod ?? Math.floor(totalAmount / period);
  const lastPeriodAmount = totalAmount - perPeriod * (period - 1);

  const schedules: { period: number; amount: number; dueDate: Date }[] = [];
  const baseDate = new Date(startDate);

  for (let i = 0; i < period; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + i * intervalMonths);

    schedules.push({
      period: i + 1,
      amount: i === period - 1 ? lastPeriodAmount : perPeriod,
      dueDate,
    });
  }

  // 批量创建分期计划
  const result = await prisma.$transaction(
    schedules.map((s) =>
      prisma.installmentSchedule.create({
        data: {
          packageId: input.packageId,
          period: s.period,
          amount: s.amount,
          dueDate: s.dueDate,
        },
      }),
    ),
  );

  // 更新课包的分期标记
  await prisma.coursePackage.update({
    where: { id: input.packageId },
    data: {
      installmentEnabled: true,
      installmentPeriod: period,
    },
  });

  return result.map((r) => ({ ...r, amount: fenToYuanNumber(r.amount) }));
};

// 查询分期列表
export const listInstallments = async (userId: string, role: Role, query: InstallmentListQuery) => {
  const { page, pageSize, packageId, paid } = query;

  const where: Prisma.InstallmentScheduleWhereInput = {};
  // 数据隔离：教师只能看到自己课包的分期
  if (role === Role.TEACHER) {
    where.package = { teacherId: userId };
  }
  if (packageId) where.packageId = packageId;
  if (paid !== undefined) where.paid = paid;

  const [list, total] = await Promise.all([
    prisma.installmentSchedule.findMany({
      where,
      include: {
        package: {
          select: {
            id: true,
            name: true,
            studentId: true,
            student: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ dueDate: 'asc' }, { period: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.installmentSchedule.count({ where }),
  ]);

  return {
    list: list.map((r) => ({ ...r, amount: fenToYuanNumber(r.amount) })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 查询某课包的分期计划
export const listByPackage = async (packageId: string, userId: string, role: Role) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('课包不存在');
  // 数据隔离
  if (role === Role.TEACHER && pkg.teacherId !== userId) {
    throw new ForbiddenError('无权查看该课包分期');
  }

  const list = await prisma.installmentSchedule.findMany({
    where: { packageId },
    orderBy: { period: 'asc' },
  });

  // 汇总统计
  const totalAmountFen = list.reduce((sum, r) => sum + r.amount, 0);
  const paidAmountFen = list.filter((r) => r.paid).reduce((sum, r) => sum + r.amount, 0);
  const paidCount = list.filter((r) => r.paid).length;

  return {
    list: list.map((r) => ({ ...r, amount: fenToYuanNumber(r.amount) })),
    summary: {
      totalPeriods: list.length,
      paidPeriods: paidCount,
      unpaidPeriods: list.length - paidCount,
      totalAmount: fenToYuanNumber(totalAmountFen),
      paidAmount: fenToYuanNumber(paidAmountFen),
      unpaidAmount: fenToYuanNumber(totalAmountFen - paidAmountFen),
    },
  };
};

// 更新单期信息
export const updateInstallment = async (id: string, userId: string, role: Role, input: UpdateInstallmentInput) => {
  const schedule = await prisma.installmentSchedule.findUnique({
    where: { id },
    include: { package: { select: { teacherId: true } } },
  });
  if (!schedule) throw new NotFoundError('分期记录不存在');
  // 数据隔离
  if (role === Role.TEACHER && schedule.package.teacherId !== userId) {
    throw new ForbiddenError('无权操作该分期记录');
  }

  if (schedule.paid) {
    throw new BadRequestError('已付款的分期不可修改');
  }

  const data: Prisma.InstallmentScheduleUpdateInput = {};
  if (input.amount !== undefined) data.amount = yuanToFen(input.amount) ?? 0;
  if (input.dueDate !== undefined) data.dueDate = new Date(input.dueDate);
  if (input.reminder !== undefined) data.reminder = input.reminder;

  const result = await prisma.installmentSchedule.update({
    where: { id },
    data,
  });

  return { ...result, amount: fenToYuanNumber(result.amount) };
};

// 确认收款（记账）
export const payInstallment = async (id: string, userId: string, role: Role, input: PayInstallmentInput) => {
  const schedule = await prisma.installmentSchedule.findUnique({
    where: { id },
    include: { package: { select: { teacherId: true } } },
  });
  if (!schedule) throw new NotFoundError('分期记录不存在');
  // 数据隔离
  if (role === Role.TEACHER && schedule.package.teacherId !== userId) {
    throw new ForbiddenError('无权操作该分期记录');
  }

  if (schedule.paid) {
    throw new BadRequestError('该期已收款，请勿重复操作');
  }

  const result = await prisma.installmentSchedule.update({
    where: { id },
    data: {
      paid: true,
    },
  });

  return { ...result, amount: fenToYuanNumber(result.amount), paidAt: input.paidAt || new Date().toISOString().slice(0, 10) };
};

// 取消收款标记
export const unpayInstallment = async (id: string, userId: string, role: Role) => {
  const schedule = await prisma.installmentSchedule.findUnique({
    where: { id },
    include: { package: { select: { teacherId: true } } },
  });
  if (!schedule) throw new NotFoundError('分期记录不存在');
  // 数据隔离
  if (role === Role.TEACHER && schedule.package.teacherId !== userId) {
    throw new ForbiddenError('无权操作该分期记录');
  }

  if (!schedule.paid) {
    throw new BadRequestError('该期未收款，无需取消');
  }

  const result = await prisma.installmentSchedule.update({
    where: { id },
    data: { paid: false },
  });

  return { ...result, amount: fenToYuanNumber(result.amount) };
};

// 查询即将到期的分期
export const listDueSoon = async (userId: string, role: Role, query: DueSoonQuery) => {
  const { days, paid } = query;

  const now = new Date();
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + days);

  const where: Prisma.InstallmentScheduleWhereInput = {
    dueDate: { lte: deadline },
  };
  // 数据隔离：教师只能看到自己课包的分期
  if (role === Role.TEACHER) {
    where.package = { teacherId: userId };
  }
  // 默认只查未付款的
  if (paid !== undefined) {
    where.paid = paid;
  } else {
    where.paid = false;
  }

  const list = await prisma.installmentSchedule.findMany({
    where,
    include: {
      package: {
        select: {
          id: true,
          name: true,
          student: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  return list.map((r) => ({
    ...r,
    amount: fenToYuanNumber(r.amount),
    isOverdue: new Date(r.dueDate) < now && !r.paid,
  }));
};

// 删除分期计划（删除某课包下所有分期）
export const deleteByPackage = async (packageId: string, userId: string, role: Role) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('课包不存在');
  // 数据隔离
  if (role === Role.TEACHER && pkg.teacherId !== userId) {
    throw new ForbiddenError('无权操作该课包');
  }

  const result = await prisma.installmentSchedule.deleteMany({
    where: { packageId },
  });

  // 更新课包分期标记
  await prisma.coursePackage.update({
    where: { id: packageId },
    data: { installmentEnabled: false, installmentPeriod: null },
  });

  return { deletedCount: result.count };
};

// 删除单期
export const deleteInstallment = async (id: string, userId: string, role: Role) => {
  const schedule = await prisma.installmentSchedule.findUnique({
    where: { id },
    include: { package: { select: { teacherId: true } } },
  });
  if (!schedule) throw new NotFoundError('分期记录不存在');
  // 数据隔离
  if (role === Role.TEACHER && schedule.package.teacherId !== userId) {
    throw new ForbiddenError('无权操作该分期记录');
  }

  if (schedule.paid) {
    throw new BadRequestError('已收款的分期不可删除');
  }

  await prisma.installmentSchedule.delete({ where: { id } });
  return { id };
};
