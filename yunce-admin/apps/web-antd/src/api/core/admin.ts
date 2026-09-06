import { requestClient } from '#/api/request';

export interface ListQuery {
  page?: number;
  pageSize?: number;
}

export interface DashboardOverview {
  cards: {
    activeInviteRules: number;
    newUsersGrowth: number;
    newUsersInRange: number;
    pendingStoreEntryCount?: number;
    totalActivationCodes: number;
    totalInvites: number;
    totalMembers: number;
    totalOrganizations?: number;
    totalParents: number;
    totalStudents: number;
    totalTeachers: number;
    totalUsers: number;
    usedActivationCodes: number;
  };
  /** 激活码渠道 × 付费转化 */
  channelPay?: Array<{
    channel: string;
    paidOrgs: number;
    rate: number;
    usedCodes: number;
  }>;
  engagement?: {
    dau: number;
    onlineRate: number;
    wau: number;
  };
  feedbackAlerts: {
    list: Array<{
      content: string;
      createdAt: string;
      handleStatus: FeedbackHandleStatus;
      id: string;
      profile: {
        id: string;
        institution?: null | string;
        name?: null | string;
        nickname?: null | string;
        phone?: null | string;
      };
      type: FeedbackType;
    }>;
    overdueCount: number;
    pendingCount: number;
    processingCount: number;
  };
  /** 机构 SaaS 漏斗 */
  funnel?: Array<{
    conversionFromPrev: null | number;
    count: number;
    key: string;
    label: string;
  }>;
  membershipAlerts: {
    expiringIn7Days: number;
    expiringIn15Days: number;
    expiringIn30Days: number;
    list: Array<{
      daysLeft: number;
      endAt: string;
      id: string;
      planName?: null | string;
      profile: {
        id: string;
        institution?: null | string;
        name?: null | string;
        nickname?: null | string;
        phone?: null | string;
      };
    }>;
  };
  /** 机构 SaaS 到期（排除测试店） */
  orgExpireAlerts?: {
    expiringIn30Days: number;
    list: Array<{
      daysLeft: number;
      expireAt: string;
      id: string;
      name: string;
      versionCode: string;
    }>;
  };
  /** 付费机构 / 活跃机构 */
  paidOrgRate?: {
    activeOrgs: number;
    paidOrgs: number;
    rate: number;
  };
  retention: {
    day1: number;
    day1Meta?: { cohortSize: number; retained: number };
    day3?: number;
    day3Meta?: { cohortSize: number; retained: number };
    day7: number;
    day7Meta?: { cohortSize: number; retained: number };
  };
  series: Array<{
    activation: number;
    activeUsers?: number;
    date: string;
    invites: number;
    members: number;
    users: number;
  }>;
  /** 试用→付费窗口转化 */
  trialToPaid?: Array<{
    cohortSize: number;
    converted: number;
    rate: number;
    windowDays: number;
  }>;
}

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AuditLogItem {
  action: string;
  adminUser: {
    id: string;
    nickname?: null | string;
    username: string;
  };
  adminUserId: string;
  createdAt: string;
  detail?: null | string;
  id: string;
  module: string;
  targetId?: null | string;
}

export type FeedbackHandleStatus =
  | 'CLOSED'
  | 'PENDING'
  | 'PROCESSING'
  | 'RESOLVED';
export type FeedbackType = 'BUG' | 'FEATURE' | 'OTHER';

export interface FeedbackItem {
  contact?: null | string;
  content: string;
  createdAt: string;
  handleRemark?: null | string;
  handleStatus: FeedbackHandleStatus;
  handledAt?: null | string;
  handledByAdmin?: null | {
    id: string;
    nickname?: null | string;
    username: string;
  };
  id: string;
  images?: null | string[];
  profile: {
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
    role: string;
    teacher?: null | {
      institution?: null | string;
    };
  };
  type: FeedbackType;
}

export function getDashboardOverviewApi(days = 14) {
  return requestClient.get<DashboardOverview>('/dashboard/overview', {
    params: { days },
  });
}

export function getAuditLogsApi(params: Record<string, unknown>) {
  return requestClient.get<{
    list: AuditLogItem[];
    pagination: PaginationResult;
  }>('/audit-logs', {
    params,
  });
}

export function getFeedbacksApi(params: Record<string, unknown>) {
  return requestClient.get<{
    list: FeedbackItem[];
    pagination: PaginationResult;
  }>('/feedbacks', {
    params,
  });
}

