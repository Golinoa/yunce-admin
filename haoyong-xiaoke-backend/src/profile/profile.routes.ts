import { Router } from 'express';
import * as profileController from './profile.controller';
import { validate } from '../middleware/validate';
import { updateProfileSchema } from './profile.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 获取个人资料
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  profileController.getProfile,
);

// 更新个人资料
router.put(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ body: updateProfileSchema }),
  profileController.updateProfile,
);

export default router;
