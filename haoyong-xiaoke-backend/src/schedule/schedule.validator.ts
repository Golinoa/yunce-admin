import { z } from 'zod';

const timeRegex = /^\d{2}:\d{2}$/;

export const createScheduleSchema = z.object({
  classId: z.string().uuid('班级 ID 格式不正确'),
  dayOfWeek: z.number().int('星期必须为整数').min(0, '星期最小为 0（周日）').max(6, '星期最大为 6（周六）'),
  startTime: z.string().regex(timeRegex, '开始时间格式应为 HH:mm'),
  endTime: z.string().regex(timeRegex, '结束时间格式应为 HH:mm'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime'],
}).refine((data) => {
  if (data.startDate && data.endDate) return data.startDate <= data.endDate;
  return true;
}, {
  message: '结束日期必须大于等于开始日期',
  path: ['endDate'],
});

export const updateScheduleSchema = createScheduleSchema;

export const scheduleListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  classId: z.string().uuid('班级 ID 格式不正确').optional(),
  dayOfWeek: z.coerce.number().min(0).max(6).optional(),
});

// 今日课表查询
export const todayScheduleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
});

// 周课表查询
export const weekScheduleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
});

export const scheduleConflictQuerySchema = z.object({
  dayOfWeek: z.coerce.number().int('星期必须为整数').min(0, '星期最小为 0（周日）').max(6, '星期最大为 6（周六）'),
  startTime: z.string().regex(timeRegex, '开始时间格式应为 HH:mm'),
  endTime: z.string().regex(timeRegex, '结束时间格式应为 HH:mm'),
  excludeScheduleId: z.string().uuid('排课 ID 格式不正确').optional(),
}).refine((data) => data.startTime < data.endTime, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime'],
});

// 批量排课
export const batchCreateScheduleSchema = z.object({
  classId: z.string().uuid('班级 ID 格式不正确'),
  dayOfWeeks: z.array(z.number().int().min(0).max(6)).min(1, '至少选择 1 天').max(7, '最多 7 天'),
  startTime: z.string().regex(timeRegex, '开始时间格式应为 HH:mm'),
  endTime: z.string().regex(timeRegex, '结束时间格式应为 HH:mm'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '开始日期不能为空'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '结束日期不能为空'),
  skipHoliday: z.boolean().default(true),
}).refine((data) => data.startTime < data.endTime, {
  message: '结束时间必须晚于开始时间',
  path: ['endTime'],
}).refine((data) => data.startDate <= data.endDate, {
  message: '结束日期必须大于等于开始日期',
  path: ['endDate'],
});

export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type UpdateScheduleInput = z.infer<typeof updateScheduleSchema>;
export type ScheduleListQuery = z.infer<typeof scheduleListQuerySchema>;
export type TodayScheduleQuery = z.infer<typeof todayScheduleQuerySchema>;
export type WeekScheduleQuery = z.infer<typeof weekScheduleQuerySchema>;
export type BatchCreateScheduleInput = z.infer<typeof batchCreateScheduleSchema>;
