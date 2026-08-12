import { z } from 'zod';

// 课时充值记录列表查询
export const rechargeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  packageId: z.string().optional(),
  method: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
});

// 创建课时充值记录
export const createRechargeSchema = z.object({
  packageId: z.string().min(1, '课包 ID 不能为空'),
  hours: z.number().int().positive('充值课时数必须为正整数'),
  method: z.string().max(30, '充值方式不能超过 30 字符').optional(),
});

export type RechargeListQuery = z.infer<typeof rechargeListQuerySchema>;
export type CreateRechargeInput = z.infer<typeof createRechargeSchema>;
