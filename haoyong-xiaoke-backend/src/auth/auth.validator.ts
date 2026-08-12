import { z } from 'zod';

const appRoleSchema = z.enum(['TEACHER', 'PARENT', 'PRINCIPAL'], {
  errorMap: () => ({ message: '角色必须是 TEACHER、PARENT 或 PRINCIPAL' }),
});

export const loginSchema = z.object({
  code: z.string().min(1, '微信登录 code 不能为空'),
  // 小程序联调阶段未显式传 role 时，默认按机构端口径处理。
  role: appRoleSchema.optional().default('PRINCIPAL'),
});

// 微信一键登录
export const wechatLoginSchema = z.object({
  code: z.string().min(1, '微信登录 code 不能为空'),
  role: appRoleSchema.optional().default('PRINCIPAL'),
});

// 手机号验证码登录
export const phoneLoginSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  code: z.string().length(6, '验证码必须是 6 位'),
  role: appRoleSchema.optional().default('PRINCIPAL'),
});

// 发送短信验证码
export const sendSmsCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

export const registerSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
  role: appRoleSchema,
  nickname: z.string().min(1).max(50).optional(),
  avatar: z.string().url('头像必须是合法 URL').optional(),
  institution: z.string().max(100, '机构名称不能超过 100 字符').optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空'),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1, '刷新令牌不能为空').optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type WechatLoginInput = z.infer<typeof wechatLoginSchema>;
export type PhoneLoginInput = z.infer<typeof phoneLoginSchema>;
export type SendSmsCodeInput = z.infer<typeof sendSmsCodeSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
