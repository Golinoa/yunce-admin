import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import * as authService from './auth.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { addToBlacklist, cleanupBlacklist } from '../middleware/auth';
import { UnauthorizedError } from '../utils/errors';
import { verifyAccessToken } from '../utils/jwt';

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.wechatLogin(req.body);
    success(res, result, result.isNewUser ? '新用户注册成功' : '登录成功');
  } catch (error) {
    next(error);
  }
};

// 微信一键登录
export const wechatLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.wechatLogin(req.body);
    success(res, result, result.isNewUser ? '新用户注册成功' : '登录成功');
  } catch (error) {
    next(error);
  }
};

// 发送短信验证码
export const sendSmsCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { phone } = req.body;
    const result = await authService.sendSmsCode(phone);
    success(res, result, '验证码已发送');
  } catch (error) {
    next(error);
  }
};

// 手机号验证码登录
export const phoneLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.phoneLogin(req.body);
    success(res, result, result.isNewUser ? '新用户注册成功' : '登录成功');
  } catch (error) {
    next(error);
  }
};

// 验证邀请码
export const validateInviteCode = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code } = req.params;
    const result = await authService.validateInviteCode(code);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await authService.phoneRegister(req.body);
    success(res, result, '注册成功');
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const profileId = req.user!.profileId;
    const user = await authService.getCurrentUser(profileId);
    success(res, user);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);
    success(res, result, 'Token 刷新成功');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const refreshToken = typeof req.body?.refreshToken === 'string' ? req.body.refreshToken : undefined;
    let sessionId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      addToBlacklist(token);
      cleanupBlacklist();
      sessionId = verifyAccessToken(token).sessionId;
    }

    if (sessionId) {
      await authService.revokeSession(sessionId);
      success(res, null, '退出成功');
      return;
    }

    if (refreshToken) {
      await authService.revokeSessionByRefreshToken(refreshToken);
      success(res, null, '退出成功');
      return;
    }

    throw new UnauthorizedError('未提供有效令牌');
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('认证令牌无效'));
      return;
    }
    next(error);
  }
};
