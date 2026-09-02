import { describe, expect, it } from 'vitest';

import {
  listOrganizationVersionsFromApi,
  mergeOrganizationVersionCatalog,
} from '../utils/organization-version';

describe('organization-version catalog', () => {
  it('listOrganizationVersionsFromApi does not inject fallback rows', () => {
    const list = listOrganizationVersionsFromApi([
      {
        id: '1',
        code: 'FREE',
        name: '免费版',
        description: null,
        maxMembers: 40,
        maxEmployees: 2,
        maxCampuses: 1,
        features: { leadTrace: false },
        price: 0,
        durationDays: 365,
        status: 'active',
        sort: 1,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]?.code).toBe('FREE');
    expect(list.every((item) => !String(item.id).startsWith('fallback-'))).toBe(
      true,
    );
  });

  it('mergeOrganizationVersionCatalog aliases to api list only', () => {
    expect(mergeOrganizationVersionCatalog([])).toEqual([]);
    expect(mergeOrganizationVersionCatalog(undefined)).toEqual([]);
  });
});
