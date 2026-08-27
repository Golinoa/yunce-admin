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
    totalParents: number;
    totalActivationCodes: number;
    totalInvites: number;
    totalMembers: number;
    totalStudents: number;
    totalTeachers: number;
    totalUsers: number;
    usedActivationCodes: number;
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
  membershipAlerts: {
    expiringIn15Days: number;
    expiringIn30Days: number;
    expiringIn7Days: number;
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
  retention: {
    day1: number;
    day7: number;
  };
  series: Array<{
    activation: number;
    date: string;
    invites: number;
    members: number;
    users: number;
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

export type FeedbackHandleStatus = 'PENDING' | 'PROCESSING' | 'RESOLVED' | 'CLOSED';
export type FeedbackType = 'BUG' | 'FEATURE' | 'OTHER';

export interface FeedbackItem {
  contact?: null | string;
  content: string;
  createdAt: string;
  handleRemark?: null | string;
  handleStatus: FeedbackHandleStatus;
  handledAt?: null | string;
  handledByAdmin?: {
    id: string;
    nickname?: null | string;
    username: string;
  } | null;
  id: string;
  images?: null | string[];
  profile: {
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
    role: string;
    teacher?: {
      institution?: null | string;
    } | null;
  };
  type: FeedbackType;
}

export function getDashboardOverviewApi(days = 14) {
  return requestClient.get<DashboardOverview>('/dashboard/overview', { params: { days } });
}

export function getAuditLogsApi(params: Record<string, unknown>) {
  return requestClient.get<{ list: AuditLogItem[]; pagination: PaginationResult }>('/audit-logs', {
    params,
  });
}

export function getFeedbacksApi(params: Record<string, unknown>) {
  return requestClient.get<{ list: FeedbackItem[]; pagination: PaginationResult }>('/feedbacks', {
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

export function getMembershipPlansApi() {
  return requestClient.get('/membership-plans');
}

export function createMembershipPlanApi(data: Record<string, unknown>) {
  return requestClient.post('/membership-plans', data);
}

export function updateMembershipPlanApi(id: string, data: Record<string, unknown>) {
  return requestClient.put(`/membership-plans/${id}`, data);
}

export function getMembershipsApi(params: Record<string, unknown>) {
  return requestClient.get('/memberships', { params });
}

export function grantMembershipApi(data: Record<string, unknown>) {
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

export function getInvitesApi(params: Record<string, unknown>) {
  return requestClient.get('/invites', { params });
}

export function getInviteRulesApi() {
  return requestClient.get('/invite-rules');
}

export function saveInviteRuleApi(taskKey: string, data: Record<string, unknown>) {
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
  orgVersionChanged: boolean;
  storeEntryApproved: boolean;
  storeEntryRejected: boolean;
  storeEntrySubmitted: boolean;
}

export interface OpsNotifyConfig {
  dashboardOrigin: string;
  enabled: boolean;
  hasWebhook: boolean;
  switches: OpsNotifySwitches;
  updatedAt: string;
  webhookMasked: string;
  webhookUrl: string;
}

export function getOpsNotifyConfigApi() {
  return requestClient.get<OpsNotifyConfig>('/ops-notify/config');
}

export function updateOpsNotifyConfigApi(data: {
  enabled?: boolean;
  switches?: Partial<OpsNotifySwitches>;
  webhookUrl?: null | string;
}) {
  return requestClient.put<OpsNotifyConfig>('/ops-notify/config', data);
}

export function testOpsNotifyWebhookApi() {
  return requestClient.post<{ message: string; success: boolean }>('/ops-notify/test');
}
