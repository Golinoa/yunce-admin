import { Router } from 'express';
import * as homeController from './home.controller';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 小程序首页运营位配置（公开）
router.get('/operation-content', homeController.getOperationContent);

// 教师首页聚合数据
router.get(
  '/teacher',
  requireAuth,
  requireRole(['TEACHER']),
  homeController.getTeacherHome,
);

// 教师首页统计（按时段）
router.get(
  '/teacher/stats',
  requireAuth,
  requireRole(['TEACHER']),
  homeController.getTeacherStats,
);

// 教师待办事项
router.get(
  '/teacher/todos',
  requireAuth,
  requireRole(['TEACHER']),
  homeController.getTeacherTodos,
);

// 家长首页聚合数据
router.get(
  '/parent',
  requireAuth,
  requireRole(['PARENT']),
  homeController.getParentHome,
);

// 未读通知数
router.get(
  '/notifications/unread-count',
  requireAuth,
  homeController.getUnreadCount,
);

export default router;
