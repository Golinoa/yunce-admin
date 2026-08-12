import { z } from 'zod';

// ==================== Lead (线索) ====================

// 创建线索
export const createLeadSchema = z.object({
  childName: z.string().min(1, '孩子姓名不能为空').max(50),
  childNickname: z.string().max(50).optional(),
  childGender: z.enum(['male', 'female']).optional(),
  childAge: z.string().max(20).optional(),
  parentName: z.string().max(50).optional(),
  parentPhone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式错误').optional().or(z.literal('')),
  campusId: z.string().min(1, '校区ID不能为空'),
  subjectId: z.string().optional(),
  sourceCourseId: z.string().optional(),
  sourceType: z.enum(['share_link', 'qr', 'manual']).default('manual'),
  notes: z.string().max(500).optional(),
});

// 更新线索
export const updateLeadSchema = z.object({
  childName: z.string().min(1).max(50).optional(),
  childNickname: z.string().max(50).optional(),
  childGender: z.enum(['male', 'female']).optional(),
  childAge: z.string().max(20).optional(),
  parentName: z.string().max(50).optional(),
  parentPhone: z.string().regex(/^1[3-9]\d{9}$/).optional().or(z.literal('')),
  status: z.enum(['new', 'pending', 'booked', 'arrived', 'not_arrived', 'following', 'converted', 'closed']).optional(),
  notes: z.string().max(500).optional(),
  closedReason: z.string().max(200).optional(),
});

// 更新线索状态
export const updateLeadStatusSchema = z.object({
  status: z.enum(['new', 'pending', 'booked', 'arrived', 'not_arrived', 'following', 'converted', 'closed']),
  closedReason: z.string().max(200).optional(),
});

// 线索列表查询
export const leadListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  campusId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.string().optional(),
  filterTab: z.enum(['all', 'following', 'booked', 'closed']).optional(),
  keyword: z.string().optional(),
});

// ==================== LeadContact (线索联系人) ====================

// 添加联系人
export const createLeadContactSchema = z.object({
  leadId: z.string().min(1),
  name: z.string().min(1).max(50),
  relation: z.string().min(1).max(20),
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式错误'),
  isDefault: z.boolean().default(false),
});

// ==================== LeadFollowUp (线索跟进) ====================

// 创建线索跟进
export const createLeadFollowUpSchema = z.object({
  leadId: z.string().min(1),
  action: z.enum(['phone_call', 'wechat', 're_invite', 'push_convert', 'other']),
  intentLevel: z.enum(['high', 'medium', 'low', 'none']).optional(),
  content: z.string().min(1).max(1000),
  nextFollowUpAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// 线索跟进列表查询
export const leadFollowUpListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().optional(),
});

// ==================== LeadBooking (试听预约) ====================

// 创建试听预约
export const createLeadBookingSchema = z.object({
  leadId: z.string().min(1),
  trialMode: z.enum(['group', 'private']).default('group'),
  referenceScheduleId: z.string().optional(),
  timeOffsetMinutes: z.number().int().optional(),
  classId: z.string().optional(),
  className: z.string().optional(),
  courseId: z.string().min(1),
  courseName: z.string().min(1),
  subjectId: z.string().optional(),
  subjectName: z.string().optional(),
  campusId: z.string().min(1),
  campusName: z.string().optional(),
  teacherId: z.string().min(1),
  teacherName: z.string().optional(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  room: z.string().optional(),
  bookingType: z.enum(['self', 'proxy']).default('self'),
  operatorId: z.string().optional(),
  note: z.string().max(500).optional(),
});

// 更新试听预约
export const updateLeadBookingSchema = z.object({
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  courseName: z.string().optional(),
  childName: z.string().optional(),
  note: z.string().max(500).optional(),
  teacherId: z.string().optional(),
  difficulty: z.enum(['all', 'basic', 'intermediate', 'advanced']).optional(),
  room: z.string().optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
});

// 试听预约列表查询
export const leadBookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  leadId: z.string().optional(),
  teacherId: z.string().optional(),
  status: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ==================== LeadConversion (转化) ====================

// 创建转化
export const createLeadConversionSchema = z.object({
  leadId: z.string().min(1),
  conversionType: z.enum(['new_student', 'merge_student']),
  studentId: z.string().min(1),
  mergeToStudentId: z.string().optional(),
  note: z.string().max(500).optional(),
});

// ==================== TrialSlotConfig (时段配置) ====================

// 创建时段配置
export const createTrialSlotConfigSchema = z.object({
  courseId: z.string().min(1),
  courseName: z.string().min(1),
  subjectId: z.string().optional(),
  subjectName: z.string().optional(),
  campusId: z.string().min(1),
  campusName: z.string().optional(),
  teacherId: z.string().min(1),
  teacherName: z.string().optional(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  room: z.string().optional(),
  maxCount: z.number().int().min(1).default(5),
  note: z.string().max(500).optional(),
});

// 更新时段配置
export const updateTrialSlotConfigSchema = z.object({
  courseName: z.string().optional(),
  subjectName: z.string().optional(),
  lessonDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional(),
  room: z.string().optional(),
  maxCount: z.number().int().min(1).optional(),
  status: z.enum(['active', 'closed']).optional(),
  note: z.string().max(500).optional(),
});

// 时段配置列表查询
export const trialSlotConfigListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  teacherId: z.string().optional(),
  campusId: z.string().optional(),
  status: z.enum(['active', 'closed']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// ==================== InviteRecord (邀约) ====================

// 创建邀约
export const createInviteRecordSchema = z.object({
  teacherId: z.string().min(1),
  campusId: z.string().min(1),
  type: z.enum(['trial', 'activity']).default('trial'),
  targetUrl: z.string().optional(),
  expiresAt: z.string().optional(),
});

// 类型导出
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;

export type CreateLeadContactInput = z.infer<typeof createLeadContactSchema>;

export type CreateLeadFollowUpInput = z.infer<typeof createLeadFollowUpSchema>;
export type LeadFollowUpListQuery = z.infer<typeof leadFollowUpListQuerySchema>;

export type CreateLeadBookingInput = z.infer<typeof createLeadBookingSchema>;
export type UpdateLeadBookingInput = z.infer<typeof updateLeadBookingSchema>;
export type LeadBookingListQuery = z.infer<typeof leadBookingListQuerySchema>;

export type CreateLeadConversionInput = z.infer<typeof createLeadConversionSchema>;

export type CreateTrialSlotConfigInput = z.infer<typeof createTrialSlotConfigSchema>;
export type UpdateTrialSlotConfigInput = z.infer<typeof updateTrialSlotConfigSchema>;
export type TrialSlotConfigListQuery = z.infer<typeof trialSlotConfigListQuerySchema>;

export type CreateInviteRecordInput = z.infer<typeof createInviteRecordSchema>;
