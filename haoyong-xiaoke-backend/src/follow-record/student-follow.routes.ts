import { Router } from 'express';
import * as followRecordController from './follow-record.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 根据学员获取跟进记录
router.get(
  '/students/:studentId/follow-records',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  followRecordController.getFollowRecordsByStudent,
);

export default router;
