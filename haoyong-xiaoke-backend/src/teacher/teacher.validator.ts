import { z } from 'zod';

// 教师角色
export const teacherRoleSchema = z.enum(['lead', 'assist', 'parttime']);

// 教师状态
export const teacherStatusSchema = z.enum(['active', 'resigned']);

// 离职类型
export const resignTypeSchema = z.enum(['quit', 'expire', 'dismiss']);

// 创建教师
export const createTeacherSchema = z.object({
  name: z.string().min(1, '教师姓名不能为空').max(50, '姓名不能超过 50 字符'),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  role: teacherRoleSchema.default('lead'),
  subject: z.string().max(50, '科目不能超过 50 字符').optional(),
  institution: z.string().max(100, '机构名称不能超过 100 字符').optional(),
  color: z.string().max(20, '颜色值不能超过 20 字符').optional(),
  salaryModelId: z.string().uuid('薪资模型 ID 格式不正确').optional(),
});

// 更新教师
export const updateTeacherSchema = z.object({
  name: z.string().min(1, '教师姓名不能为空').max(50, '姓名不能超过 50 字符').optional(),
  role: teacherRoleSchema.optional(),
  subject: z.string().max(50, '科目不能超过 50 字符').optional(),
  institution: z.string().max(100, '机构名称不能超过 100 字符').optional(),
  color: z.string().max(20, '颜色值不能超过 20 字符').optional(),
  salaryModelId: z.string().uuid('薪资模型 ID 格式不正确').nullable().optional(),
  payRemark: z.string().max(500, '发薪备注不能超过 500 字符').nullable().optional(),
});

// 教师列表查询
export const teacherListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  role: teacherRoleSchema.optional(),
  subject: z.string().optional(),
  status: teacherStatusSchema.optional(),
  keyword: z.string().max(50, '关键词不能超过 50 字符').optional(),
});

// 离职
export const resignSchema = z.object({
  resignType: resignTypeSchema,
  reason: z.string().max(500, '离职原因不能超过 500 字符').optional(),
});

// 批量确认薪资
export const batchConfirmSchema = z.object({
  ids: z.array(z.string().uuid('ID 格式不正确')).min(1, '至少选择一条记录'),
});

// 发放薪资
export const executePaySchema = z.object({
  ids: z.array(z.string().uuid('ID 格式不正确')).min(1, '至少选择一条记录'),
  remark: z.string().max(500, '备注不能超过 500 字符').optional(),
});

// 添加扣款/补发
export const addDeductionSchema = z.object({
  reason: z.string().min(1, '原因不能为空').max(200, '原因不能超过 200 字符'),
  amount: z.number().min(0.01, '金额必须大于 0'),
  type: z.enum(['deduct', 'bonus']),
});

// 薪资模型
export const createSalaryModelSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(50, '名称不能超过 50 字符'),
  type: z.enum(['standard', 'hourly', 'custom']).default('standard'),
  base: z.number().min(0, '底薪不能为负').default(0),
  rate: z.number().min(0, '课时费不能为负').default(0),
  attend: z.number().min(0, '全勤奖不能为负').default(0),
  perf: z.number().min(0, '绩效奖金不能为负').default(0),
  isDefault: z.boolean().default(false),
});

export const updateSalaryModelSchema = createSalaryModelSchema.partial();

// 发薪设置
export const salarySettingsSchema = z.object({
  payDay: z.number().int().min(1, '发薪日不能小于 1').max(31, '发薪日不能大于 31'),
  pushDaysBefore: z.number().int().min(0, '提前推送天数不能为负').max(30, '提前推送天数不能超过 30'),
  autoConfirm: z.boolean().default(false),
  pushEnabled: z.boolean().default(true),
});

// 创建薪资记录
export const createSalaryRecordSchema = z.object({
  teacherId: z.string().uuid('教师 ID 格式不正确'),
  month: z.string().regex(/^\d{4}-\d{2}$/, '月份格式应为 YYYY-MM'),
  amount: z.number().min(0, '金额不能为负'),
  remark: z.string().max(500, '备注不能超过 500 字符').optional(),
});

export type CreateTeacherInput = z.infer<typeof createTeacherSchema>;
export type UpdateTeacherInput = z.infer<typeof updateTeacherSchema>;
export type TeacherListQuery = z.infer<typeof teacherListQuerySchema>;
export type ResignInput = z.infer<typeof resignSchema>;
export type BatchConfirmInput = z.infer<typeof batchConfirmSchema>;
export type ExecutePayInput = z.infer<typeof executePaySchema>;
export type AddDeductionInput = z.infer<typeof addDeductionSchema>;
export type CreateSalaryModelInput = z.infer<typeof createSalaryModelSchema>;
export type UpdateSalaryModelInput = z.infer<typeof updateSalaryModelSchema>;
export type SalarySettingsInput = z.infer<typeof salarySettingsSchema>;
export type CreateSalaryRecordInput = z.infer<typeof createSalaryRecordSchema>;
