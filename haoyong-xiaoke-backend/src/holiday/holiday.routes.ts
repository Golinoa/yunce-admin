import { Router } from 'express';
import * as holidayController from './holiday.controller';
import { validate } from '../middleware/validate';
import { createHolidaySchema, updateHolidaySchema, holidayListQuerySchema } from './holiday.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// 检查某日是否为节假日（固定路径，必须在 /:id 之前）
router.get(
  '/check',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({
    query: z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
    }),
  }),
  holidayController.check,
);

// 节假日列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: holidayListQuerySchema }),
  holidayController.list,
);

// 创建节假日
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createHolidaySchema }),
  holidayController.create,
);

// 节假日详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  holidayController.getDetail,
);

// 更新节假日
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateHolidaySchema }),
  holidayController.update,
);

// 删除节假日
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  holidayController.remove,
);

export default router;
