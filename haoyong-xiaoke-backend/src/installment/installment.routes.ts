import { Router } from 'express';
import * as installmentController from './installment.controller';
import { validate } from '../middleware/validate';
import {
  createInstallmentSchema,
  updateInstallmentSchema,
  payInstallmentSchema,
  installmentListQuerySchema,
  dueSoonQuerySchema,
} from './installment.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

// 即将到期的分期（固定路径，在 /:id 之前）
router.get(
  '/due-soon',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: dueSoonQuerySchema }),
  installmentController.dueSoon,
);

// 分期列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: installmentListQuerySchema }),
  installmentController.list,
);

// 创建分期计划
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createInstallmentSchema }),
  auditLog('CREATE', 'installment'),
  installmentController.createPlan,
);

// 某课包的分期计划
router.get(
  '/package/:packageId',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  installmentController.listByPackage,
);

// 删除某课包的分期计划
router.delete(
  '/package/:packageId',
  requireAuth,
  requireRole(['PRINCIPAL']),
  auditLog('DELETE', 'installment'),
  installmentController.deleteByPackage,
);

// 更新单期信息
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateInstallmentSchema }),
  auditLog('UPDATE', 'installment'),
  installmentController.update,
);

// 确认收款
router.put(
  '/:id/pay',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: payInstallmentSchema }),
  auditLog('PAY', 'installment'),
  installmentController.pay,
);

// 取消收款
router.put(
  '/:id/unpay',
  requireAuth,
  requireRole(['PRINCIPAL']),
  auditLog('UNPAY', 'installment'),
  installmentController.unpay,
);

// 删除单期
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  auditLog('DELETE', 'installment'),
  installmentController.remove,
);

export default router;
