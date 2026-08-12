import { Response, NextFunction } from 'express';
import * as followRecordService from './follow-record.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import {
  followRecordListQuerySchema,
  createFollowRecordSchema,
  updateFollowRecordSchema,
} from './follow-record.validator';

// 跟进记录列表
export const listFollowRecords = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = followRecordListQuerySchema.parse(req.query);
    const result = await followRecordService.listFollowRecords(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 根据学员获取跟进记录
export const getFollowRecordsByStudent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await followRecordService.getFollowRecordsByStudent(req.params.studentId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 跟进记录详情
export const getFollowRecordDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await followRecordService.getFollowRecordDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建跟进记录
export const createFollowRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createFollowRecordSchema.parse(req.body);
    // 从认证用户获取教师ID
    const teacher = await prisma.teacher.findFirst({
      where: { profileId: req.user!.profileId },
    });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await followRecordService.createFollowRecord(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新跟进记录
export const updateFollowRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateFollowRecordSchema.parse(req.body);
    const result = await followRecordService.updateFollowRecord(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除跟进记录
export const deleteFollowRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await followRecordService.deleteFollowRecord(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
