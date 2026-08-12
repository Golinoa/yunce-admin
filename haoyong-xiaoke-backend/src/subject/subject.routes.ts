import { Router } from 'express';
import * as subjectController from './subject.controller';
import { validate } from '../middleware/validate';
import { createSubjectSchema, updateSubjectSchema } from './subject.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 科目列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  subjectController.list,
);

// 科目详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  subjectController.getDetail,
);

// 创建科目
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createSubjectSchema }),
  subjectController.create,
);

// 更新科目
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateSubjectSchema }),
  subjectController.update,
);

// 删除科目
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  subjectController.remove,
);

export default router;
