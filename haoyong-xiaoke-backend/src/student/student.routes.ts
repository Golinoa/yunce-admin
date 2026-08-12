import { Router } from 'express';
import * as studentController from './student.controller';
import { validate } from '../middleware/validate';
import { createStudentSchema, updateStudentSchema, bindParentSchema, studentListQuerySchema } from './student.validator';
import { requireAuth, requireRole } from '../middleware/auth';
import { auditLog } from '../middleware/audit';
import * as lessonRecordController from '../lesson-record/lesson-record.controller';

const router = Router();

// 学生列表（教师/家长）
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  validate({ query: studentListQuerySchema }),
  studentController.list,
);

// 重名检测（仅教师）- 必须在 /:id 之前定义
router.get(
  '/check-duplicate',
  requireAuth,
  requireRole(['TEACHER']),
  studentController.checkDuplicate,
);

// 学生统计（仅教师）- 必须在 /:id 之前定义
router.get(
  '/stats',
  requireAuth,
  requireRole(['TEACHER']),
  studentController.stats,
);

// 通过邀请码查找学员 - 必须在 /:id 之前定义
router.get(
  '/by-invite-code/:code',
  requireAuth,
  studentController.findByInviteCode,
);

// 学生详情（教师/家长）
router.get(
  '/:id',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  studentController.getDetail,
);

// 创建学生（仅教师）
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createStudentSchema }),
  auditLog('CREATE', 'student'),
  studentController.create,
);

// 更新学生（仅教师）
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updateStudentSchema }),
  auditLog('UPDATE', 'student'),
  studentController.update,
);

// 删除学生（仅教师，软删除）
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  auditLog('DELETE', 'student'),
  studentController.remove,
);

// 绑定家长（仅教师）
router.post(
  '/:id/bind-parent',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: bindParentSchema }),
  studentController.bindParent,
);

// 家长列表（教师/家长）
router.get(
  '/:id/parents',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  studentController.listParents,
);

// 学生课时统计（教师/家长）
router.get(
  '/:id/hours',
  requireAuth,
  requireRole(['TEACHER', 'PARENT']),
  lessonRecordController.getStudentHours,
);

// 解绑家长（仅教师）
router.delete(
  '/:id/parents/:bindingId',
  requireAuth,
  requireRole(['TEACHER']),
  studentController.unbindParent,
);

export default router;
