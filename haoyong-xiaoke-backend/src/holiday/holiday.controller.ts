import { Response, NextFunction } from 'express';
import * as holidayService from './holiday.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  holidayListQuerySchema,
  holidayCheckQuerySchema,
  type CreateHolidayInput,
  type UpdateHolidayInput,
} from './holiday.validator';

// 节假日列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = holidayListQuerySchema.parse(req.query);
    const result = await holidayService.listHolidays(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 节假日详情
export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await holidayService.getHolidayDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建节假日
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await holidayService.createHoliday(req.body as CreateHolidayInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新节假日
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await holidayService.updateHoliday(req.params.id, req.body as UpdateHolidayInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除节假日
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await holidayService.deleteHoliday(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 检查某日是否为节假日
export const check = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = holidayCheckQuerySchema.parse(req.query);
    const result = await holidayService.checkHoliday(query.date);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
