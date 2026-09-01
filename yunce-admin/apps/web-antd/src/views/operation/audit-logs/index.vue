<script lang="ts" setup>
import type { AuditLogItem } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { getAuditLogsApi } from '#/api';

import OperationTablePage from '../components/OperationTablePage.vue';

const loading = ref(false);
const records = ref<AuditLogItem[]>([]);
const filters = reactive({
  action: '',
  keyword: '',
  module: '',
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

async function fetchAuditLogs() {
  loading.value = true;
  try {
    const result = await getAuditLogsApi({
      action: filters.action || undefined,
      keyword: filters.keyword || undefined,
      module: filters.module || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    records.value = result.list;
    pagination.total = result.pagination.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchAuditLogs();
}

function handleReset() {
  filters.action = '';
  filters.keyword = '';
  filters.module = '';
  pagination.page = 1;
  void fetchAuditLogs();
}

onMounted(fetchAuditLogs);
</script>

<template>
  <OperationTablePage title="审计日志" :loading="loading">
    <template #filters>
      <a-form layout="inline">
        <a-form-item label="模块">
          <a-input
            v-model:value="filters.module"
            allow-clear
            placeholder="如 membership"
          />
        </a-form-item>
        <a-form-item label="动作">
          <a-input
            v-model:value="filters.action"
            allow-clear
            placeholder="如 CREATE"
          />
        </a-form-item>
        <a-form-item label="关键字">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="详情、目标ID、管理员"
          />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">查询</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </template>

    <a-table
      :columns="[
        { title: '时间', dataIndex: 'createdAt', width: 180 },
        { title: '管理员', key: 'adminUser', width: 160 },
        { title: '模块', dataIndex: 'module', width: 140 },
        { title: '动作', dataIndex: 'action', width: 140 },
        { title: '目标 ID', dataIndex: 'targetId', width: 220 },
        { title: '详情', dataIndex: 'detail' },
      ]"
      :data-source="records"
      :loading="loading"
      :pagination="{
        current: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: (page: number, pageSize: number) => {
          pagination.page = page;
          pagination.pageSize = pageSize;
          fetchAuditLogs();
        },
      }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'adminUser'">
          {{ record.adminUser?.nickname || record.adminUser?.username || '-' }}
        </template>
        <template v-else-if="column.dataIndex === 'targetId'">
          {{ record.targetId || '-' }}
        </template>
        <template v-else-if="column.dataIndex === 'detail'">
          {{ record.detail || '-' }}
        </template>
      </template>
    </a-table>
  </OperationTablePage>
</template>
