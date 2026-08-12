import { Response, NextFunction } from 'express';
import * as auditService from './audit.service';
import { paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { auditLogQuerySchema } from './audit.validator';

// 查询审计日志
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = auditLogQuerySchema.parse(req.query);
    const result = await auditService.listAuditLogs(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};
