import { Router } from 'express';
import * as followRecordController from './follow-record.controller';
import { validate } from '../middleware/validate';
import {
  followRecordListQuerySchema,
  createFollowRecordSchema,
  updateFollowRecordSchema,
} from './follow-record.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 跟进记录列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: followRecordListQuerySchema }),
  followRecordController.listFollowRecords,
);

// 跟进记录详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  followRecordController.getFollowRecordDetail,
);

// 创建跟进记录
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createFollowRecordSchema }),
  followRecordController.createFollowRecord,
);

// 更新跟进记录
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateFollowRecordSchema }),
  followRecordController.updateFollowRecord,
);

// 删除跟进记录
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  followRecordController.deleteFollowRecord,
);

export default router;
