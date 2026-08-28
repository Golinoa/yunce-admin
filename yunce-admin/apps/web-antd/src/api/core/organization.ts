import { requestClient } from '#/api/request';

/** 机构版本编码（可自由扩展，如 TRIAL / FREE / STANDARD / FLAGSHIP / ENTERPRISE） */
export type OrganizationVersionCode = string;

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

/** 版本功能开关（FeatureModule.code → boolean） */
export type QuotaFeatures = Record<string, boolean>;

/** 功能模块目录项 */
export interface FeatureModuleItem {
  category: string;
  code: string;
  createdAt: string;
  description?: null | string;
  id: string;
  name: string;
  sort: number;
  status: string;
  updatedAt: string;
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
    isTest?: boolean;
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
    isTest?: boolean;
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
  isTest: boolean;
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
  ownerId?: null | string;
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

export function approveStoreEntryApplicationApi(
  id: string,
  data?: { isTest?: boolean },
) {
  return requestClient.post<{
    applicationId: string;
    campusId: string;
    isTest: boolean;
    organizationId: string;
    success: boolean;
  }>(`/store-entry/applications/${id}/approve`, data ?? {});
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

export function createOrganizationVersionApi(data: {
  code: string;
  description?: null | string;
  durationDays?: number;
  features?: QuotaFeatures;
  maxCampuses?: number;
  maxEmployees?: number;
  maxMembers?: number;
  name: string;
  price?: number;
  sort?: number;
  status?: string;
}) {
  return requestClient.post<OrganizationVersionItem>('/organization-versions', data);
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

export function updateFeatureMatrixApi(data: {
  matrix: Record<string, Record<string, boolean>>;
}) {
  return requestClient.put<{ list: OrganizationVersionItem[] }>(
    '/organization-versions/matrix',
    data,
  );
}

export function getFeatureModulesApi() {
  return requestClient.get<{ list: FeatureModuleItem[] }>('/feature-modules');
}

export function updateFeatureModuleApi(
  code: string,
  data: Partial<{
    category: string;
    description?: null | string;
    name: string;
    sort: number;
    status: 'active' | 'disabled';
  }>,
) {
  return requestClient.put<FeatureModuleItem>(`/feature-modules/${code}`, data);
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

export function setOrganizationIsTestApi(id: string, data: { isTest: boolean }) {
  return requestClient.post(`/organizations/${id}/is-test`, data);
}

export function unbindOrganizationOwnerApi(id: string) {
  return requestClient.post(`/organizations/${id}/unbind-owner`);
}

export function dissolveOrganizationApi(id: string) {
  return requestClient.post(`/organizations/${id}/dissolve`);
}
