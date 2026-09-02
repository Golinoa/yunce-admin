import { describe, expect, it } from 'vitest';

import {
  buildActivationCodesLink,
  buildFeedbackAlertLink,
  buildInvitesLink,
  buildMembershipAlertLink,
  buildStoreEntryLink,
  resolveRouteQueryString,
} from '#/utils/ops-nav';

describe('ops-nav deep links', () => {
  it('builds membership alert link with optional filters', () => {
    expect(buildMembershipAlertLink()).toEqual({
      path: '/operation/memberships',
      query: {},
    });
    expect(
      buildMembershipAlertLink({ profileId: 'u1', status: 'ACTIVE' }),
    ).toEqual({
      path: '/operation/memberships',
      query: { profileId: 'u1', status: 'ACTIVE' },
    });
  });

  it('builds feedback alert link', () => {
    expect(
      buildFeedbackAlertLink({
        handleStatus: 'PENDING',
        keyword: ' 138 ',
      }),
    ).toEqual({
      path: '/operation/feedbacks',
      query: { handleStatus: 'PENDING', keyword: '138' },
    });
  });

  it('builds store-entry / activation / invites links', () => {
    expect(buildStoreEntryLink({ status: 'PENDING' }).query.status).toBe(
      'PENDING',
    );
    expect(
      buildActivationCodesLink({ channel: '抖音', status: 'UNUSED' }).query,
    ).toEqual({ channel: '抖音', status: 'UNUSED' });
    expect(buildInvitesLink().path).toBe('/operation/invites');
  });

  it('resolves route query string safely', () => {
    expect(resolveRouteQueryString({ a: 'x' }, 'a')).toBe('x');
    expect(resolveRouteQueryString({ a: ['y', 'z'] }, 'a')).toBe('y');
    expect(resolveRouteQueryString({}, 'a')).toBe('');
  });
});
