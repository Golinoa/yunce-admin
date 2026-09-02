<script lang="ts" setup>
import { ref, watch } from 'vue';

import { getUserDetailApi, getUsersApi } from '#/api';
import {
  normalizeUserPickerRecord,
  shouldSearchUsers,
  toUserPickerOptions,
  upsertSelectedUserOption,
  type UserPickerOption,
  type UserPickerRecord,
} from '#/utils/user-picker';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
  }>(),
  {
    placeholder: '输入姓名或手机号搜索',
  },
);

const model = defineModel<string>({ default: '' });

const options = ref<UserPickerOption[]>([]);
const fetching = ref(false);
let timer: null | ReturnType<typeof setTimeout> = null;
let resolveSeq = 0;

async function search(keyword: string) {
  if (!shouldSearchUsers(keyword)) {
    options.value = [];
    if (model.value) {
      void resolveSelected(model.value);
    }
    return;
  }
  fetching.value = true;
  try {
    const result = await getUsersApi({
      keyword: keyword.trim(),
      page: 1,
      pageSize: 20,
    });
    const list = (result?.list ?? result ?? []) as UserPickerRecord[];
    options.value = toUserPickerOptions(Array.isArray(list) ? list : []);
    if (model.value && !options.value.some((o) => o.value === model.value)) {
      void resolveSelected(model.value);
    }
  } finally {
    fetching.value = false;
  }
}

function onSearch(keyword: string) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void search(keyword);
  }, 300);
}

async function resolveSelected(id: string) {
  if (!id) return;
  const existing = options.value.find((o) => o.value === id);
  if (existing && existing.user.name) return;
  if (existing && existing.user.nickname) return;
  if (existing && existing.user.phone) return;

  const seq = ++resolveSeq;
  options.value = upsertSelectedUserOption(options.value, { id });
  try {
    const detail = await getUserDetailApi(id);
    if (seq !== resolveSeq) return;
    const user = normalizeUserPickerRecord(
      detail as Record<string, unknown>,
      id,
    );
    if (!user) return;
    options.value = upsertSelectedUserOption(options.value, user);
  } catch {
    // keep short-id fallback label
  }
}

watch(
  () => model.value,
  (id) => {
    if (!id) return;
    void resolveSelected(id);
  },
  { immediate: true },
);
</script>

<template>
  <a-select
    v-model:value="model"
    show-search
    allow-clear
    :filter-option="false"
    :placeholder="props.placeholder"
    :options="options"
    :not-found-content="fetching ? '搜索中…' : '输入至少 2 字搜索'"
    style="width: 100%"
    @search="onSearch"
  />
</template>
