import { Response, NextFunction } from 'express';
import * as attendanceService from './attendance.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
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

// ==================== Attendance ====================

export const listAttendances = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = attendanceListQuerySchema.parse(req.query);
    const result = await attendanceService.listAttendances(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const createAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createAttendanceSchema.parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await attendanceService.createAttendance(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateAttendanceSchema.parse(req.body);
    const result = await attendanceService.updateAttendance(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await attendanceService.deleteAttendance(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

export const getAttendanceStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = attendanceStatsQuerySchema.parse(req.query);
    const result = await attendanceService.getAttendanceStats(query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== SalaryTemplate ====================

export const listSalaryTemplates = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = salaryTemplateListQuerySchema.parse(req.query);
    const result = await attendanceService.listSalaryTemplates(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const createSalaryTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createSalaryTemplateSchema.parse(req.body);
    const result = await attendanceService.createSalaryTemplate(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateSalaryTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateSalaryTemplateSchema.parse(req.body);
    const result = await attendanceService.updateSalaryTemplate(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const deleteSalaryTemplate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await attendanceService.deleteSalaryTemplate(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== TemporaryReschedule ====================

export const listTemporaryReschedules = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = temporaryRescheduleListQuerySchema.parse(req.query);
    const result = await attendanceService.listTemporaryReschedules(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const createTemporaryReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createTemporaryRescheduleSchema.parse(req.body);
    const result = await attendanceService.createTemporaryReschedule(input, req.user!.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const approveTemporaryReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await attendanceService.approveTemporaryReschedule(req.params.id, req.user!.id);
    success(res, result, '审批通过');
  } catch (error) {
    next(error);
  }
};

export const rejectTemporaryReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await attendanceService.rejectTemporaryReschedule(req.params.id, req.user!.id);
    success(res, result, '已拒绝');
  } catch (error) {
    next(error);
  }
};

export const createBatchReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = batchRescheduleSchema.parse(req.body);
    const result = await attendanceService.createBatchReschedule(input, req.user!.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const confirmBatchReschedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await attendanceService.confirmBatchReschedule(req.params.batchNo, req.user!.id);
    success(res, result, '批量调课已确认');
  } catch (error) {
    next(error);
  }
};
