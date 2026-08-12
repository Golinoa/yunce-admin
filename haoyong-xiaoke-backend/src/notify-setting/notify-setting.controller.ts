import { Response, NextFunction } from 'express';
import * as notifySettingService from './notify-setting.service';
import { success, created } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  notifySettingListQuerySchema,
  type CreateNotifySettingInput,
  type UpdateNotifySettingInput,
  type BatchUpdateNotifySettingInput,
} from './notify-setting.validator';

// 通知偏好列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = notifySettingListQuerySchema.parse(req.query);
    const result = await notifySettingService.listNotifySettings(query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 通知偏好详情
export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifySettingService.getNotifySettingDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建通知偏好
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifySettingService.createNotifySetting(req.body as CreateNotifySettingInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新通知偏好
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifySettingService.updateNotifySetting(req.params.id, req.body as UpdateNotifySettingInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除通知偏好
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notifySettingService.deleteNotifySetting(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 批量更新开关
export const batchUpdate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifySettingService.batchUpdateNotifySetting(req.body as BatchUpdateNotifySettingInput);
    success(res, result, '批量更新成功');
  } catch (error) {
    next(error);
  }
};
