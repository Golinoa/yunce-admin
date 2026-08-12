import { Prisma, PackageStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, BusinessError } from '../utils/errors';
import { fenToYuanNumber, yuanToFen } from '../utils/currency';
import type { CreatePackageInput, UpdatePackageInput, PackageListQuery } from './course-package.validator';

// ==================== 套餐列表 ====================

export const listPackages = async (teacherId: string, query: PackageListQuery) => {
  const { page, pageSize, studentId, status } = query;

  const where: Prisma.CoursePackageWhereInput = { teacherId };

  if (studentId) where.studentId = studentId;
  if (status) where.status = status;

  const [packages, total] = await Promise.all([
    prisma.coursePackage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        student: { select: { id: true, name: true } },
      },
    }),
    prisma.coursePackage.count({ where }),
  ]);

  const list = packages.map((p) => ({
    id: p.id,
    studentId: p.studentId,
    studentName: p.student.name,
    name: p.name,
    totalHours: p.totalHours,
    usedHours: p.usedHours,
    remainingHours: p.totalHours - p.usedHours,
    validStart: p.validStart?.toISOString().slice(0, 10) ?? null,
    validEnd: p.validEnd?.toISOString().slice(0, 10) ?? null,
    status: p.status,
    createdAt: p.createdAt,
  }));

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 创建套餐 ====================

export const createPackage = async (teacherId: string, input: CreatePackageInput) => {
  // 验证学生归属
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError('学生不存在');
  if (student.teacherId !== teacherId) throw new ForbiddenError('无权操作该学生');

  const data: Prisma.CoursePackageCreateInput = {
    teacher: { connect: { id: teacherId } },
    student: { connect: { id: input.studentId } },
    name: input.name,
    totalHours: input.totalHours,
    usedHours: 0,
    feeAmount: yuanToFen(input.feeAmount) ?? undefined,
    feeMethod: input.feeMethod,
    validStart: input.validStart ? new Date(input.validStart) : undefined,
    validEnd: input.validEnd ? new Date(input.validEnd) : undefined,
    status: PackageStatus.ACTIVE,
  };

  const createdPackage = await prisma.coursePackage.create({ data });

  return {
    ...createdPackage,
    feeAmount: fenToYuanNumber(createdPackage.feeAmount),
  };
};

// ==================== 更新套餐 ====================

export const updatePackage = async (packageId: string, teacherId: string, input: UpdatePackageInput) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('套餐不存在');
  if (pkg.teacherId !== teacherId) throw new ForbiddenError('无权操作该套餐');

  const data: Prisma.CoursePackageUpdateInput = {};

  if (input.name !== undefined) data.name = input.name;
  if (input.totalHours !== undefined) data.totalHours = input.totalHours;
  if (input.validEnd !== undefined) data.validEnd = new Date(input.validEnd);

  return prisma.coursePackage.update({ where: { id: packageId }, data });
};

// ==================== 删除套餐 ====================

export const deletePackage = async (packageId: string, teacherId: string) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('套餐不存在');
  if (pkg.teacherId !== teacherId) throw new ForbiddenError('无权操作该套餐');

  if (pkg.usedHours > 0) {
    throw new BusinessError('该套餐已有消课记录，无法删除', 422);
  }

  await prisma.coursePackage.delete({ where: { id: packageId } });
};

// ==================== 扣减课时（事务） ====================

