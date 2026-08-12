import { z } from 'zod';

// 创建科目
export const createSubjectSchema = z.object({
  name: z.string().min(1, '科目名称不能为空').max(50, '科目名称不能超过 50 字符'),
  icon: z.string().default('📚'),
  color: z.string().default('#5EC8A8'),
  iconGradient: z.string().default('from-green-400 to-green-600'),
});

// 更新科目
export const updateSubjectSchema = z.object({
  name: z.string().min(1, '科目名称不能为空').max(50, '科目名称不能超过 50 字符').optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  iconGradient: z.string().optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;
