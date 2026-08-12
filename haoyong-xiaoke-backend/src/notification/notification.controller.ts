import { Response, NextFunction } from 'express';
import * as notifService from './notification.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { notificationListQuerySchema } from './notification.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = notificationListQuerySchema.parse(req.query);
    const result = await notifService.listNotifications(req.user!.profileId!, query);
    success(res, {
      list: result.list,
      pagination: result.pagination,
      unreadCount: result.unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

export const send = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifService.sendNotification(req.user!.profileId!, req.body);
    success(res, result, '通知发送成功');
  } catch (error) {
    next(error);
  }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await notifService.markAsRead(req.params.id, req.user!.profileId!);
    success(res, null, '已标记为已读');
  } catch (error) {
    next(error);
  }
};

export const batchMarkRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifService.batchMarkAsRead(req.body.ids, req.user!.profileId!);
    success(res, result, '批量标记已读成功');
  } catch (error) {
    next(error);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifService.markAllAsRead(req.user!.profileId!);
    success(res, result, '全部标记已读成功');
  } catch (error) {
    next(error);
  }
};

export const batchDelete = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await notifService.batchDelete(req.body.ids, req.user!.profileId!);
    success(res, result, '批量删除成功');
  } catch (error) {
    next(error);
  }
};
