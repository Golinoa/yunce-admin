import { Router } from 'express';
import * as leadController from './lead.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 落地页获取邀约数据（公开接口）
router.get(
  '/landing/:code',
  leadController.getInviteLanding,
);

// 落地页提交（公开接口）
router.post(
  '/landing/submit',
  leadController.submitInviteLanding,
);

export default router;
