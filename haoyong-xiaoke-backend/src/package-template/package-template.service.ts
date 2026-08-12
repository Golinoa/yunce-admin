import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { CreateTemplateInput, UpdateTemplateInput, TemplateListQuery } from './package-template.validator';

// ==================== 获取教师的课包模板列表 ====================

export const listTemplates = async (teacherId: string, query: TemplateListQuery) => {
  const where: Prisma.CoursePackageTemplateWhereInput = { teacherId };

  if (query.type) where.type = query.type;
  if (query.keyword) where.name = { contains: query.keyword };

  const templates = await prisma.coursePackageTemplate.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return templates.map((t) => ({
    id: t.id,
    teacherId: t.teacherId,
    name: t.name,
    type: t.type,
    price: Number(t.price),
    lessonCount: t.lessonCount,
    duration: t.duration,
    validDays: t.validDays,
    description: t.description,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  }));
};

// ==================== 获取课包模板详情 ====================

export const getTemplateDetail = async (templateId: string, teacherId: string) => {
  const template = await prisma.coursePackageTemplate.findUnique({
    where: { id: templateId },
  });

  if (!template) throw new NotFoundError('课包模板不存在');
  if (template.teacherId !== teacherId) throw new ForbiddenError('无权查看该模板');

  return {
    ...template,
    price: Number(template.price),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
};

// ==================== 创建课包模板 ====================

export const createTemplate = async (teacherId: string, input: CreateTemplateInput) => {
  const template = await prisma.coursePackageTemplate.create({
    data: {
      teacherId,
      name: input.name,
      type: input.type,
      price: input.price,
      lessonCount: input.lessonCount,
      duration: input.duration,
      validDays: input.validDays,
      description: input.description,
    },
  });

  return {
    ...template,
    price: Number(template.price),
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString(),
  };
};

// ==================== 更新课包模板 ====================

export const updateTemplate = async (templateId: string, teacherId: string, input: UpdateTemplateInput) => {
  const template = await prisma.coursePackageTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('课包模板不存在');
  if (template.teacherId !== teacherId) throw new ForbiddenError('无权操作该模板');

  const data: Prisma.CoursePackageTemplateUpdateInput = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.type !== undefined) data.type = input.type;
  if (input.price !== undefined) data.price = input.price;
  if (input.lessonCount !== undefined) data.lessonCount = input.lessonCount;
  if (input.duration !== undefined) data.duration = input.duration;
  if (input.validDays !== undefined) data.validDays = input.validDays;
  if (input.description !== undefined) data.description = input.description;

  const updated = await prisma.coursePackageTemplate.update({
    where: { id: templateId },
    data,
  });

  return {
    ...updated,
    price: Number(updated.price),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
};

// ==================== 删除课包模板 ====================

export const deleteTemplate = async (templateId: string, teacherId: string) => {
  const template = await prisma.coursePackageTemplate.findUnique({ where: { id: templateId } });
  if (!template) throw new NotFoundError('课包模板不存在');
  if (template.teacherId !== teacherId) throw new ForbiddenError('无权操作该模板');

  await prisma.coursePackageTemplate.delete({ where: { id: templateId } });
};
