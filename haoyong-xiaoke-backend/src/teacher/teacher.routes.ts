import { Router } from 'express';
import * as teacherController from './teacher.controller';
import { validate } from '../middleware/validate';
import {
  createTeacherSchema,
  updateTeacherSchema,
  teacherListQuerySchema,
  resignSchema,
  batchConfirmSchema,
  executePaySchema,
  addDeductionSchema,
  createSalaryModelSchema,
  updateSalaryModelSchema,
  salarySettingsSchema,
  createSalaryRecordSchema,
} from './teacher.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==================== 教师管理 ====================

// 教师列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ query: teacherListQuerySchema }),
  teacherController.list,
);

// 创建教师
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createTeacherSchema }),
  teacherController.create,
);

// ==================== 薪资模型（固定路径，必须在 /:id 之前） ====================

// 薪资模型列表
router.get(
  '/salary-models',
  requireAuth,
  requireRole(['PRINCIPAL']),
  teacherController.listSalaryModels,
);

// 创建薪资模型
router.post(
  '/salary-models',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createSalaryModelSchema }),
  teacherController.createSalaryModel,
);

// 更新薪资模型
router.put(
  '/salary-models/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateSalaryModelSchema }),
  teacherController.updateSalaryModel,
);

// ==================== 发薪设置（固定路径，必须在 /:id 之前） ====================

// 获取发薪设置
router.get(
  '/salary-settings',
  requireAuth,
  requireRole(['PRINCIPAL']),
  teacherController.getSalarySettings,
);

// 更新发薪设置
router.put(
  '/salary-settings',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: salarySettingsSchema }),
  teacherController.updateSalarySettings,
);

// ==================== 薪资管理 ====================

// 创建薪资记录（固定路径，必须在 /salary/:id 之前）
router.post(
  '/salary',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createSalaryRecordSchema }),
  teacherController.createSalaryRecord,
);

// 批量确认薪资（固定路径，必须在 /salary/:id 之前）
router.post(
  '/salary/batch-confirm',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: batchConfirmSchema }),
  teacherController.batchConfirm,
);

// 发放薪资（固定路径，必须在 /salary/:id 之前）
router.post(
  '/salary/execute-pay',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: executePaySchema }),
  teacherController.executePay,
);

// 确认薪资（单条）
router.post(
  '/salary/:id/confirm',
  requireAuth,
  requireRole(['PRINCIPAL']),
  teacherController.confirmSalary,
);

// ==================== 教师详情/更新/操作（参数路由放最后） ====================

// 教师详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  teacherController.getDetail,
);

// 更新教师
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateTeacherSchema }),
  teacherController.update,
);

// 教师离职
router.post(
  '/:id/resign',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: resignSchema }),
  teacherController.resign,
);

// 添加扣款/补发
router.post(
  '/:id/deductions',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: addDeductionSchema }),
  teacherController.addDeduction,
);

export default router;
