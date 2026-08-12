import { Response, NextFunction } from 'express';
import * as packageService from './course-package.service';
import { success, created, noContent, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  packageListQuerySchema,
  activePackageQuerySchema,
  bestMatchQuerySchema,
} from './course-package.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = packageListQuerySchema.parse(req.query);
    const result = await packageService.listPackages(req.user!.id, query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await packageService.createPackage(req.user!.id, req.body);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await packageService.updatePackage(req.params.id, req.user!.id, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await packageService.deletePackage(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 扣减课时
export const deductHours = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await packageService.deductHours(req.params.id, req.body.hours, req.user!.id);
    success(res, result, '课时扣减成功');
  } catch (error) {
    next(error);
  }
};

// 获取活跃课包
export const getActive = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = activePackageQuerySchema.parse(req.query);
    const result = await packageService.getActivePackages(req.user!.id, query.studentId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 课时充值
export const recharge = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await packageService.rechargePackage(req.params.id, req.user!.id, req.body);
    success(res, result, '课时充值成功');
  } catch (error) {
    next(error);
  }
};

// 自动匹配最优课包
export const bestMatch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = bestMatchQuerySchema.parse(req.query);
    const result = await packageService.findBestMatch(req.user!.id, query.studentId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 批量更新课包状态
export const batchUpdateStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await packageService.batchUpdateStatus(req.user!.id, req.body.ids, req.body.status);
    success(res, result, '批量更新成功');
  } catch (error) {
    next(error);
  }
};
