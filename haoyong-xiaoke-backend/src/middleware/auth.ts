import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { verifyAccessToken } from '../utils/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    profileId: string;
    role: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
    sessionId: string;
    sessionVersion: number;
  };
}

// Token 黑名单（内存实现，生产环境应使用 Redis）
// key: token, value: 过期时间戳(ms)
const tokenBlacklist = new Map<string, number>();

export const addToBlacklist = (token: string): void => {
  try {
    const decoded = jwt.decode(token) as jwt.JwtPayload | null;
    if (decoded?.exp) {
      tokenBlacklist.set(token, decoded.exp * 1000);
    } else {
      // 无法解析过期时间，默认黑名单 2 小时
      tokenBlacklist.set(token, Date.now() + 2 * 60 * 60 * 1000);
    }
  } catch {
    tokenBlacklist.set(token, Date.now() + 2 * 60 * 60 * 1000);
  }
};

export const isBlacklisted = (token: string): boolean => {
  return tokenBlacklist.has(token);
};

// 清理过期的黑名单 Token
export const cleanupBlacklist = (): void => {
  const now = Date.now();
  for (const [token, expireAt] of tokenBlacklist.entries()) {
    if (expireAt <= now) {
      tokenBlacklist.delete(token);
    }
  }
};

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '未提供认证令牌',
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // 检查 Token 黑名单
    if (isBlacklisted(token)) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '认证令牌已失效',
      });
    }

    const payload = verifyAccessToken(token);
    const session = await prisma.authSession.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        profileId: true,
        sessionVersion: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    if (
      !session ||
      session.profileId !== payload.profileId ||
      session.sessionVersion !== payload.sessionVersion ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '认证令牌已失效',
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { id: payload.profileId },
      select: { id: true, role: true },
    });

    if (!profile) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '用户不存在或已被删除',
      });
    }

    req.user = {
      id: payload.userId,
      profileId: profile.id,
      role: profile.role as 'PRINCIPAL' | 'TEACHER' | 'PARENT',
      sessionId: payload.sessionId,
      sessionVersion: payload.sessionVersion
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '认证令牌已过期',
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '认证令牌无效',
      });
    }
    return res.status(500).json({
      code: 500,
      data: null,
      message: '认证过程发生错误',
    });
  }
};

export const requireRole = (roles: ('PRINCIPAL' | 'TEACHER' | 'PARENT')[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '未认证',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        code: 403,
        data: null,
        message: `权限不足：需要 ${roles.join(' 或 ')} 角色`,
      });
    }

    next();
  };
};