export const deductHours = async (packageId: string, hours: number, teacherId: string) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('套餐不存在');
  if (pkg.teacherId !== teacherId) throw new ForbiddenError('无权操作该套餐');

  const remaining = pkg.totalHours - pkg.usedHours;
  if (remaining < hours) {
    throw new BusinessError(`课时不足，剩余 ${remaining} 课时`, 422);
  }

  // 事务扣减
  return prisma.$transaction(async (tx) => {
    const updated = await tx.coursePackage.update({
      where: { id: packageId },
      data: { usedHours: { increment: hours } },
    });

    // 课时用完自动更新状态
    if (updated.totalHours - updated.usedHours === 0) {
      await tx.coursePackage.update({
        where: { id: packageId },
        data: { status: PackageStatus.DEPLETED },
      });
    }

    return {
      id: updated.id,
      totalHours: updated.totalHours,
      usedHours: updated.usedHours,
      remainingHours: updated.totalHours - updated.usedHours,
      status: updated.totalHours - updated.usedHours === 0 ? 'DEPLETED' : updated.status,
    };
  });
};

// ==================== 获取活跃课包 ====================

export const getActivePackages = async (teacherId: string, studentId?: string) => {
  const where: Prisma.CoursePackageWhereInput = {
    teacherId,
    status: PackageStatus.ACTIVE,
  };

  if (studentId) where.studentId = studentId;

  const packages = await prisma.coursePackage.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      student: { select: { id: true, name: true, avatar: true } },
    },
  });

  return packages.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    studentId: p.studentId,
    studentName: p.student.name,
    studentAvatar: p.student.avatar,
    totalHours: p.totalHours,
    usedHours: p.usedHours,
    remainingHours: p.totalHours - p.usedHours,
    giftHours: p.giftHours,
    validStart: p.validStart?.toISOString().slice(0, 10) ?? null,
    validEnd: p.validEnd?.toISOString().slice(0, 10) ?? null,
    validDays: p.validDays,
    feeAmount: fenToYuanNumber(p.feeAmount),
    feeMethod: p.feeMethod,
    note: p.note,
    status: p.status,
  }));
};

// ==================== 课时充值（事务） ====================

export const rechargePackage = async (
  packageId: string,
  teacherId: string,
  input: { hours: number; method?: string },
) => {
  const pkg = await prisma.coursePackage.findUnique({ where: { id: packageId } });
  if (!pkg) throw new NotFoundError('套餐不存在');
  if (pkg.teacherId !== teacherId) throw new ForbiddenError('无权操作该套餐');

  return prisma.$transaction(async (tx) => {
    // 增加课时
    const updated = await tx.coursePackage.update({
      where: { id: packageId },
      data: {
        totalHours: { increment: input.hours },
        status: PackageStatus.ACTIVE, // 充值后恢复活跃
      },
    });

    // 创建充值记录
    await tx.recharge.create({
      data: {
        packageId,
        amount: input.hours,
        method: input.method ?? null,
      },
    });

    return {
      id: updated.id,
      totalHours: updated.totalHours,
      usedHours: updated.usedHours,
      remainingHours: updated.totalHours - updated.usedHours,
      status: updated.status,
    };
  });
};

// ==================== 自动匹配最优课包 ====================

export const findBestMatch = async (teacherId: string, studentId: string) => {
  const packages = await prisma.coursePackage.findMany({
    where: {
      teacherId,
      studentId,
      status: PackageStatus.ACTIVE,
    },
    orderBy: [
      { validEnd: 'asc' }, // 先过期的优先
      { createdAt: 'asc' },
    ],
  });

  if (packages.length === 0) return null;

  // 过滤出有剩余课时的
  const available = packages.filter((p) => p.totalHours - p.usedHours > 0);

  if (available.length === 0) return null;

  // 返回最优匹配（最先过期且有剩余课时的）
  const best = available[0];
  return {
    id: best.id,
    name: best.name,
    totalHours: best.totalHours,
    usedHours: best.usedHours,
    remainingHours: best.totalHours - best.usedHours,
    validEnd: best.validEnd?.toISOString().slice(0, 10) ?? null,
  };
};

// ==================== 批量更新课包状态 ====================

export const batchUpdateStatus = async (teacherId: string, ids: string[], status: PackageStatus) => {
  const result = await prisma.coursePackage.updateMany({
    where: { id: { in: ids }, teacherId },
    data: { status },
  });
  return { updated: result.count };
};
