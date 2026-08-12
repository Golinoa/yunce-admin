import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import type { AuditLogQuery } from './audit.validator';

// 查询审计日志
export const listAuditLogs = async (query: AuditLogQuery) => {
  const { page, pageSize, userId, action, module, startDate, endDate } = query;

  const where: Prisma.AuditLogWhereInput = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (module) where.module = module;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
  }

  const [list, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),

  ]);

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};
