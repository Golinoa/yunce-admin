import { Response, NextFunction } from 'express';
import * as leaveService from './leave-request.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { leaveListQuerySchema } from './leave-request.validator';

export const create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leaveService.createLeaveRequest(req.user!.profileId!, req.body);
    created(res, result, '请假申请已提交');
  } catch (error) {
    next(error);
  }
};

export const list = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = leaveListQuerySchema.parse(req.query);
    const result = await leaveService.listLeaveRequests(
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

export const approve = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leaveService.approveLeaveRequest(req.user!.id, req.params.id, req.body);
    success(res, result, '审批成功');
  } catch (error) {
    next(error);
  }
};
