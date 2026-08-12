import {
  ActivationCodeStatus,
  ActivityStatus,
  BannerStatus,
  FeedbackHandleStatus,
  MembershipSource,
  MembershipStatus,
  PointChangeSource,
  PointType,
} from '@prisma/client';
import { z } from 'zod';

const optionalDateTimeSchema = z
  .string()
  .datetime()
  .optional()
  .nullable();

export const idParamSchema = z.object({
  id: z.string().uuid('ID 格式不正确'),
});

export const loginSchema = z.object({
  username: z.string().trim().min(3, '用户名至少 3 位').max(50, '用户名最多 50 位'),
  password: z.string().min(6, '密码至少 6 位').max(100, '密码最多 100 位'),
});

export const dashboardQuerySchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(14),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditLogListQuerySchema = paginationQuerySchema.extend({
  adminUserId: z.string().uuid('管理员 ID 格式不正确').optional(),
  action: z.string().trim().max(50).optional(),
  keyword: z.string().trim().max(100).optional(),
  module: z.string().trim().max(50).optional(),
});

export const feedbackListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(100).optional(),
  handleStatus: z.nativeEnum(FeedbackHandleStatus).optional(),
  type: z.enum(['BUG', 'FEATURE', 'OTHER']).optional(),
});

export const userListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(100).optional(),
  role: z.enum(['PARENT', 'PRINCIPAL', 'TEACHER']).optional(),
  membershipStatus: z.nativeEnum(MembershipStatus).optional(),
});

export const activationCodeListQuerySchema = paginationQuerySchema.extend({
  code: z.string().trim().max(50).optional(),
  batchNo: z.string().trim().max(50).optional(),
  channel: z.string().trim().max(50).optional(),
  status: z.nativeEnum(ActivationCodeStatus).optional(),
});

export const createMembershipPlanSchema = z.object({
  name: z.string().trim().min(1, '套餐名称不能为空').max(50, '套餐名称最多 50 个字符'),
  durationDays: z.coerce.number().int().min(1, '时长至少 1 天').max(3650, '时长过长'),
  pointsCost: z.coerce.number().int().min(0, '积分成本不能为负数').default(0),
  isActive: z.boolean().default(true),
  remark: z.string().trim().max(200).optional().nullable(),
});

export const updateMembershipPlanSchema = createMembershipPlanSchema.partial();

export const batchCreateActivationCodesSchema = z.object({
  planId: z.string().uuid('套餐 ID 格式不正确'),
  quantity: z.coerce.number().int().min(1, '至少生成 1 个').max(200, '单次最多生成 200 个'),
  expiresAt: optionalDateTimeSchema,
  batchNo: z.string().trim().max(50).optional().nullable(),
  channel: z.string().trim().max(50).optional().nullable(),
  remark: z.string().trim().max(200).optional().nullable(),
});

export const batchDeleteActivationCodesSchema = z.object({
  ids: z
    .array(z.string().uuid('激活码 ID 格式不正确'))
    .min(1, '至少选择 1 个激活码')
    .max(100, '单次最多删除 100 个激活码'),
});

export const membershipGrantListQuerySchema = paginationQuerySchema.extend({
  profileId: z.string().uuid().optional(),
  source: z.nativeEnum(MembershipSource).optional(),
  status: z.nativeEnum(MembershipStatus).optional(),
});

export const grantMembershipSchema = z
  .object({
    profileId: z.string().uuid('用户 ID 格式不正确'),
    planId: z.string().uuid('套餐 ID 格式不正确').optional(),
    durationDays: z.coerce.number().int().min(1).max(3650).optional(),
    source: z.nativeEnum(MembershipSource).default(MembershipSource.MANUAL),
    remark: z.string().trim().max(200).optional().nullable(),
  })
  .refine((value) => Boolean(value.planId || value.durationDays), {
    message: '套餐 ID 和会员天数至少提供一个',
    path: ['planId'],
  });

export const inviteListQuerySchema = paginationQuerySchema.extend({
  keyword: z.string().trim().max(100).optional(),
});

export const inviteRuleParamSchema = z.object({
  taskKey: z.string().trim().min(1, '任务标识不能为空').max(50, '任务标识最多 50 个字符'),
});

export const inviteRuleSchema = z.object({
  name: z.string().trim().min(1, '规则名称不能为空').max(50, '规则名称最多 50 个字符'),
  pointsReward: z.coerce.number().int().min(0, '邀请奖励不能为负数'),
  inviteePointsReward: z.coerce.number().int().min(0, '被邀请人奖励不能为负数').default(0),
  enabled: z.boolean().default(true),
  remark: z.string().trim().max(200).optional().nullable(),
});

export const pointRecordListQuerySchema = paginationQuerySchema.extend({
  profileId: z.string().uuid().optional(),
  type: z.nativeEnum(PointType).optional(),
  source: z.nativeEnum(PointChangeSource).optional(),
});

