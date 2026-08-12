import { Router } from 'express';
import * as campusController from './campus.controller';
import { validate } from '../middleware/validate';
import { createCampusSchema, updateCampusSchema, campusListQuerySchema } from './campus.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 校区列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: campusListQuerySchema }),
  campusController.list,
);

// 校区详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  campusController.getDetail,
);

// 创建校区
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createCampusSchema }),
  campusController.create,
);

// 更新校区
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateCampusSchema }),
  campusController.update,
);

// 设为主校区
router.put(
  '/:id/set-main',
  requireAuth,
  requireRole(['PRINCIPAL']),
  campusController.setMain,
);

// 删除校区
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  campusController.remove,
);

export default router;
