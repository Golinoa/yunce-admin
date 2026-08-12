import { z } from 'zod';

// 创建跟进记录
export const createFollowRecordSchema = z.object({
  studentId: z.string().min(1, '学员ID不能为空'),
  type: z.enum(['call', 'wechat', 'visit', 'other']).default('call'),
  content: z.string().min(1, '跟进内容不能为空').max(1000, '跟进内容不能超过1000字符'),
  nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  nextContent: z.string().max(500).optional(),
});

// 更新跟进记录
export const updateFollowRecordSchema = z.object({
  content: z.string().min(1).max(1000).optional(),
  status: z.enum(['pending', 'completed']).optional(),
  nextDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextContent: z.string().max(500).optional(),
});

// 跟进记录列表查询
export const followRecordListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  studentId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.enum(['pending', 'completed']).optional(),
  type: z.enum(['call', 'wechat', 'visit', 'other']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// 类型导出
export type CreateFollowRecordInput = z.infer<typeof createFollowRecordSchema>;
export type UpdateFollowRecordInput = z.infer<typeof updateFollowRecordSchema>;
export type FollowRecordListQuery = z.infer<typeof followRecordListQuerySchema>;
