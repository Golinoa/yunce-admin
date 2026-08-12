import { Response, NextFunction } from 'express';
import * as classService from './class.service';
import { success, created, noContent, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { classListQuerySchema } from './class.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = classListQuerySchema.parse(req.query);
    const result = await classService.listClasses(req.user!.id, query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.getClassDetail(req.params.id, req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.createClass(req.user!.id, req.body);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.updateClass(req.params.id, req.user!.id, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.deleteClass(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};

export const listStudents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.listClassStudents(req.params.id, req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const addStudent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.addStudentToClass(req.params.id, req.user!.id, req.body);
    success(res, null, '添加成功');
  } catch (error) {
    next(error);
  }
};

export const removeStudent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.removeStudentFromClass(req.params.id, req.params.studentId, req.user!.id);
    noContent(res, '移除成功');
  } catch (error) {
    next(error);
  }
};

export const checkin = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.checkin(req.params.id, req.user!.id, req.body);
    success(res, result, `签到成功，共创建 ${result.createdCount} 条消课记录`);
  } catch (error) {
    next(error);
  }
};

// 转班
export const transfer = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await classService.transferClass(req.params.id, req.user!.id, req.body);
    success(res, null, '转班成功');
  } catch (error) {
    next(error);
  }
};

// 结束班级
export const endClass = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await classService.endClass(req.params.id, req.user!.id);
    success(res, result, '班级已结束');
  } catch (error) {
    next(error);
  }
};
