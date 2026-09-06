import { describe, expect, it } from 'vitest';

import {
  ENTITLEMENT_CODES,
  isEntitlementVersionCode,
  isPaySkuVersionCode,
  splitOrganizationVersions,
} from '../utils/organization-version-split';

describe('organization-version-split', () => {
  it('exposes five entitlement codes', () => {
    expect(ENTITLEMENT_CODES).toEqual([
      'TRIAL',
      'FREE',
      'BASIC',
      'STANDARD',
      'FLAGSHIP',
    ]);
  });

  it('isEntitlementVersionCode matches catalog', () => {
    expect(isEntitlementVersionCode('TRIAL')).toBe(true);
    expect(isEntitlementVersionCode('free')).toBe(true);
    expect(isEntitlementVersionCode('BASIC')).toBe(true);
    expect(isEntitlementVersionCode('STANDARD_2Y')).toBe(false);
    expect(isEntitlementVersionCode('TEST_BASIC')).toBe(false);
  });

  it('isPaySkuVersionCode matches _2Y/_3Y/TEST_', () => {
    expect(isPaySkuVersionCode('STANDARD_2Y')).toBe(true);
    expect(isPaySkuVersionCode('FLAGSHIP_3Y')).toBe(true);
    expect(isPaySkuVersionCode('TEST_STANDARD')).toBe(true);
    expect(isPaySkuVersionCode('TEST_BASIC_2Y')).toBe(true);
    expect(isPaySkuVersionCode('STANDARD')).toBe(false);
    expect(isPaySkuVersionCode('FREE')).toBe(false);
  });

  it('splitOrganizationVersions separates entitlements and paySkus', () => {
    const list = [
      { code: 'TRIAL', name: '试用' },
      { code: 'FREE', name: '众创' },
      { code: 'BASIC', name: '基础' },
      { code: 'STANDARD_2Y', name: '标准两年' },
      { code: 'FLAGSHIP_3Y', name: '旗舰三年' },
      { code: 'TEST_STANDARD', name: '测试标准' },
    ];
    const { entitlements, paySkus } = splitOrganizationVersions(list);
    expect(entitlements.map((i) => i.code)).toEqual([
      'TRIAL',
      'FREE',
      'BASIC',
    ]);
    expect(paySkus.map((i) => i.code)).toEqual([
      'STANDARD_2Y',
      'FLAGSHIP_3Y',
      'TEST_STANDARD',
    ]);
  });
});
