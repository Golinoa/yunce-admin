import { Response, NextFunction } from 'express';
import * as subjectService from './subject.service';
import { success, created } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import type { CreateSubjectInput, UpdateSubjectInput } from './subject.validator';

// 科目列表
export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await subjectService.listSubjects();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 科目详情
export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await subjectService.getSubjectDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建科目
export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await subjectService.createSubject(req.body as CreateSubjectInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新科目
export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await subjectService.updateSubject(req.params.id, req.body as UpdateSubjectInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除科目
export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await subjectService.deleteSubject(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
