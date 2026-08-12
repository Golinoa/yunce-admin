import { z } from 'zod';

// ==================== Attendance (考勤) ====================

// 记录考勤
export const createAttendanceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['present', 'late', 'absent', 'leave']),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  remark: z.string().max(200).optional(),
});

// 更新考勤
export const updateAttendanceSchema = z.object({
  status: z.enum(['present', 'late', 'absent', 'leave']).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  remark: z.string().max(200).optional(),
});

// 考勤列表查询
export const attendanceListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  teacherId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['present', 'late', 'absent', 'leave']).optional(),
});

// 考勤统计查询
export const attendanceStatsQuerySchema = z.object({
  teacherId: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ==================== SalaryTemplate (薪资模板) ====================

// 创建薪资模板
export const createSalaryTemplateSchema = z.object({
  campusId: z.string().min(1, '校区ID不能为空'),
  name: z.string().min(1, '模板名称不能为空').max(50),
  baseSalary: z.number().int().min(0).default(0),
  rules: z.array(z.object({
    type: z.string(),
    name: z.string(),
    value: z.number(),
    unit: z.string().optional(),
  })).default([]),
});

// 更新薪资模板
export const updateSalaryTemplateSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  baseSalary: z.number().int().min(0).optional(),
  rules: z.array(z.object({
    type: z.string(),
    name: z.string(),
    value: z.number(),
    unit: z.string().optional(),
  })).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// 薪资模板列表查询
export const salaryTemplateListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  campusId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

// ==================== TemporaryReschedule (临时调课) ====================

// 创建临时调课
export const createTemporaryRescheduleSchema = z.object({
  scheduleId: z.string().min(1, '排课ID不能为空'),
  originalDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  originalTime: z.string(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  targetTime: z.string(),
  reason: z.string().min(1, '调课原因不能为空').max(200),
});

// 批量调课
export const batchRescheduleSchema = z.object({
  reason: z.string().min(1).max(200),
  schedules: z.array(z.object({
    scheduleId: z.string(),
    originalDate: z.string(),
    originalTime: z.string(),
    targetDate: z.string(),
    targetTime: z.string(),
  })).min(1, '至少需要一个调课'),
});

// 临时调课列表查询
export const temporaryRescheduleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
});

// 类型导出
export type CreateAttendanceInput = z.infer<typeof createAttendanceSchema>;
export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;
export type AttendanceListQuery = z.infer<typeof attendanceListQuerySchema>;
export type AttendanceStatsQuery = z.infer<typeof attendanceStatsQuerySchema>;

export type CreateSalaryTemplateInput = z.infer<typeof createSalaryTemplateSchema>;
export type UpdateSalaryTemplateInput = z.infer<typeof updateSalaryTemplateSchema>;
export type SalaryTemplateListQuery = z.infer<typeof salaryTemplateListQuerySchema>;

export type CreateTemporaryRescheduleInput = z.infer<typeof createTemporaryRescheduleSchema>;
export type BatchRescheduleInput = z.infer<typeof batchRescheduleSchema>;
export type TemporaryRescheduleListQuery = z.infer<typeof temporaryRescheduleListQuerySchema>;
