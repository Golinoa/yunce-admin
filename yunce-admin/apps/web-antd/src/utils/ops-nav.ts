/** 运营导航 / 看板深链（纯函数，便于单测） */

export type OpsDeepLink = {
  path: string;
  query: Record<string, string>;
};

/** 会员到期预警 → 会员管理（可带用户） */
export function buildMembershipAlertLink(input?: {
  profileId?: null | string;
  status?: 'ACTIVE' | 'EXPIRED';
}): OpsDeepLink {
  const query: Record<string, string> = {};
  if (input?.status) query.status = input.status;
  if (input?.profileId) query.profileId = input.profileId;
  return { path: '/operation/memberships', query };
}

/** 反馈预警 → 反馈中心 */
export function buildFeedbackAlertLink(input?: {
  handleStatus?: 'CLOSED' | 'PENDING' | 'PROCESSING' | 'RESOLVED';
  keyword?: null | string;
}): OpsDeepLink {
  const query: Record<string, string> = {};
  if (input?.handleStatus) query.handleStatus = input.handleStatus;
  if (input?.keyword?.trim()) query.keyword = input.keyword.trim();
  return { path: '/operation/feedbacks', query };
}

/** 入驻待办 → 入驻列表 */
export function buildStoreEntryLink(input?: {
  status?: 'APPROVED' | 'PENDING' | 'REJECTED';
}): OpsDeepLink {
  const query: Record<string, string> = {};
  if (input?.status) query.status = input.status;
  return { path: '/operation/store-entry', query };
}

/** 激活码入口 */
export function buildActivationCodesLink(input?: {
  channel?: null | string;
  status?: 'EXPIRED' | 'UNUSED' | 'USED' | 'VOIDED';
}): OpsDeepLink {
  const query: Record<string, string> = {};
  if (input?.status) query.status = input.status;
  if (input?.channel?.trim()) query.channel = input.channel.trim();
  return { path: '/operation/activation-codes', query };
}

/** 邀请积分入口 */
export function buildInvitesLink(): OpsDeepLink {
  return { path: '/operation/invites', query: {} };
}

export function resolveRouteQueryString(
  query: Record<string, unknown>,
  key: string,
): string {
  const raw = query[key];
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw) && typeof raw[0] === 'string') return raw[0];
  return '';
}
