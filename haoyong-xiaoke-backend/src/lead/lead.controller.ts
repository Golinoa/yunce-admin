import { Response, NextFunction } from 'express';
import * as leadService from './lead.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { prisma } from '../config/database';
import {
  leadListQuerySchema,
  createLeadSchema,
  updateLeadSchema,
  updateLeadStatusSchema,
  createLeadContactSchema,
  createLeadFollowUpSchema,
  leadFollowUpListQuerySchema,
  createLeadBookingSchema,
  updateLeadBookingSchema,
  leadBookingListQuerySchema,
  createLeadConversionSchema,
  createTrialSlotConfigSchema,
  updateTrialSlotConfigSchema,
  trialSlotConfigListQuerySchema,
  createInviteRecordSchema,
} from './lead.validator';

// 线索列表
export const listLeads = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = leadListQuerySchema.parse(req.query);
    // 获取当前老师的ID
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    const result = await leadService.listLeads({ ...query, teacherId: teacher?.id || query.teacherId });
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 线索详情
export const getLeadDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leadService.getLeadDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建线索
export const createLead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createLeadSchema.parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await leadService.createLead(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新线索
export const updateLead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateLeadSchema.parse(req.body);
    const result = await leadService.updateLead(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 更新线索状态
export const updateLeadStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateLeadStatusSchema.parse(req.body);
    const result = await leadService.updateLeadStatus(req.params.id, input);
    success(res, result, '状态更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除线索
export const deleteLead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await leadService.deleteLead(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 线索统计
export const getLeadSummary = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    const result = await leadService.getLeadSummaryByTeacher(teacher?.id || '');
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== Contact ====================

export const createLeadContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createLeadContactSchema.parse(req.body);
    const result = await leadService.createLeadContact(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const deleteLeadContact = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await leadService.deleteLeadContact(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== FollowUp ====================

export const createLeadFollowUp = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createLeadFollowUpSchema.parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await leadService.createLeadFollowUp(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const listLeadFollowUps = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = leadFollowUpListQuerySchema.parse(req.query);
    const result = await leadService.listLeadFollowUps(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// ==================== Booking ====================

export const createLeadBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createLeadBookingSchema.parse(req.body);
    const result = await leadService.createLeadBooking(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const listLeadBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = leadBookingListQuerySchema.parse(req.query);
    const result = await leadService.listLeadBookings(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const updateLeadBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateLeadBookingSchema.parse(req.body);
    const result = await leadService.updateLeadBooking(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const cancelLeadBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leadService.cancelLeadBooking(req.params.id);
    success(res, result, '预约已取消');
  } catch (error) {
    next(error);
  }
};

export const restoreLeadBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leadService.restoreLeadBooking(req.params.id);
    success(res, result, '预约已恢复');
  } catch (error) {
    next(error);
  }
};

// ==================== Conversion ====================

export const createLeadConversion = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createLeadConversionSchema.parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await leadService.createLeadConversion(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== TrialSlotConfig ====================

export const listTrialSlotConfigs = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = trialSlotConfigListQuerySchema.parse(req.query);
    const result = await leadService.listTrialSlotConfigs(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

export const createTrialSlotConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createTrialSlotConfigSchema.parse(req.body);
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await leadService.createTrialSlotConfig(input, teacher.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const updateTrialSlotConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateTrialSlotConfigSchema.parse(req.body);
    const result = await leadService.updateTrialSlotConfig(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

export const deleteTrialSlotConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await leadService.deleteTrialSlotConfig(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== Invite ====================

export const createInviteRecord = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createInviteRecordSchema.parse(req.body);
    const result = await leadService.createInviteRecord(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

export const getInviteQRCode = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const teacher = await prisma.teacher.findFirst({ where: { profileId: req.user!.profileId } });
    if (!teacher) {
      res.status(403).json({ code: 403, data: null, message: '无教师权限' });
      return;
    }
    const result = await leadService.getInviteQRCode(teacher.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const getInviteLanding = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await leadService.getInviteLandingData(req.params.code);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

export const submitInviteLanding = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, childName, parentName, parentPhone } = req.body;
    const result = await leadService.submitInviteLanding(code, { childName, parentName, parentPhone });
    success(res, result);
  } catch (error) {
    next(error);
  }
};
