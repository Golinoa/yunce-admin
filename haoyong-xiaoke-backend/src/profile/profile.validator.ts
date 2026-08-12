import { z } from 'zod';

export const updateProfileSchema = z.object({
  nickname: z.string().min(1, '昵称不能为空').max(50, '昵称不能超过 50 字符').optional(),
  avatar: z.string().url('头像必须是合法 URL').optional(),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确').optional(),
  email: z.string().email('邮箱格式不正确').optional(),
  institution: z.string().max(100, '机构名称不能超过 100 字符').optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
