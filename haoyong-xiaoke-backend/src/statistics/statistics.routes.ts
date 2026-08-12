import { Router } from 'express';
import * as statisticsController from './statistics.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { statisticsQuerySchema, alertQuerySchema, payDaySettingsSchema } from './statistics.validator';

const router = Router();

// 课时趋势
router.get(
  '/lesson-trend',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getLessonTrend,
);

// 收入趋势
router.get(
  '/income-trend',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getIncomeTrend,
);

// 家长端课时趋势
router.get(
  '/parent-trend',
  requireAuth,
  requireRole(['PARENT']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getParentTrend,
);

// 学员课时消耗排行
router.get(
  '/lesson-rank',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getLessonRank,
);

// 收费方式收入排行
router.get(
  '/payment-rank',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getPaymentRank,
);

// 支出比例
router.get(
  '/expense-ratios',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: statisticsQuerySchema }),
  statisticsController.getExpenseRatios,
);

// 预警列表
router.get(
  '/alerts',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: alertQuerySchema }),
  statisticsController.getAlerts,
);

// 洞察列表
router.get(
  '/insights',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  validate({ query: alertQuerySchema }),
  statisticsController.getInsights,
);

// 校区运营数据
router.get(
  '/campus-data/:campusId',
  requireAuth,
  requireRole(['PRINCIPAL']),
  statisticsController.getCampusData,
);

// 发薪日设置
router.get(
  '/pay-day-settings',
  requireAuth,
  requireRole(['PRINCIPAL']),
  statisticsController.getPayDaySettings,
);

router.put(
  '/pay-day-settings',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: payDaySettingsSchema }),
  statisticsController.updatePayDaySettings,
);

export default router;
