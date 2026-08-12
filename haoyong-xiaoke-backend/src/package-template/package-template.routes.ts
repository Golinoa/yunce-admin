import { Router } from 'express';
import * as templateController from './package-template.controller';
import { validate } from '../middleware/validate';
import { createTemplateSchema, updateTemplateSchema, templateListQuerySchema } from './package-template.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 课包模板列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ query: templateListQuerySchema }),
  templateController.list,
);

// 课包模板详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  templateController.getDetail,
);

// 创建课包模板
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createTemplateSchema }),
  templateController.create,
);

// 更新课包模板
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updateTemplateSchema }),
  templateController.update,
);

// 删除课包模板
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  templateController.remove,
);

export default router;
