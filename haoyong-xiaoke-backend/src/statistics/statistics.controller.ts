import { Response, NextFunction } from 'express';
import * as statisticsService from './statistics.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { statisticsQuerySchema, alertQuerySchema } from './statistics.validator';

// 课时趋势
export const getLessonTrend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getLessonTrend(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 收入趋势
export const getIncomeTrend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getIncomeTrend(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 家长端课时趋势
export const getParentTrend = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getParentTrend(req.user!.profileId, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 学员课时消耗排行
export const getLessonRank = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getLessonRank(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 收费方式收入排行
export const getPaymentRank = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getPaymentRank(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 支出比例
export const getExpenseRatios = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = statisticsQuerySchema.parse(req.query);
    const result = await statisticsService.getExpenseRatios(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 预警列表
export const getAlerts = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = alertQuerySchema.parse(req.query);
    const result = await statisticsService.getAlerts(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 洞察列表
export const getInsights = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = alertQuerySchema.parse(req.query);
    const result = await statisticsService.getInsights(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 校区运营数据
export const getCampusData = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await statisticsService.getCampusData(req.params.campusId);
    if (!result) {
      res.status(404).json({ code: 404, data: null, message: '校区不存在' });
      return;
    }
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 获取发薪日设置
export const getPayDaySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await statisticsService.getPayDaySettings();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新发薪日设置
export const updatePayDaySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await statisticsService.updatePayDaySettings(req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
