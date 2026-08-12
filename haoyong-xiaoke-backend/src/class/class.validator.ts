import { z } from 'zod';

export const createClassSchema = z.object({
  name: z.string().min(1, '班级名称不能为空').max(100, '班级名称不能超过 100 字符'),
  subject: z.string().max(50, '科目不能超过 50 字符').optional(),
  grade: z.string().max(50, '年级不能超过 50 字符').optional(),
  schedule: z.string().max(200, '上课时间不能超过 200 字符').optional(),
  location: z.string().max(200, '上课地点不能超过 200 字符').optional(),
});

export const updateClassSchema = createClassSchema;

export const classListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['ACTIVE', 'DISBANDED']).optional(),
  keyword: z.string().max(100).optional(),
});

export const addStudentSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
});

export const checkinSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  studentIds: z.array(z.string().uuid('学生 ID 格式不正确')).min(1, '至少选择 1 个学生').max(100, '最多选择 100 个学生'),
  packageId: z.string().uuid('课时套餐 ID 格式不正确').optional(),
  content: z.string().max(2000, '课程内容不能超过 2000 字符').optional(),
  homework: z.string().max(2000, '课后作业不能超过 2000 字符').optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;
export type ClassListQuery = z.infer<typeof classListQuerySchema>;
export type AddStudentInput = z.infer<typeof addStudentSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
