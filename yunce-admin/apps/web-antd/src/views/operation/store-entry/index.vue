<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { useRouter } from 'vue-router';

import type { StoreEntryApplicationItem, StoreEntryStatus } from '#/api';
import { getStoreEntryApplicationsApi } from '#/api';

const router = useRouter();

const loading = ref(false);
const records = ref<StoreEntryApplicationItem[]>([]);
const filters = reactive({
  keyword: '',
  status: undefined as StoreEntryStatus | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const statusOptions = [
  { label: '待审核', value: 'PENDING' },
  { label: '已通过', value: 'APPROVED' },
  { label: '已拒绝', value: 'REJECTED' },
] as const;

const statusLabelMap: Record<StoreEntryStatus, string> = {
  APPROVED: '已通过',
  PENDING: '待审核',
  REJECTED: '已拒绝',
};

const statusColorMap: Record<StoreEntryStatus, string> = {
  APPROVED: 'green',
  PENDING: 'orange',
  REJECTED: 'red',
};

const tableData = computed(() =>
  records.value.map((item) => ({
    ...item,
    applicantName: item.applicant?.name || item.applicant?.nickname || '-',
    applicantPhone: item.applicant?.phone || '-',
    organizationName: item.organization?.name || '-',
    regionText: Array.isArray(item.region) ? item.region.join(' / ') : '-',
  })),
);

function formatDateTime(value?: null | string) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatStatus(status: StoreEntryStatus) {
  return statusLabelMap[status] ?? status;
}

function statusColor(status: StoreEntryStatus) {
  return statusColorMap[status] ?? 'default';
}

async function fetchApplications() {
  loading.value = true;
  try {
    const result = await getStoreEntryApplicationsApi({
      keyword: filters.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
    });
    records.value = result.list;
    pagination.total = result.pagination.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchApplications();
}

function handleReset() {
  filters.keyword = '';
  filters.status = undefined;
  pagination.page = 1;
  void fetchApplications();
}

function openDetail(record: Pick<StoreEntryApplicationItem, 'id'>) {
  router.push({ path: '/operation/store-entry/detail', query: { id: record.id } });
}

onMounted(fetchApplications);
</script>

<template>
  <div class="p-5">
    <a-card title="门店入驻审核" :bordered="false">
      <a-form layout="inline" class="mb-4">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="门店名称 / 联系人 / 联系电话"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="审核状态">
          <a-select
            v-model:value="filters.status"
            allow-clear
            :options="statusOptions"
            placeholder="全部状态"
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

      <div class="mb-4 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-[13px] text-[var(--ant-color-text-secondary)]">
        门店负责人在小程序端提交入驻申请后在此审核；通过后机构自动启用（默认免费版）并创建默认校区，拒绝时需填写原因
      </div>

      <a-table
        :columns="[
          { title: '门店名称', dataIndex: 'name' },
          { title: '门店类型', dataIndex: 'type' },
          { title: '申请人', dataIndex: 'applicantName' },
          { title: '所在地区', dataIndex: 'regionText' },
          { title: '联系人', dataIndex: 'contactName' },
          { title: '联系电话', dataIndex: 'contactPhone' },
          { title: '审核状态', dataIndex: 'status' },
          { title: '申请时间', dataIndex: 'createdAt' },
          { title: '操作', key: 'action' }
        ]"
        :data-source="tableData"
        :loading="loading"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page: number, pageSize: number) => {
            pagination.page = page;
            pagination.pageSize = pageSize;
            fetchApplications();
          }
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.status)">
              {{ formatStatus(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" @click="openDetail(record)">详情</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
  </div>
</template>
