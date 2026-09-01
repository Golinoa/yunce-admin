<script lang="ts" setup>
import type { SystemServiceVersion, SystemVersionsResult } from '#/api';

import { computed, onMounted, ref } from 'vue';

import { message } from 'ant-design-vue';

import { getSystemVersionsApi } from '#/api';

import OperationTablePage from '../components/OperationTablePage.vue';

/** 与发版 tag dashboard-v* 对齐；Docker 构建时由 ARG 注入 */
const DASHBOARD_RELEASE =
  (import.meta.env.VITE_DASHBOARD_VERSION as string | undefined)?.trim() ||
  '1.0.4';

const loading = ref(false);
const remote = ref<null | SystemVersionsResult>(null);

const rows = computed(() => {
  const byKey = new Map((remote.value?.services ?? []).map((s) => [s.key, s]));
  const order: Array<SystemServiceVersion['key']> = [
    'backend',
    'dashboard',
    'miniprogram',
  ];
  return order.map((key) => {
    const item = byKey.get(key);
    if (key === 'dashboard') {
      return {
        key,
        name: '运营后台',
        version: DASHBOARD_RELEASE,
        serverHint: item?.version || null,
        note: '当前浏览器页面构建版本（VITE_DASHBOARD_VERSION）',
      };
    }
    let fallbackName = '小程序前端';
    if (key === 'backend') {
      fallbackName = '后端 API';
    }
    return {
      key,
      name: item?.name ?? fallbackName,
      version: item?.version || '未配置',
      serverHint: null as null | string,
      note: item?.note ?? '',
    };
  });
});

async function fetchVersions() {
  loading.value = true;
  try {
    remote.value = await getSystemVersionsApi();
  } catch {
    remote.value = null;
    message.warning('无法拉取服务端版本，仅展示运营端本机版本');
  } finally {
    loading.value = false;
  }
}

onMounted(fetchVersions);
</script>

<template>
  <OperationTablePage title="系统版本" :loading="loading">
    <template #actions>
      <a-button @click="fetchVersions">刷新</a-button>
    </template>

    <div
      class="mb-4 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-[13px] text-[var(--ant-color-text-secondary)]"
    >
      对照线上各端发布版本。后端来自 API
      进程；运营端来自本页构建注入；小程序需在后端
      <code>.env</code> 配置 <code>MINI_PROGRAM_VERSION</code>（发版后更新）。
    </div>

    <a-table
      :columns="[
        { title: '服务', dataIndex: 'name', width: 140 },
        { title: '版本', dataIndex: 'version', width: 200 },
        { title: '说明', dataIndex: 'note' },
      ]"
      :data-source="rows"
      :pagination="false"
      row-key="key"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'version'">
          <a-tag color="blue">{{ record.version }}</a-tag>
          <span
            v-if="record.serverHint && record.serverHint !== record.version"
            class="ml-2 text-xs text-[var(--ant-color-text-secondary)]"
          >
            服务端配置：{{ record.serverHint }}
          </span>
        </template>
      </template>
    </a-table>

    <template #footer>
      <div
        v-if="remote"
        class="text-[13px] text-[var(--ant-color-text-secondary)]"
      >
        <div>API 环境：{{ remote.nodeEnv }}</div>
        <div>API 公网：{{ remote.apiPublicOrigin }}</div>
        <div>Dashboard 公网：{{ remote.dashboardPublicOrigin }}</div>
        <div>服务端时间：{{ remote.serverTime }}</div>
      </div>
    </template>
  </OperationTablePage>
</template>
