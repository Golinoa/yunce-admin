import { Response, NextFunction } from 'express';
import * as templateService from './package-template.service';
import { success, created, noContent } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { templateListQuerySchema, type CreateTemplateInput, type UpdateTemplateInput } from './package-template.validator';

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = templateListQuerySchema.parse(req.query);
    const result = await templateService.listTemplates(req.user!.id, query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const getDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await templateService.getTemplateDetail(req.params.id, req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await templateService.createTemplate(req.user!.id, req.body as CreateTemplateInput);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const update = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await templateService.updateTemplate(req.params.id, req.user!.id, req.body as UpdateTemplateInput);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const remove = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await templateService.deleteTemplate(req.params.id, req.user!.id);
    noContent(res, '删除成功');
  } catch (error) {
    next(error);
  }
};
