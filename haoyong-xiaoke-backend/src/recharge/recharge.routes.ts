import { Router } from 'express';
import * as rechargeController from './recharge.controller';
import { validate } from '../middleware/validate';
import { rechargeListQuerySchema, createRechargeSchema } from './recharge.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';

const router = Router();

/**
 * @swagger
 * /recharges:
 *   get:
 *     summary: 查询课时充值记录列表
 *     tags:
 *       - 课时充值
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: packageId
 *         schema:
 *           type: string
 *       - in: query
 *         name: method
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 返回课时充值记录
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
 *                     list:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           packageId:
 *                             type: string
 *                           hours:
 *                             type: integer
 *                             description: 本次充值课时数
 *                           method:
 *                             type: string
 *                             nullable: true
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *
 *   post:
 *     summary: 新增课时充值记录
 *     tags:
 *       - 课时充值
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - packageId
 *               - hours
 *             properties:
 *               packageId:
 *                 type: string
 *               hours:
 *                 type: integer
 *                 description: 本次新增课时数
 *               method:
 *                 type: string
 *                 description: 课时充值方式
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     packageId:
 *                       type: string
 *                     hours:
 *                       type: integer
 *                       description: 本次充值课时数
 *                     method:
 *                       type: string
 *                       nullable: true
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 */
// 课时充值方式统计（固定路径，在 /:packageId 之前）
router.get(
  '/stats',
  requireAuth,
  requireRole(['PRINCIPAL']),
  rechargeController.stats,
);

/**
 * @swagger
 * /recharges/stats:
 *   get:
 *     summary: 按充值方式统计课时充值
 *     tags:
 *       - 课时充值
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 返回各充值方式对应的充值课时汇总
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       totalHours:
 *                         type: integer
 */
// 课时充值记录列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: rechargeListQuerySchema }),
  rechargeController.list,
);

// 创建课时充值记录
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createRechargeSchema }),
  auditLog('CREATE', 'recharge'),
  rechargeController.create,
);

/**
 * @swagger
 * /recharges/{packageId}:
 *   get:
 *     summary: 查询单个课包的课时充值记录
 *     tags:
 *       - 课时充值
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: packageId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 返回该课包的课时充值记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       packageId:
 *                         type: string
 *                       hours:
 *                         type: integer
 *                         description: 本次充值课时数
 *                       method:
 *                         type: string
 *                         nullable: true
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
// 某课包的课时充值记录
router.get(
  '/:packageId',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  rechargeController.listByPackage,
);

export default router;
