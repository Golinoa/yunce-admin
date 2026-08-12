import { Response, NextFunction } from 'express';
import * as rechargeService from './recharge.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { rechargeListQuerySchema, type CreateRechargeInput } from './recharge.validator';

// 课时充值记录列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = rechargeListQuerySchema.parse(req.query);
    const result = await rechargeService.listRecharges(req.user!.id, req.user!.role, query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 某课包的课时充值记录
export const listByPackage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await rechargeService.listRechargesByPackage(req.params.packageId, req.user!.id, req.user!.role);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建课时充值记录
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await rechargeService.createRecharge(req.user!.id, req.user!.role, req.body as CreateRechargeInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 课时充值方式统计
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await rechargeService.getRechargeStats(req.user!.id, req.user!.role);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
