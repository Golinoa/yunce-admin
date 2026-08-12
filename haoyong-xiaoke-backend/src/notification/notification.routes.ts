import { Router } from 'express';
import * as notifController from './notification.controller';
import { validate } from '../middleware/validate';
import { sendNotificationSchema, notificationListQuerySchema, batchReadSchema, batchDeleteSchema } from './notification.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 通知列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ query: notificationListQuerySchema }),
  notifController.list,
);

// 发送通知
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: sendNotificationSchema }),
  notifController.send,
);

// 批量标记已读（固定路径在 /:id 之前）
router.put(
  '/batch-read',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ body: batchReadSchema }),
  notifController.batchMarkRead,
);

// 全部标记已读
router.put(
  '/read-all',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  notifController.markAllRead,
);

// 批量删除
router.delete(
  '/batch',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ body: batchDeleteSchema }),
  notifController.batchDelete,
);

// 标记已读
router.put(
  '/:id/read',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  notifController.markRead,
);

export default router;
