import { Router } from 'express';
import * as leaveController from './leave-request.controller';
import { validate } from '../middleware/validate';
import { createLeaveRequestSchema, approveLeaveSchema, leaveListQuerySchema } from './leave-request.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 请假列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ query: leaveListQuerySchema }),
  leaveController.list,
);

// 创建请假
router.post(
  '/',
  requireAuth,
  requireRole(['PARENT']),
  validate({ body: createLeaveRequestSchema }),
  leaveController.create,
);

// 审批请假
router.put(
  '/:id/approve',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: approveLeaveSchema }),
  leaveController.approve,
);

export default router;
