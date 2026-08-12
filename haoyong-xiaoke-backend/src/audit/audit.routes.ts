import { Router } from 'express';
import * as auditController from './audit.controller';
import { validate } from '../middleware/validate';
import { auditLogQuerySchema } from './audit.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 查询审计日志（仅校长）
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: auditLogQuerySchema }),
  auditController.list,
);

export default router;