export const pointAdjustSchema = z.object({
  profileId: z.string().uuid('用户 ID 格式不正确'),
  amount: z.coerce.number().int().refine((value) => value !== 0, '调整积分不能为 0'),
  remark: z.string().trim().max(200, '备注最多 200 个字符').optional().nullable(),
});

export const updateFeedbackHandleSchema = z.object({
  handleStatus: z.nativeEnum(FeedbackHandleStatus),
  handleRemark: z.string().trim().max(500, '处理备注最多 500 个字符').optional().nullable(),
});

const operationActionSchema = z.object({
  appId: z.string().trim().max(100).optional(),
  extraData: z.record(z.string(), z.unknown()).optional(),
  path: z.string().trim().max(500).optional(),
  type: z.enum(['ACTIVITY', 'MINI_PROGRAM', 'NONE', 'PAGE', 'TAB', 'WEBVIEW']).default('NONE'),
  url: z.string().trim().url('外链地址格式不正确').optional(),
});

const operationDisplaySchema = z.object({
  badgeText: z.string().trim().max(30).optional(),
  buttonText: z.string().trim().max(30).optional(),
  closeable: z.boolean().optional(),
  frequency: z.enum(['ALWAYS', 'ONCE_PER_DAY', 'ONCE_PER_USER']).optional(),
  note: z.string().trim().max(100).optional(),
  showDelaySeconds: z.coerce.number().int().min(0).max(3600).optional(),
  styleVariant: z.string().trim().max(30).optional(),
});

export const createBannerSchema = z.object({
  actionConfig: operationActionSchema.optional().nullable(),
  displayConfig: operationDisplaySchema.optional().nullable(),
  title: z.string().trim().min(1, '标题不能为空').max(50, '标题最多 50 个字符'),
  imageUrl: z.string().trim().url('图片地址格式不正确'),
  jumpType: z.string().trim().max(30).default('none'),
  jumpValue: z.string().trim().max(500).optional().nullable(),
  slotKey: z.string().trim().min(1, '运营位不能为空').max(50, '运营位最多 50 个字符').default('HOME_BANNER'),
  templateKey: z.string().trim().min(1, '模板不能为空').max(50, '模板最多 50 个字符').default('HOME_BANNER_IMAGE'),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.nativeEnum(BannerStatus).default(BannerStatus.ACTIVE),
  startsAt: optionalDateTimeSchema,
  endsAt: optionalDateTimeSchema,
});

export const updateBannerSchema = createBannerSchema.partial();

export const createActivitySchema = z.object({
  actionConfig: operationActionSchema.optional().nullable(),
  title: z.string().trim().min(1, '活动名称不能为空').max(80, '活动名称最多 80 个字符'),
  coverImageUrl: z.string().trim().url('封面地址格式不正确').optional().nullable(),
  displayConfig: operationDisplaySchema.optional().nullable(),
  summary: z.string().trim().max(200).optional().nullable(),
  content: z.string().trim().max(5000).optional().nullable(),
  jumpType: z.string().trim().max(30).default('none'),
  jumpValue: z.string().trim().max(500).optional().nullable(),
  slotKey: z.string().trim().min(1, '运营位不能为空').max(50, '运营位最多 50 个字符').default('HOME_POPUP'),
  status: z.nativeEnum(ActivityStatus).default(ActivityStatus.DRAFT),
  startsAt: optionalDateTimeSchema,
  endsAt: optionalDateTimeSchema,
  sortOrder: z.coerce.number().int().min(0).default(0),
  templateKey: z.string().trim().min(1, '模板不能为空').max(50, '模板最多 50 个字符').default('HOME_POPUP_SINGLE'),
});

export const updateActivitySchema = createActivitySchema.partial();

export type LoginInput = z.infer<typeof loginSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
export type ActivationCodeListQuery = z.infer<typeof activationCodeListQuerySchema>;
export type CreateMembershipPlanInput = z.infer<typeof createMembershipPlanSchema>;
export type UpdateMembershipPlanInput = z.infer<typeof updateMembershipPlanSchema>;
export type BatchCreateActivationCodesInput = z.infer<typeof batchCreateActivationCodesSchema>;
export type BatchDeleteActivationCodesInput = z.infer<typeof batchDeleteActivationCodesSchema>;
export type MembershipGrantListQuery = z.infer<typeof membershipGrantListQuerySchema>;
export type GrantMembershipInput = z.infer<typeof grantMembershipSchema>;
export type InviteListQuery = z.infer<typeof inviteListQuerySchema>;
export type InviteRuleInput = z.infer<typeof inviteRuleSchema>;
export type PointRecordListQuery = z.infer<typeof pointRecordListQuerySchema>;
export type PointAdjustInput = z.infer<typeof pointAdjustSchema>;
export type UpdateFeedbackHandleInput = z.infer<typeof updateFeedbackHandleSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
