import { z } from 'zod';

// ==================== CardType (卡种) ====================

// 创建卡种
export const createCardTypeSchema = z.object({
  name: z.string().min(1, '卡种名称不能为空').max(50, '卡种名称不能超过50字符'),
  kind: z.enum(['count', 'time', 'stored']).default('count'),
  status: z.enum(['active', 'inactive']).default('active'),
  scopes: z.array(z.enum(['course', 'venue'])).default(['course']),
  bookingMethod: z.enum(['course', 'teacher', 'none']).default('course'),
  categoryIds: z.array(z.string()).default([]),
  count: z.number().int().min(0).optional(),
  validDays: z.number().int().min(1).default(365),
  price: z.number().int().min(0).default(0),
  freezeCount: z.number().int().min(0).default(0),
  freezeDays: z.number().int().min(0).default(0),
  benefits: z.string().optional(),
  cardCategory: z.enum(['formal', 'trial', 'gift']).default('formal'),
  renewalPrice: z.number().int().min(0).optional(),
  dailyMaxBookings: z.number().int().min(0).default(0),
  weeklyMaxBookings: z.number().int().min(0).default(0),
  monthlyMaxBookings: z.number().int().min(0).default(0),
  freeCancelCount: z.number().int().min(0).default(0),
  advanceBookingMinutes: z.number().int().min(0).default(0),
  availableWeekdays: z.array(z.number().int().min(1).max(7)).default([]),
  onlinePurchase: z.boolean().default(false),
  studentIdentityLimit: z.boolean().default(false),
  isGiftCard: z.boolean().default(false),
  allowTransfer: z.boolean().default(false),
  usageLimit: z.number().int().min(0).default(0),
  commissionCalc: z.string().optional(),
  backgroundImage: z.string().optional(),
  campusIds: z.array(z.string()).default([]),
});

// 更新卡种
export const updateCardTypeSchema = z.object({
  name: z.string().min(1, '卡种名称不能为空').max(50, '卡种名称不能超过50字符').optional(),
  kind: z.enum(['count', 'time', 'stored']).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  scopes: z.array(z.enum(['course', 'venue'])).optional(),
  bookingMethod: z.enum(['course', 'teacher', 'none']).optional(),
  categoryIds: z.array(z.string()).optional(),
  count: z.number().int().min(0).optional(),
  validDays: z.number().int().min(1).optional(),
  price: z.number().int().min(0).optional(),
  freezeCount: z.number().int().min(0).optional(),
  freezeDays: z.number().int().min(0).optional(),
  benefits: z.string().optional(),
  cardCategory: z.enum(['formal', 'trial', 'gift']).optional(),
  renewalPrice: z.number().int().min(0).optional(),
  dailyMaxBookings: z.number().int().min(0).optional(),
  weeklyMaxBookings: z.number().int().min(0).optional(),
  monthlyMaxBookings: z.number().int().min(0).optional(),
  freeCancelCount: z.number().int().min(0).optional(),
  advanceBookingMinutes: z.number().int().min(0).optional(),
  availableWeekdays: z.array(z.number().int().min(1).max(7)).optional(),
  onlinePurchase: z.boolean().optional(),
  studentIdentityLimit: z.boolean().optional(),
  isGiftCard: z.boolean().optional(),
  allowTransfer: z.boolean().optional(),
  usageLimit: z.number().int().min(0).optional(),
  commissionCalc: z.string().optional(),
  backgroundImage: z.string().optional(),
  campusIds: z.array(z.string()).optional(),
});

// 卡种列表查询
export const cardTypeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  kind: z.enum(['count', 'time', 'stored']).optional(),
});

// 切换卡种状态
export const toggleCardTypeStatusSchema = z.object({
  status: z.enum(['active', 'inactive']),
});

// ==================== MemberCard (会员卡) ====================

// 发放会员卡
export const issueMemberCardSchema = z.object({
  cardTypeId: z.string().min(1, '卡种ID不能为空'),
  studentId: z.string().min(1, '学员ID不能为空'),
  purchasePrice: z.number().int().min(0).default(0),
  purchaseAt: z.string().optional(),
  activatedAt: z.string().optional(),
  expiredAt: z.string().optional(),
  source: z.string().optional(),
  remark: z.string().optional(),
  totalGiftCount: z.number().int().min(0).default(0),
  cardNo: z.string().optional(),
});

// 更新会员卡
export const updateMemberCardSchema = z.object({
  status: z.enum(['active', 'inactive', 'usedUp', 'notActivated', 'frozen']).optional(),
  frozenCount: z.number().int().min(0).optional(),
  frozenDays: z.number().int().min(0).optional(),
  remark: z.string().optional(),
});

// 会员卡列表查询
export const memberCardListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  cardTypeId: z.string().optional(),
  studentId: z.string().optional(),
  status: z.enum(['active', 'inactive', 'usedUp', 'notActivated', 'frozen']).optional(),
});

// 会员卡统计查询
export const memberCardStatsQuerySchema = z.object({
  cardTypeId: z.string().min(1, '卡种ID不能为空'),
  stat: z.enum(['sold', 'inUse', 'usedUp', 'notActivated', 'frozen']),
});

// 类型导出
export type CreateCardTypeInput = z.infer<typeof createCardTypeSchema>;
export type UpdateCardTypeInput = z.infer<typeof updateCardTypeSchema>;
export type CardTypeListQuery = z.infer<typeof cardTypeListQuerySchema>;
export type ToggleCardTypeStatusInput = z.infer<typeof toggleCardTypeStatusSchema>;

export type IssueMemberCardInput = z.infer<typeof issueMemberCardSchema>;
export type UpdateMemberCardInput = z.infer<typeof updateMemberCardSchema>;
export type MemberCardListQuery = z.infer<typeof memberCardListQuerySchema>;
export type MemberCardStatsQuery = z.infer<typeof memberCardStatsQuerySchema>;
