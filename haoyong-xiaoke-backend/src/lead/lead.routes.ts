import { Router } from 'express';
import * as leadController from './lead.controller';
import { validate } from '../middleware/validate';
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
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==================== Lead (线索) ====================

// 线索列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: leadListQuerySchema }),
  leadController.listLeads,
);

// 线索统计
router.get(
  '/summary',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.getLeadSummary,
);

// 线索详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.getLeadDetail,
);

// 创建线索
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createLeadSchema }),
  leadController.createLead,
);

// 更新线索
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateLeadSchema }),
  leadController.updateLead,
);

// 更新线索状态
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateLeadStatusSchema }),
  leadController.updateLeadStatus,
);

// 删除线索
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.deleteLead,
);

// ==================== Contact (联系人) ====================

// 添加联系人
router.post(
  '/contacts',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createLeadContactSchema }),
  leadController.createLeadContact,
);

// 删除联系人
router.delete(
  '/contacts/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.deleteLeadContact,
);

// ==================== FollowUp (跟进) ====================

// 创建跟进
router.post(
  '/follow-ups',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createLeadFollowUpSchema }),
  leadController.createLeadFollowUp,
);

// 跟进列表
router.get(
  '/follow-ups',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: leadFollowUpListQuerySchema }),
  leadController.listLeadFollowUps,
);

// ==================== Booking (预约) ====================

// 创建预约
router.post(
  '/bookings',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createLeadBookingSchema }),
  leadController.createLeadBooking,
);

// 预约列表
router.get(
  '/bookings',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: leadBookingListQuerySchema }),
  leadController.listLeadBookings,
);

// 更新预约
router.put(
  '/bookings/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateLeadBookingSchema }),
  leadController.updateLeadBooking,
);

// 取消预约
router.post(
  '/bookings/:id/cancel',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.cancelLeadBooking,
);

// 恢复预约
router.post(
  '/bookings/:id/restore',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.restoreLeadBooking,
);

// ==================== Conversion (转化) ====================

// 创建转化
router.post(
  '/conversions',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createLeadConversionSchema }),
  leadController.createLeadConversion,
);

// ==================== TrialSlotConfig (时段配置) ====================

// 时段配置列表
router.get(
  '/trial-slots',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: trialSlotConfigListQuerySchema }),
  leadController.listTrialSlotConfigs,
);

// 创建时段配置
router.post(
  '/trial-slots',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createTrialSlotConfigSchema }),
  leadController.createTrialSlotConfig,
);

// 更新时段配置
router.put(
  '/trial-slots/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateTrialSlotConfigSchema }),
  leadController.updateTrialSlotConfig,
);

// 删除时段配置
router.delete(
  '/trial-slots/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.deleteTrialSlotConfig,
);

// ==================== Invite (邀约) ====================

// 创建邀约
router.post(
  '/invites',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createInviteRecordSchema }),
  leadController.createInviteRecord,
);

// 邀约二维码
router.get(
  '/invites/qrcode',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  leadController.getInviteQRCode,
);

export default router;
