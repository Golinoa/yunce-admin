/** 机构列表操作分区：日常外露 / 危险收纳 */

export type OrgActionKey =
  | 'detail'
  | 'dissolve'
  | 'expire'
  | 'freeze'
  | 'toggleTest'
  | 'unbind'
  | 'unfreeze'
  | 'version';

export const ORG_PRIMARY_ACTIONS: OrgActionKey[] = [
  'detail',
  'version',
  'freeze',
  'unfreeze',
];

export const ORG_MORE_ACTIONS: OrgActionKey[] = [
  'expire',
  'toggleTest',
  'unbind',
  'dissolve',
];

export function isOrgPrimaryAction(key: OrgActionKey): boolean {
  return ORG_PRIMARY_ACTIONS.includes(key);
}

export function isOrgMoreAction(key: OrgActionKey): boolean {
  return ORG_MORE_ACTIONS.includes(key);
}
