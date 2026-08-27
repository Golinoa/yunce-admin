import { requestClient } from '#/api/request';

/** 机构版本编码 */
export type OrganizationVersionCode = 'FREE' | 'STANDARD' | 'FLAGSHIP';

/** 门店入驻申请状态 */
export type StoreEntryStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

/** 机构状态 */
export type OrganizationStatus = 'ACTIVE' | 'FROZEN' | 'PENDING' | 'REJECTED';

export interface PaginationResult {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** 版本功能开关 */
export interface QuotaFeatures {
  leadTrace: boolean;
  batchImportExport: boolean;
}

/** 机构当前用量（配额口径） */
export interface QuotaUsage {
  members: number;
  employees: number;
  campuses: number;
}

/** 降配超限提示字段（Q8：允许保存，存量保留） */
export interface OverLimitResult {
  overLimit: boolean;
  members: boolean;
  employees: boolean;
  campuses: boolean;
}

/** 机构配额使用率（P1-4） */
export interface OrganizationQuotaUsage {
  versionCode: OrganizationVersionCode;
  versionName: string;
  maxMembers: number;
  currentMembers: number;
  maxEmployees: number;
  currentEmployees: number;
  maxCampuses: number;
  currentCampuses: number;
  features: QuotaFeatures;
}

/** 门店入驻申请列表项 */
export interface StoreEntryApplicationItem {
  address: string;
  applicant?: null | {
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
  };
  applicantUserId: string;
  contactName: string;
  contactPhone: string;
  createdAt: string;
  id: string;
  latitude?: null | number;
  locationName?: null | string;
  longitude?: null | number;
  name: string;
  organization?: null | {
    id: string;
    name: string;
    status: OrganizationStatus;
  };
  organizationId: string;
  region: string[];
  rejectReason?: null | string;
  reviewedAt?: null | string;
  reviewedByAdminId?: null | string;
  status: StoreEntryStatus;
  type: string;
  updatedAt: string;
}

/** 门店入驻申请详情 */
export interface StoreEntryApplicationDetail extends StoreEntryApplicationItem {
  applicant?: null | {
    avatar?: null | string;
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
  };
  organization?: null | {
    createdAt: string;
    id: string;
    name: string;
    rejectReason?: null | string;
    status: OrganizationStatus;
    versionCode: OrganizationVersionCode;
  };
  reviewedBy?: null | {
    id: string;
    nickname?: null | string;
    username: string;
  };
}

/** 机构列表项（含版本与用量列） */
export interface OrganizationItem {
  campusCount: number;
  createdAt: string;
  expireAt?: null | string;
  id: string;
  logo?: null | string;
  maxCampuses: number;
  memberCount: number;
  name: string;
  owner?: null | {
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
  };
  ownerId: string;
  quotaOverrides?: null | {
    features?: QuotaFeatures;
    maxCampuses?: number;
    maxEmployees?: number;
    maxMembers?: number;
  };
  quotaUsage: QuotaUsage;
  rejectReason?: null | string;
  status: OrganizationStatus;
  teacherCount: number;
  updatedAt: string;
  versionCode: OrganizationVersionCode;
}

/** 机构版本定义 */
export interface OrganizationVersionItem {
  code: OrganizationVersionCode;
  createdAt: string;
  description?: null | string;
  durationDays: number;
  features: QuotaFeatures;
  id: string;
  maxCampuses: number;
  maxEmployees: number;
  maxMembers: number;
  name: string;
  price: number;
  sort: number;
  status: string;
  updatedAt: string;
}

/** 机构版本调整入参（R7） */
export interface SetOrganizationVersionParams {
  quotaOverrides?: null | {
    features?: QuotaFeatures;
    maxCampuses?: number;
    maxEmployees?: number;
    maxMembers?: number;
  };
  versionCode: OrganizationVersionCode;
}

/** 机构版本调整返回（含 overLimit 提示） */
export interface SetOrganizationVersionResult extends OrganizationItem {
  overLimit: OverLimitResult;
}

// ==================== 门店入驻审核（P2 3.4 / R4） ====================

export function getStoreEntryApplicationsApi(params: Record<string, unknown>) {
  return requestClient.get<{ list: StoreEntryApplicationItem[]; pagination: PaginationResult }>(
    '/store-entry/applications',
    { params },
  );
}

export function getStoreEntryApplicationDetailApi(id: string) {
  return requestClient.get<StoreEntryApplicationDetail>(`/store-entry/applications/${id}`);
}

export function approveStoreEntryApplicationApi(id: string) {
  return requestClient.post<{
    applicationId: string;
    campusId: string;
    organizationId: string;
    success: boolean;
  }>(`/store-entry/applications/${id}/approve`);
}

export function rejectStoreEntryApplicationApi(id: string, data: { reason: string }) {
  return requestClient.post<{ success: boolean }>(`/store-entry/applications/${id}/reject`, data);
}

// ==================== 机构版本配置（P2 3.5 / R5/R7） ====================

export function getOrganizationVersionsApi(params?: Record<string, unknown>) {
  return requestClient.get<{ list: OrganizationVersionItem[] }>('/organization-versions', {
    params,
  });
}

export function updateOrganizationVersionApi(
  code: OrganizationVersionCode,
  data: Partial<{
    description?: null | string;
    durationDays: number;
    features: QuotaFeatures;
    maxCampuses: number;
    maxEmployees: number;
    maxMembers: number;
    name: string;
    price: number;
    sort: number;
    status: string;
  }>,
) {
  return requestClient.put<OrganizationVersionItem>(`/organization-versions/${code}`, data);
}

// ==================== 机构列表 / 版本调整 / 配额使用 ====================

export function getOrganizationsApi(params: Record<string, unknown>) {
  return requestClient.get<{ list: OrganizationItem[]; pagination: PaginationResult }>(
    '/organizations',
    { params },
  );
}

export function setOrganizationVersionApi(id: string, data: SetOrganizationVersionParams) {
  return requestClient.post<SetOrganizationVersionResult>(`/organizations/${id}/version`, data);
}

export function getOrganizationQuotaUsageApi(id: string) {
  return requestClient.get<OrganizationQuotaUsage>(`/organizations/${id}/quota-usage`);
}

// ==================== 复用现有机构管理 API ====================

export function approveOrganizationApi(id: string) {
  return requestClient.post(`/organizations/${id}/approve`);
}

export function rejectOrganizationApi(id: string, data: { reason: string }) {
  return requestClient.post(`/organizations/${id}/reject`, data);
}

export function freezeOrganizationApi(id: string) {
  return requestClient.post(`/organizations/${id}/freeze`);
}

export function unfreezeOrganizationApi(id: string) {
  return requestClient.post(`/organizations/${id}/unfreeze`);
}

export function adjustOrganizationExpireApi(
  id: string,
  data: { days: number; remark?: null | string },
) {
  return requestClient.post(`/organizations/${id}/adjust-expire`, data);
}
