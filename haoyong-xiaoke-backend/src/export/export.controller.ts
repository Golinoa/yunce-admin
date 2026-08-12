import { Response, NextFunction } from 'express';
import * as exportService from './export.service';
import { AuthRequest } from '../middleware/auth';
import { exportQuerySchema } from './export.validator';

// 导出学生名册
export const exportStudents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = exportQuerySchema.parse(req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=students.xlsx');
    await exportService.exportStudents(res, req.user!.id, req.user!.role, query);
  } catch (error) {
    next(error);
  }
};

// 导出消课记录
export const exportLessonRecords = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = exportQuerySchema.parse(req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=lesson-records.xlsx');
    await exportService.exportLessonRecords(res, req.user!.id, req.user!.role, query);
  } catch (error) {
    next(error);
  }
};

// 导出薪资明细
export const exportSalary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = exportQuerySchema.parse(req.query);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=salary.xlsx');
    await exportService.exportSalary(res, req.user!.id, req.user!.role, query);
  } catch (error) {
    next(error);
  }
};
