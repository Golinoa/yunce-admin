import { describe, expect, it } from 'vitest';

import {
  formatUserPickerLabel,
  normalizeUserPickerRecord,
  shouldSearchUsers,
  toUserPickerOptions,
  upsertSelectedUserOption,
} from '#/utils/user-picker';

describe('user-picker', () => {
  it('formats label with phone or short id', () => {
    expect(
      formatUserPickerLabel({
        id: 'abcdefghij',
        name: '张三',
        phone: '13800138000',
      }),
    ).toBe('张三 · 13800138000');
    expect(
      formatUserPickerLabel({
        id: 'abcdefghij',
        nickname: '小张',
      }),
    ).toBe('小张 · abcdefgh');
  });

  it('maps options and gates short keywords', () => {
    const options = toUserPickerOptions([
      { id: 'u1', name: '李四', phone: '139' },
    ]);
    expect(options[0]).toMatchObject({ value: 'u1', label: '李四 · 139' });
    expect(shouldSearchUsers('1')).toBe(false);
    expect(shouldSearchUsers(' 13 ')).toBe(true);
  });

  it('normalizes detail payload and upserts selected option label', () => {
    expect(
      normalizeUserPickerRecord(
        {
          id: 'uid-1',
          nickname: '校长',
          phone: '13700000000',
        },
        'uid-1',
      ),
    ).toEqual({
      id: 'uid-1',
      name: null,
      nickname: '校长',
      phone: '13700000000',
    });
    expect(
      normalizeUserPickerRecord({
        profile: { id: 'uid-2', name: '王五', phone: '136' },
      }),
    ).toMatchObject({ id: 'uid-2', name: '王五', phone: '136' });

    const next = upsertSelectedUserOption(
      [{ label: '旧', value: 'uid-1', user: { id: 'uid-1' } }],
      { id: 'uid-1', name: '张三', phone: '138' },
    );
    expect(next[0]?.label).toBe('张三 · 138');
    expect(next).toHaveLength(1);
  });
});
