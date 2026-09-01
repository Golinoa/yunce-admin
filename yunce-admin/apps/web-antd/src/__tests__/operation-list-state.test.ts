import { describe, expect, it } from 'vitest';

import { createOperationListState } from '#/views/operation/composables/useOperationListState';

describe('createOperationListState', () => {
  it('initializes defaults and resets page', () => {
    const state = createOperationListState({ pageSize: 10 });
    expect(state.query.page).toBe(1);
    expect(state.query.pageSize).toBe(10);
    state.query.page = 3;
    state.resetPage();
    expect(state.query.page).toBe(1);
    state.setTotal(42);
    expect(state.total.value).toBe(42);
  });
});
