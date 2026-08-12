import { Response, NextFunction } from 'express';
import * as homeService from './home.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

// 教师首页聚合数据
export const getTeacherHome = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teacherId = req.user!.id;
    const result = await homeService.getTeacherHome(teacherId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 家长首页聚合数据
export const getParentHome = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const parentId = req.user!.id;
    const result = await homeService.getParentHome(parentId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 未读通知数
export const getUnreadCount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await homeService.getUnreadNotificationCount(req.user!.profileId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const getOperationContent = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await homeService.getOperationContent();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 教师首页统计（按时段）
export const getTeacherStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const period = (req.query.period as string) || 'month';
    const result = await homeService.getTeacherHomeStats(req.user!.id, period);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 教师待办事项
export const getTeacherTodos = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await homeService.getTeacherTodos(req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
