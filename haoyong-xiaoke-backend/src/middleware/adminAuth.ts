import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { verifyAdminAccessToken } from '../utils/admin-jwt';

export interface AdminAuthRequest extends Request {
  adminUser?: {
    id: string;
    role: 'ADMIN';
    sessionId: string;
    sessionVersion: number;
    username: string;
  };
}

export const requireAdminAuth = async (
  req: AdminAuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '未提供后台认证令牌',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = verifyAdminAccessToken(token);

    const session = await prisma.adminSession.findUnique({
      where: { id: payload.sessionId },
      include: {
        adminUser: {
          select: {
            id: true,
            role: true,
            status: true,
            username: true,
          },
        },
      },
    });

    if (
      !session ||
      session.adminUserId !== payload.adminUserId ||
      session.sessionVersion !== payload.sessionVersion ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.adminUser.status !== 'ACTIVE'
    ) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '后台认证令牌已失效',
      });
    }

    req.adminUser = {
      id: session.adminUser.id,
      role: session.adminUser.role,
      sessionId: session.id,
      sessionVersion: session.sessionVersion,
      username: session.adminUser.username,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '后台认证令牌已过期',
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '后台认证令牌无效',
      });
    }

    return res.status(500).json({
      code: 500,
      data: null,
      message: '后台认证过程发生错误',
    });
  }
};
