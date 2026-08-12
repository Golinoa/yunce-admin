import { Response, NextFunction } from 'express';
import * as scheduleService from './schedule.service';
import { success, created, noContent, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  scheduleListQuerySchema,
  scheduleConflictQuerySchema,
  todayScheduleQuerySchema,
  weekScheduleQuerySchema,
  type BatchCreateScheduleInput,
} from './schedule.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = scheduleListQuerySchema.parse(req.query);
    const result = await scheduleService.listSchedules(req.user!.id, query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await scheduleService.createSchedule(req.user!.id, req.body);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await scheduleService.updateSchedule(req.params.id, req.user!.id, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await scheduleService.deleteSchedule(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 排课详情
export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await scheduleService.getScheduleDetail(req.params.id, req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 检查冲突
export const checkConflict = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = scheduleConflictQuerySchema.parse(req.query);
    const result = await scheduleService.checkConflict(req.user!.id, {
      dayOfWeek: query.dayOfWeek,
      startTime: query.startTime,
      endTime: query.endTime,
      excludeScheduleId: query.excludeScheduleId,
    });
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 今日课表
export const todaySchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = todayScheduleQuerySchema.parse(req.query);
    const result = await scheduleService.getTodaySchedule(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 周课表
export const weekSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = weekScheduleQuerySchema.parse(req.query);
    const result = await scheduleService.getWeekSchedule(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 批量排课
export const batchCreate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await scheduleService.batchCreateSchedules(req.user!.id, req.body as BatchCreateScheduleInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};
