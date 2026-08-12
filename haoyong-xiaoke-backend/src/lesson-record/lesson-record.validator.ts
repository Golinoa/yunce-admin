import { z } from 'zod';

export const createLessonRecordSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
  packageId: z.string().uuid('课时套餐 ID 格式不正确').optional(),
  classId: z.string().uuid('班级 ID 格式不正确').optional(),
  scheduleId: z.string().uuid('排课 ID 格式不正确').optional(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '上课日期格式应为 YYYY-MM-DD'),
  duration: z.number().int('课时时长必须为整数').min(1, '课时时长最少 1 分钟').max(480, '课时时长最多 480 分钟'),
  content: z.string().max(2000, '课程内容不能超过 2000 字符').optional(),
  homework: z.string().max(2000, '课后作业不能超过 2000 字符').optional(),
});

export const updateLessonRecordSchema = z.object({
  content: z.string().max(2000, '课程内容不能超过 2000 字符').optional(),
  homework: z.string().max(2000, '课后作业不能超过 2000 字符').optional(),
  status: z.enum(['NORMAL', 'CANCELLED', 'MAKEUP'], {
    errorMap: () => ({ message: '状态必须是 NORMAL、CANCELLED 或 MAKEUP' }),
  }).optional(),
});

export const lessonRecordListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  studentId: z.string().uuid().optional(),
  classId: z.string().uuid().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['NORMAL', 'CANCELLED', 'MAKEUP']).optional(),
});

export type CreateLessonRecordInput = z.infer<typeof createLessonRecordSchema>;
export type UpdateLessonRecordInput = z.infer<typeof updateLessonRecordSchema>;
export type LessonRecordListQuery = z.infer<typeof lessonRecordListQuerySchema>;
