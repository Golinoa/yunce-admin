/** 用户搜索选择器纯逻辑 */

export type UserPickerRecord = {
  id: string;
  name?: null | string;
  nickname?: null | string;
  phone?: null | string;
};

export function formatUserPickerLabel(user: UserPickerRecord): string {
  const name = user.name || user.nickname || '未命名';
  const phone = user.phone?.trim();
  return phone ? `${name} · ${phone}` : `${name} · ${user.id.slice(0, 8)}`;
}

export function toUserPickerOptions(list: UserPickerRecord[]) {
  return list.map((user) => ({
    label: formatUserPickerLabel(user),
    value: user.id,
    user,
  }));
}

export type UserPickerOption = ReturnType<typeof toUserPickerOptions>[number];

/** 从详情/列表接口字段归一成选择器用户 */
export function normalizeUserPickerRecord(
  raw: null | Record<string, unknown> | undefined,
  fallbackId?: string,
): null | UserPickerRecord {
  if (!raw && !fallbackId) return null;
  const nested =
    raw && typeof raw.profile === 'object' && raw.profile
      ? (raw.profile as Record<string, unknown>)
      : null;
  const id =
    (typeof raw?.id === 'string' && raw.id) ||
    (typeof nested?.id === 'string' && nested.id) ||
    fallbackId ||
    '';
  if (!id) return null;
  const name =
    (typeof raw?.name === 'string' && raw.name) ||
    (typeof nested?.name === 'string' && nested.name) ||
    null;
  const nickname =
    (typeof raw?.nickname === 'string' && raw.nickname) ||
    (typeof nested?.nickname === 'string' && nested.nickname) ||
    null;
  const phone =
    (typeof raw?.phone === 'string' && raw.phone) ||
    (typeof nested?.phone === 'string' && nested.phone) ||
    null;
  return { id, name, nickname, phone };
}

/** 保证选中 id 在 options 中有可读 label；已有则保留搜索结果顺序 */
export function upsertSelectedUserOption(
  options: UserPickerOption[],
  user: UserPickerRecord,
): UserPickerOption[] {
  const next = {
    label: formatUserPickerLabel(user),
    value: user.id,
    user,
  };
  const without = options.filter((o) => o.value !== user.id);
  return [next, ...without];
}

/** 搜索关键词最短长度，避免空搜打爆接口 */
export function shouldSearchUsers(keyword: string): boolean {
  return keyword.trim().length >= 2;
}
