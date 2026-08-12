import { z } from 'zod';

export const sendNotificationSchema = z.object({
  receiverIds: z.array(z.string().uuid('接收者 ID 格式不正确')).min(1, '至少选择 1 个接收者').max(100, '最多选择 100 个接收者'),
  type: z.enum(['SYSTEM', 'LEAVE', 'SCHEDULE', 'CHECKIN', 'HOMEWORK'], { required_error: '请选择通知类型' }),
  title: z.string().min(1, '标题不能为空').max(200, '标题不能超过 200 字符'),
  content: z.string().min(1, '内容不能为空').max(2000, '内容不能超过 2000 字符'),
});

export const notificationListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  type: z.enum(['SYSTEM', 'LEAVE', 'SCHEDULE', 'CHECKIN', 'HOMEWORK']).optional(),
  read: z.preprocess((v) => v === 'true' ? true : v === 'false' ? false : undefined, z.boolean().optional()),
});

// 批量标记已读
export const batchReadSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少选择 1 条通知').max(100, '最多 100 条'),
});

// 批量删除
export const batchDeleteSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少选择 1 条通知').max(100, '最多 100 条'),
});

export type SendNotificationInput = z.infer<typeof sendNotificationSchema>;
export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
