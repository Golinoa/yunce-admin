import type { OrganizationVersionCode, OrganizationVersionItem } from '#/api';

export type QuotaFeatures = Record<string, boolean>;

/** 默认档位兜底（接口缺行时仍能选） */
export const DEFAULT_ORGANIZATION_VERSIONS: Array<{
  code: OrganizationVersionCode;
  description: string;
  features: QuotaFeatures;
  maxCampuses: number;
  maxEmployees: number;
  maxMembers: number;
  name: string;
}> = [
  {
    code: 'TRIAL',
    name: '试用版',
    description: '试用版：低配额，仅核心排课/学员',
    maxMembers: 20,
    maxEmployees: 2,
    maxCampuses: 1,
    features: {},
  },
  {
    code: 'FREE',
    name: '免费版',
    description: '40 会员 / 2 员工 / 1 校区；禁线索溯源、禁批量导入导出',
    maxMembers: 40,
    maxEmployees: 2,
    maxCampuses: 1,
    features: { leadTrace: false, batchImportExport: false },
  },
  {
    code: 'STANDARD',
    name: '标准版',
    description: '200 会员 / 20 员工 / 1 校区；开启线索溯源',
    maxMembers: 200,
    maxEmployees: 20,
    maxCampuses: 1,
    features: { leadTrace: true, batchImportExport: false },
  },
  {
    code: 'FLAGSHIP',
    name: '旗舰版',
    description: '1000 会员 / 100 员工 / 3 校区；全功能',
    maxMembers: 1000,
    maxEmployees: 100,
    maxCampuses: 3,
    features: { leadTrace: true, batchImportExport: true },
  },
];

const VERSION_COLOR: Record<string, string> = {
  TRIAL: 'orange',
  FREE: 'default',
  STANDARD: 'blue',
  FLAGSHIP: 'purple',
};

export function normalizeVersionFeatures(raw: unknown): QuotaFeatures {
  let value: unknown = raw;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return {};
    }
  }
  if (!value || typeof value !== 'object') {
    return {};
  }
  const result: QuotaFeatures = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === 'boolean') result[k] = v;
  }
  return result;
}

export function normalizeOrganizationVersion(
  item: OrganizationVersionItem,
): OrganizationVersionItem {
  return {
    ...item,
    features: normalizeVersionFeatures(item.features),
  };
}

/**
 * 仅规范化接口返回的档位列表，不注入本地 fallback。
 * 写操作（调版本 / 存矩阵）必须用此函数，避免把不存在的档位提交到后端。
 */
export function listOrganizationVersionsFromApi(
  list: null | OrganizationVersionItem[] | undefined,
): OrganizationVersionItem[] {
  return (list ?? [])
    .map((item) => normalizeOrganizationVersion(item))
    .toSorted((a, b) => a.sort - b.sort || a.code.localeCompare(b.code));
}

/** @deprecated 别名，等同 listOrganizationVersionsFromApi（已不再注入 fallback） */
export function mergeOrganizationVersionCatalog(
  list: null | OrganizationVersionItem[] | undefined,
): OrganizationVersionItem[] {
  return listOrganizationVersionsFromApi(list);
}

export function versionColor(code: OrganizationVersionCode | string) {
  return VERSION_COLOR[String(code)] ?? 'default';
}

export function versionName(
  code: OrganizationVersionCode | string,
  catalog?: OrganizationVersionItem[],
) {
  const fromCatalog = catalog?.find((item) => item.code === code)?.name;
  if (fromCatalog) {
    return fromCatalog;
  }
  return (
    DEFAULT_ORGANIZATION_VERSIONS.find((item) => item.code === code)?.name ??
    String(code)
  );
}

/** 列表展示：免费版 · FREE */
export function formatVersionLabel(
  code: OrganizationVersionCode | string,
  catalog?: OrganizationVersionItem[],
) {
  const name = versionName(code, catalog);
  return name === code ? String(code) : `${name} · ${code}`;
}

export function buildVersionSelectOptions(catalog: OrganizationVersionItem[]) {
  return catalog.map((item) => ({
    label: `${item.name}（${item.code}）`,
    value: item.code,
    disabled: item.status === 'disabled',
  }));
}
