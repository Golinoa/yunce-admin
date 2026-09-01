/** 运营看板纯展示辅助（从 analytics 页拆出，便于单测） */

export function formatNumber(value?: null | number) {
  return new Intl.NumberFormat('zh-CN').format(value ?? 0);
}

export function formatPercent(value?: null | number) {
  return `${(value ?? 0).toFixed(2)}%`;
}

export function formatDateTime(value?: null | string) {
  if (!value) {
    return '-';
  }
  return new Date(value).toLocaleString('zh-CN', { hour12: false });
}

export function resolveDisplayName(profile?: {
  name?: null | string;
  nickname?: null | string;
}) {
  return profile?.name || profile?.nickname || '未命名用户';
}

export function resolveFeedbackTypeLabel(type: 'BUG' | 'FEATURE' | 'OTHER') {
  if (type === 'BUG') {
    return '问题反馈';
  }
  if (type === 'FEATURE') {
    return '功能建议';
  }
  return '其他反馈';
}

export function resolveHandleStatusLabel(
  status: 'CLOSED' | 'PENDING' | 'PROCESSING' | 'RESOLVED',
) {
  if (status === 'PENDING') {
    return '待处理';
  }
  if (status === 'PROCESSING') {
    return '处理中';
  }
  if (status === 'RESOLVED') {
    return '已解决';
  }
  return '已关闭';
}

export function resolveHandleStatusColor(
  status: 'CLOSED' | 'PENDING' | 'PROCESSING' | 'RESOLVED',
) {
  if (status === 'PENDING') {
    return 'red';
  }
  if (status === 'PROCESSING') {
    return 'orange';
  }
  if (status === 'RESOLVED') {
    return 'green';
  }
  return 'default';
}

export function resolveDaysLeftText(daysLeft: number) {
  if (daysLeft <= 0) {
    return '今天到期';
  }
  if (daysLeft === 1) {
    return '明天到期';
  }
  return `${daysLeft} 天后到期`;
}

export function toPercent(numerator: number, denominator: number) {
  if (!denominator) {
    return 0;
  }
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function resolveHealthStatus(value: number) {
  if (value >= 60) {
    return 'success' as const;
  }
  if (value >= 30) {
    return 'normal' as const;
  }
  return 'error' as const;
}

export const DASHBOARD_WINDOW_OPTIONS = [
  { label: '7 天', value: 7 },
  { label: '14 天', value: 14 },
  { label: '30 天', value: 30 },
] as const;
