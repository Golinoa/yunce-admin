import { Response, NextFunction } from 'express';
import * as campusService from './campus.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { campusListQuerySchema, type CreateCampusInput, type UpdateCampusInput } from './campus.validator';

// 校区列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = campusListQuerySchema.parse(req.query);
    const result = await campusService.listCampuses(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 校区详情
export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await campusService.getCampusDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建校区
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await campusService.createCampus(req.body as CreateCampusInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新校区
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await campusService.updateCampus(req.params.id, req.body as UpdateCampusInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 设为主校区
export const setMain = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await campusService.setMainCampus(req.params.id);
    success(res, result, '已设为主校区');
  } catch (error) {
    next(error);
  }
};

// 删除校区
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await campusService.deleteCampus(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
