import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import type {
  CreateFollowRecordInput,
  UpdateFollowRecordInput,
  FollowRecordListQuery,
} from './follow-record.validator';

// 跟进记录列表
export const listFollowRecords = async (query: FollowRecordListQuery) => {
  const { page, pageSize, studentId, teacherId, status, type, dateFrom, dateTo } = query;

  const where: Prisma.FollowRecordWhereInput = {};
  if (studentId) where.studentId = studentId;
  if (teacherId) where.teacherId = teacherId;
  if (status) where.status = status;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59.999Z');
  }

  const [list, total] = await Promise.all([
    prisma.followRecord.findMany({
      where,
      include: {
        student: { select: { id: true, name: true } },
        teacher: {
          include: { profile: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.followRecord.count({ where }),
  ]);

  return {
    list: list.map((r) => ({
      id: r.id,
      studentId: r.studentId,
      studentName: r.student.name,
      teacherId: r.teacherId,
      operatorName: r.teacher.profile?.name || '未知',
      type: r.type,
      status: r.status,
      content: r.content,
      nextDate: r.nextDate,
      nextContent: r.nextContent,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 根据学员获取跟进记录
export const getFollowRecordsByStudent = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError('学员不存在');

  const records = await prisma.followRecord.findMany({
    where: { studentId },
    include: {
      teacher: {
        include: { profile: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return records.map((r) => ({
    id: r.id,
    studentId: r.studentId,
    teacherId: r.teacherId,
    operatorName: r.teacher.profile?.name || '未知',
    type: r.type,
    status: r.status,
    content: r.content,
    nextDate: r.nextDate,
    nextContent: r.nextContent,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
};

// 获取跟进记录详情
export const getFollowRecordDetail = async (id: string) => {
  const record = await prisma.followRecord.findUnique({
    where: { id },
    include: {
      student: { select: { id: true, name: true } },
      teacher: {
        include: { profile: { select: { name: true } } },
      },
    },
  });
  if (!record) throw new NotFoundError('跟进记录不存在');

  return {
    id: record.id,
    studentId: record.studentId,
    studentName: record.student.name,
    teacherId: record.teacherId,
    operatorName: record.teacher.profile?.name || '未知',
    type: record.type,
    status: record.status,
    content: record.content,
    nextDate: record.nextDate,
    nextContent: record.nextContent,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

// 创建跟进记录
export const createFollowRecord = async (input: CreateFollowRecordInput, teacherId: string) => {
  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError('学员不存在');

  const record = await prisma.followRecord.create({
    data: {
      studentId: input.studentId,
      teacherId,
      type: input.type,
      content: input.content,
      nextDate: input.nextDate ? new Date(input.nextDate) : undefined,
      nextContent: input.nextContent,
      status: 'completed',
    },
    include: {
      teacher: {
        include: { profile: { select: { name: true } } },
      },
    },
  });

  return {
    id: record.id,
    studentId: record.studentId,
    teacherId: record.teacherId,
    operatorName: record.teacher.profile?.name || '未知',
    type: record.type,
    status: record.status,
    content: record.content,
    nextDate: record.nextDate,
    nextContent: record.nextContent,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
};

// 更新跟进记录
export const updateFollowRecord = async (id: string, input: UpdateFollowRecordInput) => {
  const record = await prisma.followRecord.findUnique({ where: { id } });
  if (!record) throw new NotFoundError('跟进记录不存在');

  const updated = await prisma.followRecord.update({
    where: { id },
    data: {
      ...input,
      nextDate: input.nextDate ? new Date(input.nextDate) : undefined,
    },
    include: {
      teacher: {
        include: { profile: { select: { name: true } } },
      },
    },
  });

  return {
    id: updated.id,
    studentId: updated.studentId,
    teacherId: updated.teacherId,
    operatorName: updated.teacher.profile?.name || '未知',
    type: updated.type,
    status: updated.status,
    content: updated.content,
    nextDate: updated.nextDate,
    nextContent: updated.nextContent,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
  };
};

// 删除跟进记录
export const deleteFollowRecord = async (id: string) => {
  const record = await prisma.followRecord.findUnique({ where: { id } });
  if (!record) throw new NotFoundError('跟进记录不存在');

  await prisma.followRecord.delete({ where: { id } });
};
