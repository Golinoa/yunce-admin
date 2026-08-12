import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError } from '../utils/errors';
import type { CreateHolidayInput, UpdateHolidayInput, HolidayListQuery } from './holiday.validator';

// 节假日列表
export const listHolidays = async (query: HolidayListQuery) => {
  const { page, pageSize, year, type, keyword } = query;

  const where: Prisma.HolidayWhereInput = {};

  if (keyword) {
    where.name = { contains: keyword };
  }
  if (type) {
    where.type = type;
  }
  // 按年份筛选：startDate 在该年份范围内
  if (year) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59);
    where.startDate = { lte: yearEnd };
    where.endDate = { gte: yearStart };
  }

  const [list, total] = await Promise.all([
    prisma.holiday.findMany({
      where,
      orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.holiday.count({ where }),
  ]);

  return {
    list: list.map((h) => ({
      ...h,
      startDate: h.startDate.toISOString().slice(0, 10),
      endDate: h.endDate.toISOString().slice(0, 10),
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 节假日详情
export const getHolidayDetail = async (id: string) => {
  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) throw new NotFoundError('节假日不存在');
  return {
    ...holiday,
    startDate: holiday.startDate.toISOString().slice(0, 10),
    endDate: holiday.endDate.toISOString().slice(0, 10),
  };
};

// 创建节假日
export const createHoliday = async (input: CreateHolidayInput) => {
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // 校验日期范围
  if (endDate < startDate) {
    throw new BusinessError('结束日期不能早于开始日期', 422);
  }

  // 检查日期是否与已有节假日冲突
  const conflict = await prisma.holiday.findFirst({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (conflict) {
    throw new BusinessError(`日期与已有节假日「${conflict.name}」冲突`, 422);
  }

  const holiday = await prisma.holiday.create({
    data: {
      name: input.name,
      icon: input.icon,
      startDate,
      endDate,
      type: input.type,
      status: input.status,
    },
  });

  return {
    ...holiday,
    startDate: holiday.startDate.toISOString().slice(0, 10),
    endDate: holiday.endDate.toISOString().slice(0, 10),
  };
};

// 更新节假日
export const updateHoliday = async (id: string, input: UpdateHolidayInput) => {
  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) throw new NotFoundError('节假日不存在');

  const startDate = input.startDate ? new Date(input.startDate) : holiday.startDate;
  const endDate = input.endDate ? new Date(input.endDate) : holiday.endDate;

  // 校验日期范围
  if (endDate < startDate) {
    throw new BusinessError('结束日期不能早于开始日期', 422);
  }

  // 检查日期是否与其他节假日冲突（排除自身）
  const conflict = await prisma.holiday.findFirst({
    where: {
      id: { not: id },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });

  if (conflict) {
    throw new BusinessError(`日期与已有节假日「${conflict.name}」冲突`, 422);
  }

  const data: Prisma.HolidayUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.icon !== undefined) data.icon = input.icon;
  if (input.startDate !== undefined) data.startDate = startDate;
  if (input.endDate !== undefined) data.endDate = endDate;
  if (input.type !== undefined) data.type = input.type;
  if (input.status !== undefined) data.status = input.status;

  const updated = await prisma.holiday.update({ where: { id }, data });

  return {
    ...updated,
    startDate: updated.startDate.toISOString().slice(0, 10),
    endDate: updated.endDate.toISOString().slice(0, 10),
  };
};

// 删除节假日
export const deleteHoliday = async (id: string) => {
  const holiday = await prisma.holiday.findUnique({ where: { id } });
  if (!holiday) throw new NotFoundError('节假日不存在');

  await prisma.holiday.delete({ where: { id } });
};

// 检查某日是否为节假日
export const checkHoliday = async (date: string) => {
  const targetDate = new Date(date);
  const holiday = await prisma.holiday.findFirst({
    where: {
      startDate: { lte: targetDate },
      endDate: { gte: targetDate },
    },
  });

  if (!holiday) {
    return { isHoliday: false, holiday: null };
  }

  return {
    isHoliday: true,
    holiday: {
      id: holiday.id,
      name: holiday.name,
      icon: holiday.icon,
      startDate: holiday.startDate.toISOString().slice(0, 10),
      endDate: holiday.endDate.toISOString().slice(0, 10),
    },
  };
};
