import { Response, NextFunction } from 'express';
import * as teacherService from './teacher.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import {
  teacherListQuerySchema,
  CreateTeacherInput,
  UpdateTeacherInput,
  ResignInput,
  BatchConfirmInput,
  ExecutePayInput,
  AddDeductionInput,
  CreateSalaryModelInput,
  UpdateSalaryModelInput,
  SalarySettingsInput,
  CreateSalaryRecordInput,
} from './teacher.validator';

// ==================== 教师管理 ====================

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = teacherListQuerySchema.parse(req.query);
    const result = await teacherService.listTeachers(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.getTeacherDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.createTeacher(req.body as CreateTeacherInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.updateTeacher(req.params.id, req.body as UpdateTeacherInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const resign = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.resignTeacher(req.params.id, req.body as ResignInput);
    success(res, result, '教师已离职');
  } catch (error) {
    next(error);
  }
};

// ==================== 薪资管理 ====================

export const confirmSalary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.confirmSalary(req.params.id);
    success(res, result, '薪资已确认');
  } catch (error) {
    next(error);
  }
};

export const batchConfirm = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.batchConfirmSalary(req.body as BatchConfirmInput);
    success(res, result, `成功确认 ${result.confirmedCount} 条记录`);
  } catch (error) {
    next(error);
  }
};

export const executePay = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.executePay(req.body as ExecutePayInput);
    success(res, result, `成功发放 ${result.paidCount} 条薪资`);
  } catch (error) {
    next(error);
  }
};

export const addDeduction = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.addDeduction(req.params.id, req.body as AddDeductionInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== 薪资模型 ====================

export const listSalaryModels = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.listSalaryModels();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const createSalaryModel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.createSalaryModel(req.body as CreateSalaryModelInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateSalaryModel = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.updateSalaryModel(req.params.id, req.body as UpdateSalaryModelInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// ==================== 发薪设置 ====================

export const getSalarySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.getSalarySettings();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateSalarySettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.updateSalarySettings(req.body as SalarySettingsInput);
    success(res, result, '设置已更新');
  } catch (error) {
    next(error);
  }
};

// ==================== 创建薪资记录 ====================

export const createSalaryRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await teacherService.createSalaryRecord(req.body as CreateSalaryRecordInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};