export function getFeedbackDetailApi(id: string) {
  return requestClient.get<FeedbackItem>(`/feedbacks/${id}`);
}

export function updateFeedbackHandleApi(
  id: string,
  data: { handleRemark?: null | string; handleStatus: FeedbackHandleStatus },
) {
  return requestClient.put(`/feedbacks/${id}/handle`, data);
}

export function getUsersApi(params: Record<string, unknown>) {
  return requestClient.get('/users', { params });
}

export function getUserDetailApi(id: string) {
  return requestClient.get(`/users/${id}`);
}

/** 权益档 code（与 Organization.versionCode / MembershipPlan.targetVersionCode 对齐） */
export type EntitlementVersionCode =
  | 'BASIC'
  | 'FLAGSHIP'
  | 'FREE'
  | 'STANDARD'
  | 'TRIAL';

export interface MembershipPlanPayload {
  durationDays: number;
  isActive?: boolean;
  name: string;
  pointsCost?: number;
  remark?: null | string;
  /** 激活码/手动履约目标权益档 */
  targetVersionCode?: EntitlementVersionCode | null;
}

export interface GrantMembershipPayload {
  durationDays?: number;
  planId?: string;
  profileId: string;
  remark?: null | string;
  source?: 'ACTIVATION_CODE' | 'MANUAL' | 'POINT_EXCHANGE';
  /** 无套餐时必填；有套餐时可覆盖 plan.targetVersionCode */
  targetVersionCode?: EntitlementVersionCode;
}

export function getMembershipPlansApi() {
  return requestClient.get('/membership-plans');
}

export function createMembershipPlanApi(data: MembershipPlanPayload) {
  return requestClient.post('/membership-plans', data);
}

export function updateMembershipPlanApi(
  id: string,
  data: Partial<MembershipPlanPayload>,
) {
  return requestClient.put(`/membership-plans/${id}`, data);
}

export function getMembershipsApi(params: Record<string, unknown>) {
  return requestClient.get('/memberships', { params });
}

export function grantMembershipApi(data: GrantMembershipPayload) {
  return requestClient.post('/memberships/grant', data);
}

export function getActivationCodesApi(params: Record<string, unknown>) {
  return requestClient.get('/activation-codes', { params });
}

export function batchCreateActivationCodesApi(data: Record<string, unknown>) {
  return requestClient.post('/activation-codes/batch-create', data);
}

export function batchDeleteActivationCodesApi(data: { ids: string[] }) {
  return requestClient.delete('/activation-codes', { data });
}

export function voidActivationCodeApi(id: string) {
  return requestClient.post(`/activation-codes/${id}/void`);
}

/** 支付订单只读列表 */
export function getPaymentOrdersApi(params: Record<string, unknown>) {
  return requestClient.get('/payment-orders', { params });
}

export function getInvitesApi(params: Record<string, unknown>) {
  return requestClient.get('/invites', { params });
}

export function getInviteRulesApi() {
  return requestClient.get('/invite-rules');
}

export function saveInviteRuleApi(
  taskKey: string,
  data: Record<string, unknown>,
) {
  return requestClient.put(`/invite-rules/${taskKey}`, data);
}

export function getPointRecordsApi(params: Record<string, unknown>) {
  return requestClient.get('/points/records', { params });
}

export function adjustPointsApi(data: Record<string, unknown>) {
  return requestClient.post('/points/adjust', data);
}

export function getBannersApi() {
  return requestClient.get('/banners');
}

export function createBannerApi(data: Record<string, unknown>) {
  return requestClient.post('/banners', data);
}

export function updateBannerApi(id: string, data: Record<string, unknown>) {
  return requestClient.put(`/banners/${id}`, data);
}

export function getActivitiesApi() {
  return requestClient.get('/activities');
}

export function createActivityApi(data: Record<string, unknown>) {
  return requestClient.post('/activities', data);
}

export function updateActivityApi(id: string, data: Record<string, unknown>) {
  return requestClient.put(`/activities/${id}`, data);
}

export interface OpsNotifySwitches {
  feedbackNew: boolean;
  membershipPaid: boolean;
  orgVersionChanged: boolean;
  storeEntryApproved: boolean;
  storeEntryRejected: boolean;
  storeEntrySubmitted: boolean;
}

export interface OpsNotifyTemplateFields {
  detail?: string;
  detailWebhook?: string;
  title?: string;
  titleTest?: string;
}

export type OpsNotifyTemplateKey =
  | 'feedbackNew'
  | 'membershipPaid'
  | 'orgVersionChanged'
  | 'storeEntryApproved'
  | 'storeEntryRejected'
  | 'storeEntrySubmitted';

