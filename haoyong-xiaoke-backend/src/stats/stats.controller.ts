import { Response, NextFunction } from 'express';
import * as statsService from './stats.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const getTeacherStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await statsService.getTeacherStats(req.user!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const getStudentStats = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await statsService.getStudentStats(
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
