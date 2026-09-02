import { beforeEach, describe, expect, it, vi } from 'vitest';

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}));

vi.mock('#/api/request', () => ({
  requestClient: {
    get,
    post,
    put,
    delete: del,
  },
}));

import {
  batchCreateActivationCodesApi,
  batchDeleteActivationCodesApi,
  getActivationCodesApi,
  getAuditLogsApi,
  getDashboardOverviewApi,
  getFeedbacksApi,
  getMembershipsApi,
  getUsersApi,
  grantMembershipApi,
  updateFeedbackHandleApi,
  voidActivationCodeApi,
} from '#/api/core/admin';
import {
  approveStoreEntryApplicationApi,
  freezeOrganizationApi,
  getOrganizationQuotaUsageApi,
  getOrganizationsApi,
  getOrganizationVersionsApi,
  getStoreEntryApplicationsApi,
  rejectStoreEntryApplicationApi,
  unfreezeOrganizationApi,
} from '#/api/core/organization';

describe('admin api contracts', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
    del.mockReset();
    get.mockResolvedValue({});
    post.mockResolvedValue({});
    put.mockResolvedValue({});
    del.mockResolvedValue({});
  });

  it('covers dashboard / users / feedback / membership / activation paths', async () => {
    await getDashboardOverviewApi(7);
    expect(get).toHaveBeenCalledWith('/dashboard/overview', {
      params: { days: 7 },
    });

    await getAuditLogsApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/audit-logs', { params: { page: 1 } });

    await getFeedbacksApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/feedbacks', { params: { page: 1 } });

    await updateFeedbackHandleApi('f1', { handleStatus: 'RESOLVED' });
    expect(put).toHaveBeenCalledWith('/feedbacks/f1/handle', {
      handleStatus: 'RESOLVED',
    });

    await getUsersApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/users', { params: { page: 1 } });

    await getMembershipsApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/memberships', { params: { page: 1 } });

    const grant = { userId: 'u1', planId: 'p1' };
    await grantMembershipApi(grant);
    expect(post).toHaveBeenCalledWith('/memberships/grant', grant);

    await getActivationCodesApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/activation-codes', {
      params: { page: 1 },
    });

    await batchCreateActivationCodesApi({ count: 2 });
    expect(post).toHaveBeenCalledWith('/activation-codes/batch-create', {
      count: 2,
    });

    await batchDeleteActivationCodesApi({ ids: ['a'] });
    expect(del).toHaveBeenCalledWith('/activation-codes', {
      data: { ids: ['a'] },
    });

    await voidActivationCodeApi('code-1');
    expect(post).toHaveBeenCalledWith('/activation-codes/code-1/void');
  });
});

describe('organization api contracts', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    get.mockResolvedValue({});
    post.mockResolvedValue({});
  });

  it('covers org list / lifecycle / store-entry / versions / quota', async () => {
    await getOrganizationsApi({ page: 1, status: 'ACTIVE' });
    expect(get).toHaveBeenCalledWith('/organizations', {
      params: { page: 1, status: 'ACTIVE' },
    });

    await freezeOrganizationApi('org-1');
    expect(post).toHaveBeenCalledWith('/organizations/org-1/freeze');

    await unfreezeOrganizationApi('org-1');
    expect(post).toHaveBeenCalledWith('/organizations/org-1/unfreeze');

    await getStoreEntryApplicationsApi({ page: 1 });
    expect(get).toHaveBeenCalledWith('/store-entry/applications', {
      params: { page: 1 },
    });

    await approveStoreEntryApplicationApi('s1', { isTest: true });
    expect(post).toHaveBeenCalledWith('/store-entry/applications/s1/approve', {
      isTest: true,
    });

    await rejectStoreEntryApplicationApi('s2', { reason: 'bad' });
    expect(post).toHaveBeenCalledWith('/store-entry/applications/s2/reject', {
      reason: 'bad',
    });

    await getOrganizationVersionsApi();
    expect(get).toHaveBeenCalledWith('/organization-versions', {
      params: undefined,
    });

    await getOrganizationQuotaUsageApi('org-9');
    expect(get).toHaveBeenCalledWith('/organizations/org-9/quota-usage');
  });
});
