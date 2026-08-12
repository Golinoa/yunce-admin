import { prisma } from '../config/database';
import { NotFoundError, ConflictError } from '../utils/errors';
import type { CreateSubjectInput, UpdateSubjectInput } from './subject.validator';

// 科目列表
export const listSubjects = async () => {
  return prisma.subject.findMany({
    orderBy: { createdAt: 'desc' },
  });
};

// 科目详情
export const getSubjectDetail = async (id: string) => {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new NotFoundError('科目不存在');
  return subject;
};

// 创建科目
export const createSubject = async (input: CreateSubjectInput) => {
  // 检查重名
  const existing = await prisma.subject.findFirst({ where: { name: input.name } });
  if (existing) throw new ConflictError('科目名称已存在');

  return prisma.subject.create({ data: input });
};

// 更新科目
export const updateSubject = async (id: string, input: UpdateSubjectInput) => {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new NotFoundError('科目不存在');

  // 若更新名称，检查重名
  if (input.name && input.name !== subject.name) {
    const existing = await prisma.subject.findFirst({ where: { name: input.name } });
    if (existing) throw new ConflictError('科目名称已存在');
  }

  return prisma.subject.update({ where: { id }, data: input });
};

// 删除科目
export const deleteSubject = async (id: string) => {
  const subject = await prisma.subject.findUnique({ where: { id } });
  if (!subject) throw new NotFoundError('科目不存在');

  await prisma.subject.delete({ where: { id } });
};
