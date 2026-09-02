import { describe, expect, it } from 'vitest';

import {
  isOrgMoreAction,
  isOrgPrimaryAction,
  ORG_MORE_ACTIONS,
  ORG_PRIMARY_ACTIONS,
} from '#/utils/org-actions';

describe('org-actions', () => {
  it('keeps daily actions primary and danger in more', () => {
    expect(ORG_PRIMARY_ACTIONS).toEqual([
      'detail',
      'version',
      'freeze',
      'unfreeze',
    ]);
    expect(ORG_MORE_ACTIONS).toContain('dissolve');
    expect(ORG_MORE_ACTIONS).toContain('unbind');
    expect(isOrgPrimaryAction('detail')).toBe(true);
    expect(isOrgMoreAction('dissolve')).toBe(true);
    expect(isOrgPrimaryAction('dissolve')).toBe(false);
  });
});
