import { z } from 'zod';

export const createStudentSchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过 50 字符'),
  avatar: z.string().url('头像必须是合法 URL').optional(),
  gender: z.enum(['MALE', 'FEMALE'], {
    errorMap: () => ({ message: '性别必须是 MALE 或 FEMALE' }),
  }).optional(),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '生日格式应为 YYYY-MM-DD').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  remark: z.string().max(500, '备注不能超过 500 字符').optional(),
});

export const updateStudentSchema = createStudentSchema;

export const bindParentSchema = z.object({
  relation: z.string().min(1, '关系不能为空').max(20, '关系不能超过 20 字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

export const studentListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'INACTIVE', 'GRADUATED']).optional(),
  keyword: z.string().max(100).optional(),
  sortBy: z.enum(['createdAt', 'name', 'status']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const studentDuplicateQuerySchema = z.object({
  name: z.string().min(1, '姓名不能为空').max(50, '姓名不能超过 50 字符'),
  excludeId: z.string().uuid('学生 ID 格式不正确').optional(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type BindParentInput = z.infer<typeof bindParentSchema>;
export type StudentListQuery = z.infer<typeof studentListQuerySchema>;
