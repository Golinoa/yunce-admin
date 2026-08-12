import { z } from 'zod';

// 创建节假日
export const createHolidaySchema = z.object({
  name: z.string().min(1, '假期名称不能为空').max(50, '名称不能超过 50 字符'),
  icon: z.string().max(10, '图标不能超过 10 字符').default('🎉'),
  startDate: z.string().min(1, '开始日期不能为空'),
  endDate: z.string().min(1, '结束日期不能为空'),
  type: z.enum(['legal', 'custom']).default('custom'),
  status: z.enum(['rest', 'work']).default('rest'),
}).refine((data) => data.startDate <= data.endDate, {
  message: '结束日期必须大于等于开始日期',
  path: ['endDate'],
});

// 更新节假日
export const updateHolidaySchema = z.object({
  name: z.string().min(1, '假期名称不能为空').max(50, '名称不能超过 50 字符').optional(),
  icon: z.string().max(10, '图标不能超过 10 字符').optional(),
  startDate: z.string().min(1, '开始日期不能为空').optional(),
  endDate: z.string().min(1, '结束日期不能为空').optional(),
  type: z.enum(['legal', 'custom']).optional(),
  status: z.enum(['rest', 'work']).optional(),
});

// 节假日列表查询
export const holidayListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  type: z.enum(['legal', 'custom']).optional(),
  keyword: z.string().max(50, '关键词不能超过 50 字符').optional(),
});

export const holidayCheckQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
});

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;
export type UpdateHolidayInput = z.infer<typeof updateHolidaySchema>;
export type HolidayListQuery = z.infer<typeof holidayListQuerySchema>;
