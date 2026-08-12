import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../middleware/validate';
import { loginSchema, logoutSchema, registerSchema, refreshTokenSchema, wechatLoginSchema, phoneLoginSchema, sendSmsCodeSchema } from './auth.validator';
import { requireAuth } from '../middleware/auth';
import { strictRateLimit } from '../middleware/rate-limit';

const router = Router();

// 微信登录（兼容旧版）
router.post('/login', strictRateLimit, validate({ body: loginSchema }), authController.login);

// 微信一键登录
router.post('/wechat-login', strictRateLimit, validate({ body: wechatLoginSchema }), authController.wechatLogin);

// 发送短信验证码
router.post('/sms-code', strictRateLimit, validate({ body: sendSmsCodeSchema }), authController.sendSmsCode);

// 手机号验证码登录
router.post('/phone-login', strictRateLimit, validate({ body: phoneLoginSchema }), authController.phoneLogin);

// 验证邀请码
router.get('/invite-code/:code/validate', strictRateLimit, authController.validateInviteCode);

// 手机号注册
router.post('/register', strictRateLimit, validate({ body: registerSchema }), authController.register);

// 获取当前用户
router.get('/me', requireAuth, authController.me);

// 刷新 Token
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refresh);

// 退出登录
router.post('/logout', validate({ body: logoutSchema }), authController.logout);

export default router;
