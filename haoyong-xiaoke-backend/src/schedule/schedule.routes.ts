import { Router } from 'express';
import * as scheduleController from './schedule.controller';
import { validate } from '../middleware/validate';
import { createScheduleSchema, updateScheduleSchema, scheduleListQuerySchema, todayScheduleQuerySchema, weekScheduleQuerySchema, batchCreateScheduleSchema } from './schedule.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 排课列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ query: scheduleListQuerySchema }),
  scheduleController.list,
);

// 今日课表
router.get(
  '/today',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: todayScheduleQuerySchema }),
  scheduleController.todaySchedule,
);

// 周课表
router.get(
  '/week',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: weekScheduleQuerySchema }),
  scheduleController.weekSchedule,
);

// 检查冲突
router.get(
  '/check-conflict',
  requireAuth,
  requireRole(['TEACHER']),
  scheduleController.checkConflict,
);

// 批量排课
router.post(
  '/batch',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: batchCreateScheduleSchema }),
  scheduleController.batchCreate,
);

// 排课详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  scheduleController.getDetail,
);

// 创建排课
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createScheduleSchema }),
  scheduleController.create,
);

// 更新排课
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updateScheduleSchema }),
  scheduleController.update,
);

// 删除排课
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  scheduleController.remove,
);

export default router;
