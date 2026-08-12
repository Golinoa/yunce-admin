import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError } from '../utils/errors';
import type { CreateCampusInput, UpdateCampusInput, CampusListQuery } from './campus.validator';

// 校区列表
export const listCampuses = async (query: CampusListQuery) => {
  const { page, pageSize, keyword, type } = query;

  const where: Prisma.CampusWhereInput = {};
  if (type) where.type = type;
  if (keyword) {
    where.name = { contains: keyword };
  }

  const [list, total] = await Promise.all([
    prisma.campus.findMany({
      where,
      orderBy: [{ isMain: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.campus.count({ where }),
  ]);

  return {
    list: list.map((c) => ({
      ...c,
      monthlyRent: Number(c.monthlyRent),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 校区详情
export const getCampusDetail = async (id: string) => {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new NotFoundError('校区不存在');
  return { ...campus, monthlyRent: Number(campus.monthlyRent) };
};

// 创建校区
export const createCampus = async (input: CreateCampusInput) => {
  // 若设为主校区，先取消其他主校区
  if (input.isMain) {
    await prisma.campus.updateMany({
      where: { isMain: true },
      data: { isMain: false },
    });
  }

  const campus = await prisma.campus.create({ data: input });
  return { ...campus, monthlyRent: Number(campus.monthlyRent) };
};

// 更新校区
export const updateCampus = async (id: string, input: UpdateCampusInput) => {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new NotFoundError('校区不存在');

  // 若设为主校区，先取消其他主校区
  if (input.isMain) {
    await prisma.campus.updateMany({
      where: { isMain: true, NOT: { id } },
      data: { isMain: false },
    });
  }

  const updated = await prisma.campus.update({ where: { id }, data: input });
  return { ...updated, monthlyRent: Number(updated.monthlyRent) };
};

// 设为主校区
export const setMainCampus = async (id: string) => {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new NotFoundError('校区不存在');

  if (campus.isMain) {
    throw new BusinessError('该校区已是主校区', 422);
  }

  await prisma.$transaction([
    prisma.campus.updateMany({ where: { isMain: true }, data: { isMain: false } }),
    prisma.campus.update({ where: { id }, data: { isMain: true } }),
  ]);

  return { id, isMain: true };
};

// 删除校区
export const deleteCampus = async (id: string) => {
  const campus = await prisma.campus.findUnique({ where: { id } });
  if (!campus) throw new NotFoundError('校区不存在');

  if (campus.isMain) {
    throw new BusinessError('不能删除主校区', 422);
  }

  await prisma.campus.delete({ where: { id } });
};
