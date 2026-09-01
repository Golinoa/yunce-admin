import { describe, expect, it } from 'vitest';

import {
  formatNumber,
  formatPercent,
  resolveDaysLeftText,
  resolveDisplayName,
  resolveFeedbackTypeLabel,
  resolveHandleStatusColor,
  resolveHandleStatusLabel,
  resolveHealthStatus,
  toPercent,
} from '#/views/dashboard/analytics/dashboard-format';

describe('dashboard-format', () => {
  it('formats numbers and percents', () => {
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(null)).toBe('0');
    expect(formatPercent(12.345)).toBe('12.35%');
  });

  it('resolves display labels', () => {
    expect(resolveDisplayName({ name: '张三' })).toBe('张三');
    expect(resolveDisplayName({ nickname: '小张' })).toBe('小张');
    expect(resolveDisplayName({})).toBe('未命名用户');
    expect(resolveFeedbackTypeLabel('BUG')).toBe('问题反馈');
    expect(resolveHandleStatusLabel('PENDING')).toBe('待处理');
    expect(resolveHandleStatusColor('RESOLVED')).toBe('green');
  });

  it('computes membership and health helpers', () => {
    expect(resolveDaysLeftText(0)).toBe('今天到期');
    expect(resolveDaysLeftText(1)).toBe('明天到期');
    expect(resolveDaysLeftText(5)).toBe('5 天后到期');
    expect(toPercent(1, 0)).toBe(0);
    expect(toPercent(1, 4)).toBe(25);
    expect(resolveHealthStatus(80)).toBe('success');
    expect(resolveHealthStatus(40)).toBe('normal');
    expect(resolveHealthStatus(10)).toBe('error');
  });
});
