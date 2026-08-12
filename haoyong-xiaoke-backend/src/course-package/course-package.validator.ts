import { z } from 'zod';

export const createPackageSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
  name: z.string().min(1, '套餐名称不能为空').max(100, '套餐名称不能超过 100 字符'),
  totalHours: z.number().int('总课时必须为整数').min(1, '总课时最少为 1'),
  feeAmount: z.number().positive('费用金额必须为正数').optional(),
  feeMethod: z.string().max(50, '收费方式不能超过 50 字符').optional(),
  validStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
  validEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
}).refine((data) => {
  if (data.validStart && data.validEnd) return data.validStart <= data.validEnd;
  return true;
}, {
  message: '结束日期必须大于等于开始日期',
  path: ['validEnd'],
});

export const updatePackageSchema = z.object({
  name: z.string().min(1, '套餐名称不能为空').max(100, '套餐名称不能超过 100 字符').optional(),
  totalHours: z.number().int('总课时必须为整数').min(1, '总课时最少为 1').optional(),
  validEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD').optional(),
});

export const packageListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  studentId: z.string().uuid('学生 ID 格式不正确').optional(),
  status: z.enum(['ACTIVE', 'EXPIRED', 'DEPLETED']).optional(),
});

export const activePackageQuerySchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确').optional(),
});

export const bestMatchQuerySchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
});

// 扣减课时
export const deductHoursSchema = z.object({
  hours: z.number().int('课时必须为整数').min(1, '扣减课时最少为 1'),
});

// 课时充值
export const rechargeSchema = z.object({
  hours: z.number().int('课时必须为整数').min(1, '充值课时最少为 1'),
  method: z.string().max(50, '充值方式不能超过 50 字符').optional(),
});

// 批量更新状态
export const batchUpdateStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, '至少选择 1 个课包').max(50, '最多 50 个'),
  status: z.enum(['ACTIVE', 'EXPIRED', 'DEPLETED']),
});

export type CreatePackageInput = z.infer<typeof createPackageSchema>;
export type UpdatePackageInput = z.infer<typeof updatePackageSchema>;
export type PackageListQuery = z.infer<typeof packageListQuerySchema>;
export type DeductHoursInput = z.infer<typeof deductHoursSchema>;
export type RechargeInput = z.infer<typeof rechargeSchema>;
