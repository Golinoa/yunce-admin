import { Response, NextFunction } from 'express';
import * as profileService from './profile.service';
import { success } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await profileService.getProfile(req.user!.profileId, req.user!.role);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await profileService.updateProfile(req.user!.profileId, req.user!.role, req.body);
    success(res, result);
  } catch (error) {
    next(error);
  }
};