export interface OpsNotifyConfig {
  approvedChatId: string;
  callbackUrl: string;
  dashboardOrigin: string;
  defaultTrialDays: number;
  defaultTrialPlanId: string;
  enabled: boolean;
  feishuAppConfigured: boolean;
  feishuAppId: string;
  hasActionHmacSecret: boolean;
  hasFeishuAppSecret: boolean;
  hasFeishuEncryptKey: boolean;
  hasFeishuVerificationToken: boolean;
  hasWebhook: boolean;
  hasWebhookApproved: boolean;
  reviewChatId: string;
  switches: OpsNotifySwitches;
  templates: Record<OpsNotifyTemplateKey, OpsNotifyTemplateFields>;
  updatedAt: string;
  webhookApprovedMasked: string;
  webhookMasked: string;
  webhookUrl: string;
  webhookUrlApproved: string;
}

export function getOpsNotifyConfigApi() {
  return requestClient.get<OpsNotifyConfig>('/ops-notify/config');
}

export function updateOpsNotifyConfigApi(data: {
  actionHmacSecret?: null | string;
  approvedChatId?: null | string;
  defaultTrialDays?: number;
  defaultTrialPlanId?: null | string;
  enabled?: boolean;
  feishuAppId?: null | string;
  feishuAppSecret?: null | string;
  feishuEncryptKey?: null | string;
  feishuVerificationToken?: null | string;
  reviewChatId?: null | string;
  switches?: Partial<OpsNotifySwitches>;
  templates?: null | Partial<
    Record<OpsNotifyTemplateKey, OpsNotifyTemplateFields>
  >;
  webhookUrl?: null | string;
  webhookUrlApproved?: null | string;
}) {
  return requestClient.put<OpsNotifyConfig>('/ops-notify/config', data);
}

export function testOpsNotifyWebhookApi(data?: {
  target?: 'approved' | 'review';
}) {
  return requestClient.post<{ message: string; success: boolean }>(
    '/ops-notify/test',
    data ?? {},
  );
}

export function debugOpsNotifySimulateApi(data: {
  payload?: Record<string, unknown>;
  scene:
    | 'orgVersionChanged'
    | 'storeEntryApproved'
    | 'storeEntryRejected'
    | 'storeEntrySubmitted';
}) {
  return requestClient.post<{
    message: string;
    mode?: string;
    success: boolean;
  }>('/ops-notify/debug-simulate', data);
}

export type SesEmailPurpose =
  | 'bind'
  | 'expiryReminder'
  | 'login'
  | 'openReminder'
  | 'register'
  | 'reset';

export type SesEmailTemplateFields = {
  codeKey?: string;
  effectiveTemplateId?: string;
  fromDb?: boolean;
  label?: string;
  subject?: string;
  templateId?: string;
};

export interface SesEmailConfig {
  codeKey: string;
  configured: boolean;
  credentialSource: 'db' | 'env' | 'mixed' | 'none';
  envFallbackNote: string;
  fromAddress: string;
  hasSecretKey: boolean;
  region: string;
  replyTo: string;
  secretId: string;
  templates: Record<SesEmailPurpose, SesEmailTemplateFields>;
  updatedAt: string;
}

export function getSesEmailConfigApi() {
  return requestClient.get<SesEmailConfig>('/ses-email/config');
}

export function updateSesEmailConfigApi(data: {
  codeKey?: null | string;
  fromAddress?: null | string;
  region?: null | string;
  replyTo?: null | string;
  secretId?: null | string;
  secretKey?: null | string;
  templates?: null | Partial<
    Record<SesEmailPurpose, { codeKey?: string; subject?: string; templateId?: string }>
  >;
}) {
  return requestClient.put<SesEmailConfig>('/ses-email/config', data);
}

export function testSesEmailApi(data: { purpose: SesEmailPurpose; toEmail: string }) {
  return requestClient.post<{
    message: string;
    messageId?: string;
    success: boolean;
  }>('/ses-email/test', data);
}

export type SystemServiceVersion = {
  key: 'backend' | 'dashboard' | 'miniprogram';
  name: string;
  note?: string;
  version: null | string;
};

export type SystemVersionsResult = {
  apiPublicOrigin: string;
  dashboardPublicOrigin: string;
  nodeEnv: string;
  serverTime: string;
  services: SystemServiceVersion[];
};

export function getSystemVersionsApi() {
  return requestClient.get<SystemVersionsResult>('/system/versions');
}
