import { Response, NextFunction } from 'express';
import * as installmentService from './installment.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  installmentListQuerySchema,
  dueSoonQuerySchema,
  CreateInstallmentInput,
  UpdateInstallmentInput,
  PayInstallmentInput,
} from './installment.validator';

// 创建分期计划
export const createPlan = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.createInstallmentPlan(req.user!.id, req.user!.role, req.body as CreateInstallmentInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 分期列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = installmentListQuerySchema.parse(req.query);
    const result = await installmentService.listInstallments(req.user!.id, req.user!.role, query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 某课包的分期计划
export const listByPackage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.listByPackage(req.params.packageId, req.user!.id, req.user!.role);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新单期信息
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.updateInstallment(req.params.id, req.user!.id, req.user!.role, req.body as UpdateInstallmentInput);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 确认收款
export const pay = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.payInstallment(req.params.id, req.user!.id, req.user!.role, req.body as PayInstallmentInput);
    success(res, result, '收款确认成功');
  } catch (error) {
    next(error);
  }
};

// 取消收款
export const unpay = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.unpayInstallment(req.params.id, req.user!.id, req.user!.role);
    success(res, result, '已取消收款标记');
  } catch (error) {
    next(error);
  }
};

// 即将到期
export const dueSoon = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = dueSoonQuerySchema.parse(req.query);
    const result = await installmentService.listDueSoon(req.user!.id, req.user!.role, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 删除某课包的分期计划
export const deleteByPackage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.deleteByPackage(req.params.packageId, req.user!.id, req.user!.role);
    success(res, result, '分期计划已删除');
  } catch (error) {
    next(error);
  }
};

// 删除单期
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await installmentService.deleteInstallment(req.params.id, req.user!.id, req.user!.role);
    success(res, result, '删除成功');
  } catch (error) {
    next(error);
  }
};
