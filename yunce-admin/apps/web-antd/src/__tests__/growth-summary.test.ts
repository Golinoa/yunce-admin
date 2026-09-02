import { describe, expect, it } from 'vitest';

import {
  summarizeActivationByChannel,
  summarizeInviteRules,
  toTrialPlanSelectOptions,
} from '#/utils/growth-summary';

describe('growth-summary', () => {
  it('aggregates activation codes by channel', () => {
    const rows = summarizeActivationByChannel([
      { channel: '抖音', status: 'USED' },
      { channel: '抖音', status: 'UNUSED' },
      { channel: null, status: 'VOIDED' },
      { channel: ' 抖音 ', status: 'USED' },
    ]);
    expect(rows[0]).toMatchObject({
      channel: '抖音',
      total: 3,
      used: 2,
      unused: 1,
    });
    expect(rows[1]?.channel).toBe('未填渠道');
  });

  it('summarizes invite rules and trial plan options', () => {
    expect(
      summarizeInviteRules([{ enabled: true }, { enabled: false }, { enabled: true }]),
    ).toEqual({ total: 3, enabled: 2, disabled: 1 });
    expect(
      toTrialPlanSelectOptions([
        { id: 'p1', name: '月卡', isActive: true },
        { id: 'p2', name: '停用', isActive: false },
      ]),
    ).toEqual([{ label: '月卡', value: 'p1' }]);
  });
});
