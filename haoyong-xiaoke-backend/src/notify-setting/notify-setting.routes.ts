import { Router } from 'express';
import * as notifySettingController from './notify-setting.controller';
import { validate } from '../middleware/validate';
import { createNotifySettingSchema, updateNotifySettingSchema, notifySettingListQuerySchema, batchUpdateNotifySettingSchema } from './notify-setting.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 通知偏好列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: notifySettingListQuerySchema }),
  notifySettingController.list,
);

// 创建通知偏好
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createNotifySettingSchema }),
  notifySettingController.create,
);

// 批量更新开关（固定路径，在 /:id 之前）
router.put(
  '/batch',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: batchUpdateNotifySettingSchema }),
  notifySettingController.batchUpdate,
);

// 通知偏好详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  notifySettingController.getDetail,
);

// 更新通知偏好
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateNotifySettingSchema }),
  notifySettingController.update,
);

// 删除通知偏好
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  notifySettingController.remove,
);

export default router;
