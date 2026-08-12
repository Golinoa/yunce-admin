import { Router } from 'express';
import * as lessonRecordController from './lesson-record.controller';
import { validate } from '../middleware/validate';
import { createLessonRecordSchema, updateLessonRecordSchema, lessonRecordListQuerySchema } from './lesson-record.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 消课列表（教师/家长）
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ query: lessonRecordListQuerySchema }),
  lessonRecordController.list,
);

// 按月份获取
router.get(
  '/by-month',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  lessonRecordController.getByMonth,
);

// 按日期范围获取
router.get(
  '/by-range',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  lessonRecordController.getByRange,
);

// 消课详情（教师/家长）
router.get(
  '/:id',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  lessonRecordController.getDetail,
);

// 创建消课（仅教师）
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createLessonRecordSchema }),
  lessonRecordController.create,
);

// 更新消课（仅教师）
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updateLessonRecordSchema }),
  lessonRecordController.update,
);

// 删除消课（仅教师）
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  lessonRecordController.remove,
);

export default router;
