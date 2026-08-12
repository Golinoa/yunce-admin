import { Response, NextFunction } from 'express';
import * as lessonRecordService from './lesson-record.service';
import { success, created, noContent, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { lessonRecordListQuerySchema } from './lesson-record.validator';

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lessonRecordService.createLessonRecord(req.user!.id, req.body);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = lessonRecordListQuerySchema.parse(req.query);
    const result = await lessonRecordService.listLessonRecords(
      req.user!.id,
      req.user!.role,
      req.user!.profileId,
      query,
    );
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lessonRecordService.getLessonRecordDetail(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.user!.profileId,
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lessonRecordService.updateLessonRecord(req.params.id, req.user!.id, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await lessonRecordService.deleteLessonRecord(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};

export const getStudentHours = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await lessonRecordService.getStudentHours(
      req.params.id,
      req.user!.id,
      req.user!.role,
      req.user!.profileId,
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 按月份获取
export const getByMonth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { year, month, studentId } = req.query;
    const result = await lessonRecordService.getRecordsByMonth(
      req.user!.id,
      req.user!.role,
      req.user!.profileId,
      Number(year),
      Number(month),
      studentId as string | undefined,
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 按日期范围获取
export const getByRange = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { startDate, endDate, studentId } = req.query;
    const result = await lessonRecordService.getRecordsByRange(
      req.user!.id,
      req.user!.role,
      req.user!.profileId,
      startDate as string,
      endDate as string,
      studentId as string | undefined,
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
};
