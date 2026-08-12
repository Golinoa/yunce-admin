import { Router } from 'express';
import * as packageController from './course-package.controller';
import { validate } from '../middleware/validate';
import { createPackageSchema, updatePackageSchema, packageListQuerySchema, deductHoursSchema, rechargeSchema, batchUpdateStatusSchema } from './course-package.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

// 获取活跃课包
router.get(
  '/active',
  requireAuth,
  requireRole(['TEACHER']),
  packageController.getActive,
);

// 自动匹配最优课包
router.get(
  '/best-match',
  requireAuth,
  requireRole(['TEACHER']),
  packageController.bestMatch,
);

// 套餐列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ query: packageListQuerySchema }),
  packageController.list,
);

// 创建套餐
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createPackageSchema }),
  auditLog('CREATE', 'coursePackage'),
  packageController.create,
);

// 批量更新状态（固定路径在 /:id 之前）
router.put(
  '/batch-status',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: batchUpdateStatusSchema }),
  packageController.batchUpdateStatus,
);

// 更新套餐
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updatePackageSchema }),
  auditLog('UPDATE', 'coursePackage'),
  packageController.update,
);

// 删除套餐
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  auditLog('DELETE', 'coursePackage'),
  packageController.remove,
);

// 扣减课时
router.post(
  '/:id/deduct',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: deductHoursSchema }),
  auditLog('DEDUCT', 'coursePackage'),
  packageController.deductHours,
);

// 课时充值
/**
 * @swagger
 * /course-packages/{id}/recharge:
 *   post:
 *     summary: 给课包充值课时
 *     tags:
 *       - 课包管理
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - hours
 *             properties:
 *               hours:
 *                 type: integer
 *                 description: 本次新增课时数
 *               method:
 *                 type: string
 *                 description: 课时充值方式
 *     responses:
 *       200:
 *         description: 课时充值成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     totalHours:
 *                       type: integer
 *                     usedHours:
 *                       type: integer
 *                     remainingHours:
 *                       type: integer
 *                     status:
 *                       type: string
 */
router.post(
  '/:id/recharge',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: rechargeSchema }),
  auditLog('RECHARGE', 'coursePackage'),
  packageController.recharge,
);

export default router;
