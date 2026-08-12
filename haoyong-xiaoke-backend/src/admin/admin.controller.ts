import { NextFunction, Response } from 'express';
import { created, paginated, success } from '../utils/response';
import type { AdminAuthRequest } from '../middleware/adminAuth';
import * as adminService from './admin.service';
import {
  auditLogListQuerySchema,
  activationCodeListQuerySchema,
  batchDeleteActivationCodesSchema,
  batchCreateActivationCodesSchema,
  createActivitySchema,
  createBannerSchema,
  createMembershipPlanSchema,
  dashboardQuerySchema,
  feedbackListQuerySchema,
  grantMembershipSchema,
  idParamSchema,
  inviteListQuerySchema,
  inviteRuleParamSchema,
  inviteRuleSchema,
  loginSchema,
  membershipGrantListQuerySchema,
  pointAdjustSchema,
  pointRecordListQuerySchema,
  updateFeedbackHandleSchema,
  updateActivitySchema,
  updateBannerSchema,
  updateMembershipPlanSchema,
  userListQuerySchema,
} from './admin.validator';

export const login = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = loginSchema.parse(req.body);
    const result = await adminService.loginAdminAsync(input);
    success(res, result, '登录成功');
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await adminService.logoutAdminAsync(req.adminUser!.sessionId);
    success(res, null, '退出成功');
  } catch (error) {
    next(error);
  }
};

export const profile = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.getAdminProfileAsync(req.adminUser!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const userInfo = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.getAdminUserInfoAsync(req.adminUser!.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const accessCodes = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.getAdminAccessCodesAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const menus = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.getAdminMenusAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const dashboardOverview = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = dashboardQuerySchema.parse(req.query);
    const result = await adminService.getDashboardOverviewAsync(query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const listAuditLogs = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = auditLogListQuerySchema.parse(req.query);
    const result = await adminService.listAuditLogsAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const listFeedbacks = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = feedbackListQuerySchema.parse(req.query);
    const result = await adminService.listFeedbacksAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getFeedbackDetail = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.getFeedbackDetailAsync(id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateFeedbackHandle = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateFeedbackHandleSchema.parse(req.body);
    const result = await adminService.updateFeedbackHandleAsync(req.adminUser!.id, id, input);
    success(res, result, '反馈处理状态已更新');
  } catch (error) {
    next(error);
  }
};

export const listUsers = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = userListQuerySchema.parse(req.query);
    const result = await adminService.listUsersAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const getUserDetail = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.getUserDetailAsync(id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const listMembershipPlans = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listMembershipPlansAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const createMembershipPlan = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createMembershipPlanSchema.parse(req.body);
    const result = await adminService.createMembershipPlanAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateMembershipPlan = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateMembershipPlanSchema.parse(req.body);
    const result = await adminService.updateMembershipPlanAsync(req.adminUser!.id, id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const listActivationCodes = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = activationCodeListQuerySchema.parse(req.query);
    const result = await adminService.listActivationCodesAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const batchCreateActivationCodes = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = batchCreateActivationCodesSchema.parse(req.body);
    const result = await adminService.batchCreateActivationCodesAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const batchDeleteActivationCodes = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = batchDeleteActivationCodesSchema.parse(req.body);
    const result = await adminService.batchDeleteActivationCodesAsync(req.adminUser!.id, input);
    success(res, result, '批量删除成功');
  } catch (error) {
    next(error);
  }
};

export const voidActivationCode = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const result = await adminService.voidActivationCodeAsync(req.adminUser!.id, id);
    success(res, result, '作废成功');
  } catch (error) {
    next(error);
  }
};

export const listMembershipGrants = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = membershipGrantListQuerySchema.parse(req.query);
    const result = await adminService.listMembershipGrantsAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const grantMembership = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = grantMembershipSchema.parse(req.body);
    const result = await adminService.grantMembershipAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const listInvites = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = inviteListQuerySchema.parse(req.query);
    const result = await adminService.listInvitesAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const listInviteRules = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listInviteRulesAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const upsertInviteRule = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { taskKey } = inviteRuleParamSchema.parse(req.params);
    const input = inviteRuleSchema.parse(req.body);
    const result = await adminService.upsertInviteRuleAsync(taskKey, input);
    success(res, result, '保存成功');
  } catch (error) {
    next(error);
  }
};

export const listPointRecords = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = pointRecordListQuerySchema.parse(req.query);
    const result = await adminService.listPointRecordsAsync(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const adjustPoints = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = pointAdjustSchema.parse(req.body);
    const result = await adminService.adjustPointsAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const listBanners = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listBannersAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const listContentTemplates = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listContentTemplatesAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const createBanner = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createBannerSchema.parse(req.body);
    const result = await adminService.createBannerAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateBanner = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateBannerSchema.parse(req.body);
    const result = await adminService.updateBannerAsync(req.adminUser!.id, id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const listActivities = async (_req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await adminService.listActivitiesAsync();
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const createActivity = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createActivitySchema.parse(req.body);
    const result = await adminService.createActivityAsync(req.adminUser!.id, input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateActivity = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    const input = updateActivitySchema.parse(req.body);
    const result = await adminService.updateActivityAsync(req.adminUser!.id, id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const deleteBanner = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await adminService.deleteBannerAsync(req.adminUser!.id, id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

export const deleteActivity = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = idParamSchema.parse(req.params);
    await adminService.deleteActivityAsync(req.adminUser!.id, id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
