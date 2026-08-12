import { Router } from 'express';
import * as exportController from './export.controller';
import { validate } from '../middleware/validate';
import { exportQuerySchema } from './export.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { exportRateLimit } from '../middleware/rate-limit';

const router = Router();

// 导出学生名册
router.get(
  '/students',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  exportRateLimit,
  validate({ query: exportQuerySchema }),
  exportController.exportStudents,
);

// 导出消课记录
router.get(
  '/lesson-records',
  requireAuth,
  requireRole(['TEACHER', 'PRINCIPAL']),
  exportRateLimit,
  validate({ query: exportQuerySchema }),
  exportController.exportLessonRecords,
);

// 导出薪资明细（仅校长）
router.get(
  '/salary',
  requireAuth,
  requireRole(['PRINCIPAL']),
  exportRateLimit,
  validate({ query: exportQuerySchema }),
  exportController.exportSalary,
);

export default router;
