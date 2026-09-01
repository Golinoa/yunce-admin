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
  getDashboardOverviewApi,
  grantMembershipApi,
  voidActivationCodeApi,
} from '#/api/core/admin';
import {
  approveOrganizationApi,
  freezeOrganizationApi,
  getOrganizationsApi,
} from '#/api/core/organization';

describe('admin api contracts', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    put.mockReset();
    del.mockReset();
    get.mockResolvedValue({});
    post.mockResolvedValue({});
  });

  it('getDashboardOverviewApi passes days', async () => {
    await getDashboardOverviewApi(7);
    expect(get).toHaveBeenCalledWith('/dashboard/overview', {
      params: { days: 7 },
    });
  });

  it('voidActivationCodeApi posts void path', async () => {
    await voidActivationCodeApi('code-1');
    expect(post).toHaveBeenCalledWith('/activation-codes/code-1/void');
  });

  it('grantMembershipApi posts grant payload', async () => {
    const payload = { userId: 'u1', planId: 'p1' };
    await grantMembershipApi(payload);
    expect(post).toHaveBeenCalledWith('/memberships/grant', payload);
  });
});

describe('organization api contracts', () => {
  beforeEach(() => {
    get.mockReset();
    post.mockReset();
    get.mockResolvedValue({});
    post.mockResolvedValue({});
  });

  it('lists organizations with query', async () => {
    await getOrganizationsApi({ page: 1, status: 'ACTIVE' });
    expect(get).toHaveBeenCalledWith('/organizations', {
      params: { page: 1, status: 'ACTIVE' },
    });
  });

  it('freezes and approves organization', async () => {
    await freezeOrganizationApi('org-1');
    expect(post).toHaveBeenCalledWith('/organizations/org-1/freeze');
    await approveOrganizationApi('org-2');
    expect(post).toHaveBeenCalledWith('/organizations/org-2/approve');
  });
});
