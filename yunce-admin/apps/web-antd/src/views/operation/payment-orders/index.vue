<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { getPaymentOrdersApi } from '#/api';

import OperationTablePage from '../components/OperationTablePage.vue';

const loading = ref(false);
const records = ref<Record<string, unknown>[]>([]);
const filters = reactive({
  keyword: '',
  status: undefined as string | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const statusOptions = [
  { label: '已创建', value: 'CREATED' },
  { label: '支付中', value: 'PAYING' },
  { label: '已支付', value: 'PAID' },
  { label: '已履约', value: 'FULFILLED' },
  { label: '失败', value: 'FAILED' },
  { label: '已退款', value: 'REFUNDED' },
];

function formatDateTime(value?: null | string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

async function fetchOrders() {
  loading.value = true;
  try {
    const result = await getPaymentOrdersApi({
      keyword: filters.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
    });
    records.value = result.list ?? [];
    pagination.total = result.pagination?.total ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchOrders();
}

function handleReset() {
  filters.keyword = '';
  filters.status = undefined;
  pagination.page = 1;
  void fetchOrders();
}

onMounted(fetchOrders);
</script>

<template>
  <OperationTablePage title="支付订单" :loading="loading">
    <template #filters>
      <a-form layout="inline">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="单号 / 道具 / 版本"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filters.status"
            allow-clear
            :options="statusOptions"
            placeholder="全部"
            style="width: 140px"
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

    <div
      class="mb-4 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-[13px] text-[var(--ant-color-text-secondary)]"
    >
      只读排查微信支付/履约订单；退款与补差仍走线下或微信后台
    </div>

    <a-table
      :columns="[
        { title: '商户单号', dataIndex: 'outTradeNo' },
        { title: '状态', dataIndex: 'status', width: 100 },
        { title: '版本', dataIndex: 'versionCode', width: 120 },
        { title: '道具ID', dataIndex: 'productId' },
        { title: '金额(分)', dataIndex: 'goodsPrice', width: 100 },
        { title: '机构', dataIndex: ['organization', 'name'] },
        { title: '创建时间', dataIndex: 'createdAt', width: 160 },
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
          fetchOrders();
        },
      }"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'createdAt'">
          {{ formatDateTime(record.createdAt as string) }}
        </template>
        <template
          v-else-if="JSON.stringify(column.dataIndex) === JSON.stringify(['organization', 'name'])"
        >
          {{
            (record.organization as { name?: string } | undefined)?.name ||
            (record.organizationId as string) ||
            '-'
          }}
        </template>
      </template>
    </a-table>
  </OperationTablePage>
</template>
