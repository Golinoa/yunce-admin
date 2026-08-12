import { z } from 'zod';

// 统计查询通用参数
export const statisticsQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).default('month'),
  year: z.coerce.number().int().min(2020).max(2099).optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

// 预警/洞察查询参数
export const alertQuerySchema = z.object({
  viewType: z.enum(['operation', 'finance']).default('operation'),
  year: z.coerce.number().int().min(2020).max(2099),
  month: z.coerce.number().int().min(1).max(12),
  filterMode: z.enum(['month', 'quarter', 'year', 'custom']).default('month'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// 发薪日设置
export const payDaySettingsSchema = z.object({
  payDay: z.number().int().min(1).max(28),
  pushDaysBefore: z.number().int().min(0).max(7).default(3),
  autoConfirm: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
});

export type StatisticsQueryType = z.infer<typeof statisticsQuerySchema>;
export type AlertQueryType = z.infer<typeof alertQuerySchema>;
export type PayDaySettingsType = z.infer<typeof payDaySettingsSchema>;
