/** 权益档 code（与 Organization.versionCode / MembershipPlan.targetVersionCode 对齐） */
export const ENTITLEMENT_CODES = [
  'TRIAL',
  'FREE',
  'BASIC',
  'STANDARD',
  'FLAGSHIP',
] as const;

export type EntitlementVersionCode = (typeof ENTITLEMENT_CODES)[number];

const ENTITLEMENT_SET = new Set<string>(ENTITLEMENT_CODES);

/** 是否为权益档（功能权限矩阵参与方） */
export function isEntitlementVersionCode(code: string): boolean {
  return ENTITLEMENT_SET.has(String(code).trim().toUpperCase());
}

/**
 * 是否为货架年限 SKU（仅营销定价，不参与功能权限）。
 * 约定：含 `_2Y` / `_3Y`，或以 `TEST_` 开头。
 */
export function isPaySkuVersionCode(code: string): boolean {
  const normalized = String(code).trim().toUpperCase();
  if (!normalized) return false;
  if (normalized.startsWith('TEST_')) return true;
  return /_(2Y|3Y)(_|$)/.test(normalized) || /_(2Y|3Y)$/.test(normalized);
}

/** 将版本目录拆成权益档 vs 货架 SKU */
export function splitOrganizationVersions<T extends { code: string }>(
  list: T[],
): { entitlements: T[]; paySkus: T[] } {
  const entitlements: T[] = [];
  const paySkus: T[] = [];
  for (const item of list) {
    if (isPaySkuVersionCode(item.code)) {
      paySkus.push(item);
    } else if (isEntitlementVersionCode(item.code)) {
      entitlements.push(item);
    } else if (
      /_\d+Y(_|$)/.test(String(item.code).toUpperCase()) ||
      String(item.code).toUpperCase().startsWith('TEST_')
    ) {
      paySkus.push(item);
    } else {
      // 未知 code：按非货架归入权益侧，避免矩阵漏列；货架侧仅明确营销 SKU
      entitlements.push(item);
    }
  }
  return { entitlements, paySkus };
}
