import { z } from 'zod';

// 创建通知偏好
export const createNotifySettingSchema = z.object({
  label: z.string().min(1, '标签不能为空').max(50, '标签不能超过 50 字符'),
  sub: z.string().max(100, '描述不能超过 100 字符').optional(),
  enabled: z.boolean().default(true),
  group: z.string().max(30, '分组不能超过 30 字符').default('default'),
});

// 更新通知偏好
export const updateNotifySettingSchema = z.object({
  label: z.string().min(1, '标签不能为空').max(50, '标签不能超过 50 字符').optional(),
  sub: z.string().max(100, '描述不能超过 100 字符').optional().nullable(),
  enabled: z.boolean().optional(),
  group: z.string().max(30, '分组不能超过 30 字符').optional(),
});

// 通知偏好列表查询
export const notifySettingListQuerySchema = z.object({
  group: z.string().max(30).optional(),
  enabled: z.enum(['true', 'false']).optional().transform((v) => v === undefined ? undefined : v === 'true'),
});

// 批量更新开关
export const batchUpdateNotifySettingSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少选择一项').max(50, '最多 50 项'),
  enabled: z.boolean(),
});

export type CreateNotifySettingInput = z.infer<typeof createNotifySettingSchema>;
export type UpdateNotifySettingInput = z.infer<typeof updateNotifySettingSchema>;
export type NotifySettingListQuery = z.infer<typeof notifySettingListQuerySchema>;
export type BatchUpdateNotifySettingInput = z.infer<typeof batchUpdateNotifySettingSchema>;
