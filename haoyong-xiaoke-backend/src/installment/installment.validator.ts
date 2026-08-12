import { z } from 'zod';

// 创建分期计划
export const createInstallmentSchema = z.object({
  packageId: z.string().min(1, '课包 ID 不能为空'),
  period: z.number().int().min(2, '分期期数至少为 2').max(24, '分期期数最多 24 期'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  // 每期金额自动计算，也可手动覆盖
  amountPerPeriod: z.number().positive('每期金额必须为正数').optional(),
  // 间隔月数，默认 1（每月一期）
  intervalMonths: z.number().int().min(1).max(3).default(1),
});

// 更新单期信息
export const updateInstallmentSchema = z.object({
  amount: z.number().positive('金额必须为正数').optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  reminder: z.boolean().optional(),
});

// 确认收款
export const payInstallmentSchema = z.object({
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  note: z.string().max(200, '备注不能超过 200 字符').optional(),
});

// 分期列表查询
export const installmentListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  packageId: z.string().optional(),
  paid: z.enum(['true', 'false']).optional().transform(
    (v) => v === undefined ? undefined : v === 'true'
  ),
});

// 即将到期查询
export const dueSoonQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(7),
  paid: z.enum(['true', 'false']).optional().transform(
    (v) => v === undefined ? undefined : v === 'true'
  ),
});

export type CreateInstallmentInput = z.infer<typeof createInstallmentSchema>;
export type UpdateInstallmentInput = z.infer<typeof updateInstallmentSchema>;
export type PayInstallmentInput = z.infer<typeof payInstallmentSchema>;
export type InstallmentListQuery = z.infer<typeof installmentListQuerySchema>;
export type DueSoonQuery = z.infer<typeof dueSoonQuerySchema>;
