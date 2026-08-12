import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { RechargeListQuery, CreateRechargeInput } from './recharge.validator';

const toRechargeResponse = <
  T extends { amount: number }
>(recharge: T) => {
  const { amount, ...rest } = recharge;
  return {
    ...rest,
    hours: amount,
  };
};

// 课时充值记录列表
export const listRecharges = async (userId: string, role: Role, query: RechargeListQuery) => {
  const { page, pageSize, packageId, method, startDate, endDate } = query;

  const where: Prisma.RechargeWhereInput = {};
  // 数据隔离：教师只能看到自己课包的充值记录
  if (role === Role.TEACHER) {
    where.package = { teacherId: userId };
  }
  if (packageId) where.packageId = packageId;
  if (method) where.method = method;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
  }

  const [list, total] = await Promise.all([
    prisma.recharge.findMany({
      where,
      include: {
        package: {
          select: { id: true, name: true, studentId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recharge.count({ where }),
  ]);

  return {
    list: list.map(toRechargeResponse),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 某课包的课时充值记录
export const listRechargesByPackage = async (packageId: string, userId: string, role: Role) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('课包不存在');
  // 数据隔离：教师只能查看自己课包的充值记录
  if (role === Role.TEACHER && pkg.teacherId !== userId) {
    throw new ForbiddenError('无权查看该课包充值记录');
  }

  const list = await prisma.recharge.findMany({
    where: { packageId },
    orderBy: { createdAt: 'desc' },
  });

  return list.map(toRechargeResponse);
};

// 创建课时充值记录
export const createRecharge = async (userId: string, role: Role, input: CreateRechargeInput) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: input.packageId } });
  if (!pkg) throw new NotFoundError('课包不存在');
  // 数据隔离：教师只能给自己的课包充值
  if (role === Role.TEACHER && pkg.teacherId !== userId) {
    throw new ForbiddenError('无权操作该课包');
  }

  // 使用事务：创建充值记录 + 增加课包剩余课时
  const recharge = await prisma.$transaction(async (tx) => {
    const r = await tx.recharge.create({
      data: {
        packageId: input.packageId,
        amount: input.hours,
        method: input.method,
      },
    });

    // 增加课包总课时
    await tx.coursePackage.update({
      where: { id: input.packageId },
      data: {
        totalHours: { increment: input.hours },
      },
    });

    return r;
  });

  return toRechargeResponse(recharge);
};

// 课时充值方式统计
export const getRechargeStats = async (userId: string, role: Role) => {
  const where: Prisma.RechargeWhereInput = {};
  if (role === Role.TEACHER) {
    where.package = { teacherId: userId };
  }
  const stats = await prisma.recharge.groupBy({
    by: ['method'],
    _count: { id: true },
    _sum: { amount: true },
    where,
  });

  return stats.map((s) => ({
    method: s.method || '未指定',
    count: s._count.id,
    totalHours: s._sum.amount || 0,
  }));
};
