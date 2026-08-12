import { Router } from 'express';
import * as classController from './class.controller';
import { validate } from '../middleware/validate';
import { createClassSchema, updateClassSchema, classListQuerySchema, addStudentSchema, checkinSchema } from './class.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 班级列表
router.get(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ query: classListQuerySchema }),
  classController.list,
);

// 班级详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  classController.getDetail,
);

// 创建班级
router.post(
  '/',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: createClassSchema }),
  classController.create,
);

// 更新班级
router.put(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: updateClassSchema }),
  classController.update,
);

// 删除班级（软删除）
router.delete(
  '/:id',
  requireAuth,
  requireRole(['TEACHER']),
  classController.remove,
);

// 班级学生列表
router.get(
  '/:id/students',
  requireAuth,
  requireRole(['TEACHER']),
  classController.listStudents,
);

// 添加学生到班级
router.post(
  '/:id/students',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: addStudentSchema }),
  classController.addStudent,
);

// 移除班级学生
router.delete(
  '/:id/students/:studentId',
  requireAuth,
  requireRole(['TEACHER']),
  classController.removeStudent,
);

// 班级签到
router.post(
  '/:id/checkin',
  requireAuth,
  requireRole(['TEACHER']),
  validate({ body: checkinSchema }),
  classController.checkin,
);

// 转班
router.post(
  '/:id/transfer',
  requireAuth,
  requireRole(['TEACHER']),
  classController.transfer,
);

// 结束班级
router.post(
  '/:id/end',
  requireAuth,
  requireRole(['TEACHER']),
  classController.endClass,
);

export default router;
