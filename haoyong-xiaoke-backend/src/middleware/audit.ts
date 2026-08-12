import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from './auth';
import { redact } from '../utils/redact';

// 记录审计日志
export const auditLog = (action: string, module: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const targetId = req.params?.id || req.params?.packageId || req.params?.studentId || null;

    res.on('finish', () => {
      if (!userId) {
        return;
      }

      const detail = JSON.stringify({
        method: req.method,
        path: req.path,
        params: redact(req.params),
        query: redact(req.query),
        body: req.method !== 'GET' ? redact(req.body) : undefined,
        statusCode: res.statusCode,
      });

      prisma.auditLog.create({
        data: {
          userId,
          userRole: userRole || 'UNKNOWN',
          action,
          module,
          targetId,
          detail,
          ip: req.ip || req.socket?.remoteAddress,
        },
      }).catch(() => {
        // 审计日志写入失败不应影响业务
      });
    });

    next();
  };
};
