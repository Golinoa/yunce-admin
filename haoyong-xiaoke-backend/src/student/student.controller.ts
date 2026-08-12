import { Response, NextFunction } from 'express';
import * as studentService from './student.service';
import { success, created, noContent, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { studentListQuerySchema, studentDuplicateQuerySchema } from './student.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = studentListQuerySchema.parse(req.query);
    const result = await studentService.listStudents(
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
    const result = await studentService.getStudentDetail(
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

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.createStudent(req.user!.id, req.body);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.updateStudent(req.params.id, req.user!.id, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await studentService.deleteStudent(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};

export const bindParent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.bindParent(req.params.id, req.user!.id, req.body);
    success(res, result, '绑定邀请已发送');
  } catch (error) {
    next(error);
  }
};

export const listParents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.listParents(
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

// 重名检测
export const checkDuplicate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = studentDuplicateQuerySchema.parse(req.query);
    const result = await studentService.checkDuplicate(
      req.user!.id,
      query.name,
      query.excludeId,
    );
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 通过邀请码查找学员
export const findByInviteCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.findByInviteCode(req.params.code);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 解绑家长
export const unbindParent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await studentService.unbindParent(
      req.params.id,
      req.params.bindingId,
      req.user!.id,
    );
    noContent(res, '解绑成功');
  } catch (error) {
    next(error);
  }
};

// 学生统计
export const stats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await studentService.getStudentStats(req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
