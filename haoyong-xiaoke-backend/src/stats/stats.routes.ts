import { Router } from 'express';
import * as statsController from './stats.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 教师统计
router.get(
  '/teacher',
  requireAuth,
  requireRole(['TEACHER']),
  statsController.getTeacherStats,
);

// 学生统计
router.get(
  '/student/:id',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  statsController.getStudentStats,
);

export default router;
