import { z } from 'zod';

// 课包类型
export const packageTypeSchema = z.enum(['hour_package', 'term', 'monthly', 'trial']);

// 创建课包模板
export const createTemplateSchema = z.object({
  name: z.string().min(1, '课包名称不能为空').max(100, '名称不能超过 100 字符'),
  type: packageTypeSchema.default('hour_package'),
  price: z.number().min(0, '价格不能为负'),
  lessonCount: z.number().int('课时数必须为整数').min(0, '课时数不能为负'),
  duration: z.number().int('课时长必须为整数').min(1, '课时长最少 1 分钟').default(45),
  validDays: z.number().int('有效天数必须为整数').min(0, '有效天数不能为负').optional(),
  description: z.string().max(500, '描述不能超过 500 字符').optional(),
}).refine(
  (data) => {
    // 期课必须填写有效天数
    if (data.type === 'term' && (!data.validDays || data.validDays === 0)) return false;
    // 月卡必须填写有效天数
    if (data.type === 'monthly' && (!data.validDays || data.validDays === 0)) return false;
    return true;
  },
  { message: '期课/月卡必须填写有效天数', path: ['validDays'] },
);

// 更新课包模板
export const updateTemplateSchema = z.object({
  name: z.string().min(1, '课包名称不能为空').max(100, '名称不能超过 100 字符').optional(),
  type: packageTypeSchema.optional(),
  price: z.number().min(0, '价格不能为负').optional(),
  lessonCount: z.number().int('课时数必须为整数').min(0, '课时数不能为负').optional(),
  duration: z.number().int('课时长必须为整数').min(1, '课时长最少 1 分钟').optional(),
  validDays: z.number().int('有效天数必须为整数').min(0, '有效天数不能为负').optional(),
  description: z.string().max(500, '描述不能超过 500 字符').optional(),
});

// 列表查询
export const templateListQuerySchema = z.object({
  type: packageTypeSchema.optional(),
  keyword: z.string().max(50, '关键词不能超过 50 字符').optional(),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type TemplateListQuery = z.infer<typeof templateListQuerySchema>;
