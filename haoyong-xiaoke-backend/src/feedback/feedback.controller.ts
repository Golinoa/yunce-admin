import { Response, NextFunction } from 'express';
import * as feedbackService from './feedback.service';
import { created } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await feedbackService.createFeedback(req.user!.profileId!, req.body);
    created(res, result, '反馈提交成功');
  } catch (error) {
    next(error);
  }
};
