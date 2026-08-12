import { Router } from 'express';
import * as attendanceController from './attendance.controller';
import { validate } from '../middleware/validate';
import {
  attendanceListQuerySchema,
  createAttendanceSchema,
  updateAttendanceSchema,
  attendanceStatsQuerySchema,
  salaryTemplateListQuerySchema,
  createSalaryTemplateSchema,
  updateSalaryTemplateSchema,
  temporaryRescheduleListQuerySchema,
  createTemporaryRescheduleSchema,
  batchRescheduleSchema,
} from './attendance.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==================== Attendance (考勤) ====================

// 考勤列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: attendanceListQuerySchema }),
  attendanceController.listAttendances,
);

// 记录考勤
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createAttendanceSchema }),
  attendanceController.createAttendance,
);

// 更新考勤
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateAttendanceSchema }),
  attendanceController.updateAttendance,
);

// 删除考勤
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  attendanceController.deleteAttendance,
);

// 考勤统计
router.get(
  '/stats',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: attendanceStatsQuerySchema }),
  attendanceController.getAttendanceStats,
);

// ==================== SalaryTemplate (薪资模板) ====================

// 薪资模板列表
router.get(
  '/salary-templates',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: salaryTemplateListQuerySchema }),
  attendanceController.listSalaryTemplates,
);

// 创建薪资模板
router.post(
  '/salary-templates',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createSalaryTemplateSchema }),
  attendanceController.createSalaryTemplate,
);

// 更新薪资模板
router.put(
  '/salary-templates/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateSalaryTemplateSchema }),
  attendanceController.updateSalaryTemplate,
);

// 删除薪资模板
router.delete(
  '/salary-templates/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  attendanceController.deleteSalaryTemplate,
);

// ==================== TemporaryReschedule (临时调课) ====================

// 临时调课列表
router.get(
  '/reschedules',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: temporaryRescheduleListQuerySchema }),
  attendanceController.listTemporaryReschedules,
);

// 创建临时调课
router.post(
  '/reschedules',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createTemporaryRescheduleSchema }),
  attendanceController.createTemporaryReschedule,
);

// 审批调课
router.post(
  '/reschedules/:id/approve',
  requireAuth,
  requireRole(['PRINCIPAL']),
  attendanceController.approveTemporaryReschedule,
);

// 拒绝调课
router.post(
  '/reschedules/:id/reject',
  requireAuth,
  requireRole(['PRINCIPAL']),
  attendanceController.rejectTemporaryReschedule,
);

// 批量调课
router.post(
  '/reschedules/batch',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: batchRescheduleSchema }),
  attendanceController.createBatchReschedule,
);

// 批量确认
router.post(
  '/reschedules/batch/:batchNo/confirm',
  requireAuth,
  requireRole(['PRINCIPAL']),
  attendanceController.confirmBatchReschedule,
);

export default router;
