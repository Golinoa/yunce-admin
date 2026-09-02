/** 增长摘要：激活码渠道 / 邀请规则（纯聚合） */

export type ActivationCodeLike = {
  channel?: null | string;
  status: 'EXPIRED' | 'UNUSED' | 'USED' | 'VOIDED';
};

export type ChannelActivationSummary = {
  channel: string;
  expired: number;
  total: number;
  unused: number;
  used: number;
  voided: number;
};

export function summarizeActivationByChannel(
  list: ActivationCodeLike[],
): ChannelActivationSummary[] {
  const map = new Map<string, ChannelActivationSummary>();
  for (const item of list) {
    const channel = item.channel?.trim() || '未填渠道';
    let row = map.get(channel);
    if (!row) {
      row = {
        channel,
        total: 0,
        unused: 0,
        used: 0,
        expired: 0,
        voided: 0,
      };
      map.set(channel, row);
    }
    row.total += 1;
    if (item.status === 'UNUSED') row.unused += 1;
    else if (item.status === 'USED') row.used += 1;
    else if (item.status === 'EXPIRED') row.expired += 1;
    else row.voided += 1;
  }
  return [...map.values()].toSorted(
    (a, b) => b.total - a.total || a.channel.localeCompare(b.channel),
  );
}

export type InviteRuleLike = {
  enabled: boolean;
};

export function summarizeInviteRules(rules: InviteRuleLike[]) {
  const enabled = rules.filter((r) => r.enabled).length;
  return {
    enabled,
    total: rules.length,
    disabled: rules.length - enabled,
  };
}

export type MembershipPlanLike = {
  id: string;
  isActive?: boolean;
  name: string;
};

export function toTrialPlanSelectOptions(plans: MembershipPlanLike[]) {
  return plans
    .filter((p) => p.isActive !== false)
    .map((p) => ({
      label: p.name,
      value: p.id,
    }));
}
