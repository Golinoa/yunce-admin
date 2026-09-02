<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  batchCreateActivationCodesApi,
  batchDeleteActivationCodesApi,
  getActivationCodesApi,
  getMembershipPlansApi,
  voidActivationCodeApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';
import { summarizeActivationByChannel } from '#/utils/growth-summary';
import { resolveRouteQueryString } from '#/utils/ops-nav';

import OperationTablePage from '../components/OperationTablePage.vue';

type ActivationCodeStatus = 'EXPIRED' | 'UNUSED' | 'USED' | 'VOIDED';

interface ActivationCodeRecord {
  batchNo?: null | string;
  channel?: null | string;
  code: string;
  createdAt: string;
  expiresAt?: null | string;
  id: string;
  plan?: null | {
    name?: null | string;
  };
  status: ActivationCodeStatus;
  usedAt?: null | string;
  usedBy?: null | {
    nickname?: null | string;
    phone?: null | string;
  };
}

interface MembershipPlanOption {
  id: string;
  name: string;
}

const route = useRoute();
const loading = ref(false);
const records = ref<ActivationCodeRecord[]>([]);
const summaryRecords = ref<ActivationCodeRecord[]>([]);
const plans = ref<MembershipPlanOption[]>([]);
const selectedRowKeys = ref<string[]>([]);
const createOpen = ref(false);
const filters = reactive({
  batchNo: '',
  channel: '',
  code: '',
  status: undefined as ActivationCodeStatus | undefined,
});
const createForm = reactive({
  batchNo: '',
  channel: '',
  planId: '',
  quantity: 10,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const statusOptions = [
  { label: '未使用', value: 'UNUSED' },
  { label: '已使用', value: 'USED' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '已作废', value: 'VOIDED' },
] as const;

const statusLabelMap: Record<ActivationCodeStatus, string> = {
  EXPIRED: '已过期',
  UNUSED: '未使用',
  USED: '已使用',
  VOIDED: '已作废',
};

const channelSummary = computed(() =>
  summarizeActivationByChannel(summaryRecords.value),
);

const summaryTruncated = computed(
  () => pagination.total > summaryRecords.value.length,
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

function formatStatus(status: ActivationCodeStatus) {
  return statusLabelMap[status] ?? status;
}

function canDeleteCode(record: ActivationCodeRecord) {
  return record.status === 'UNUSED' || record.status === 'VOIDED';
}

function applyRouteQuery() {
  const channel = resolveRouteQueryString(route.query, 'channel');
  const status = resolveRouteQueryString(route.query, 'status');
  if (channel) filters.channel = channel;
  if (
    status === 'UNUSED' ||
    status === 'USED' ||
    status === 'EXPIRED' ||
    status === 'VOIDED'
  ) {
    filters.status = status;
  }
}

async function fetchCodes() {
  loading.value = true;
  try {
    const listParams = {
      batchNo: filters.batchNo || undefined,
      channel: filters.channel || undefined,
      code: filters.code || undefined,
      status: filters.status,
    };
    const [result, summaryResult, planResult] = await Promise.all([
      getActivationCodesApi({
        ...listParams,
        page: pagination.page,
        pageSize: pagination.pageSize,
      }),
      getActivationCodesApi({
        ...listParams,
        page: 1,
        pageSize: 200,
      }),
      getMembershipPlansApi(),
    ]);
    records.value = result.list;
    summaryRecords.value = summaryResult.list;
    pagination.total = result.pagination.total;
    plans.value = planResult;
    selectedRowKeys.value = selectedRowKeys.value.filter((id) =>
      result.list.some(
        (item: ActivationCodeRecord) => item.id === id && canDeleteCode(item),
      ),
    );
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchCodes();
}

function handleReset() {
  filters.batchNo = '';
  filters.channel = '';
  filters.code = '';
  filters.status = undefined;
  pagination.page = 1;
  void fetchCodes();
}

function openCreateModal() {
  createForm.batchNo = '';
  createForm.channel = '';
  createForm.planId = '';
  createForm.quantity = 10;
  createOpen.value = true;
}

async function handleCreate() {
  if (!createForm.planId) {
    message.error('请选择会员套餐');
    return;
  }
  const ok = await confirmAction({
    content: `将生成 ${createForm.quantity} 个激活码（渠道：${createForm.channel || '未填'}），确认继续？`,
    title: '确认批量生成激活码',
  });
  if (!ok) return;
  await batchCreateActivationCodesApi(createForm);
  message.success('激活码生成成功');
  createOpen.value = false;
  await fetchCodes();
}

async function handleVoid(id: string) {
  await voidActivationCodeApi(id);
  message.success('激活码已作废');
  await fetchCodes();
}

async function handleBatchDelete() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请先选择要删除的激活码');
    return;
  }

  await batchDeleteActivationCodesApi({ ids: selectedRowKeys.value });
  message.success(`已删除 ${selectedRowKeys.value.length} 个激活码`);
  selectedRowKeys.value = [];
  await fetchCodes();
}

onMounted(() => {
  applyRouteQuery();
  void fetchCodes();
});
</script>

<template>
  <OperationTablePage title="激活码管理" :loading="loading">
    <template #summary>
      <a-space wrap>
        <a-tag
          v-for="item in channelSummary"
          :key="item.channel"
          color="blue"
        >
          {{ item.channel }}：发 {{ item.total }} / 用 {{ item.used }} / 剩
          {{ item.unused }}
        </a-tag>
        <a-tag v-if="summaryTruncated" color="orange">
          仅汇总前 {{ summaryRecords.length }} 条（共 {{ pagination.total }}）
        </a-tag>
        <span v-else-if="channelSummary.length === 0" class="text-gray-400">
          暂无渠道汇总
        </span>
      </a-space>
    </template>
    <template #filters>
      <a-form layout="inline">
        <a-form-item label="激活码">
          <a-input
            v-model:value="filters.code"
            allow-clear
            placeholder="输入激活码"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="批次号">
          <a-input
            v-model:value="filters.batchNo"
            allow-clear
            placeholder="输入批次号"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="渠道">
          <a-input
            v-model:value="filters.channel"
            allow-clear
            placeholder="输入渠道"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="状态">
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
    </template>

    <template #actions>
      <a-space>
        <a-popconfirm
          title="确认删除已选择的激活码吗？仅支持删除未使用或已作废记录。"
          ok-text="确认删除"
          cancel-text="取消"
          @confirm="handleBatchDelete"
        >
          <a-button danger :disabled="selectedRowKeys.length === 0">
            批量删除
          </a-button>
        </a-popconfirm>
        <a-button type="primary" @click="openCreateModal">批量生成</a-button>
      </a-space>
    </template>

    <div
      class="mb-4 flex items-center justify-between rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3"
    >
      <span class="text-[13px] text-[var(--ant-color-text-secondary)]">
        已选择
        {{ selectedRowKeys.length }}
        个可删除激活码，仅支持删除未使用或已作废记录
      </span>
      <a-button
        type="link"
        :disabled="selectedRowKeys.length === 0"
        @click="selectedRowKeys = []"
      >
        清空选择
      </a-button>
    </div>
    <a-table
      :columns="[
        { title: '激活码', dataIndex: 'code' },
        { title: '套餐', dataIndex: ['plan', 'name'] },
        { title: '状态', dataIndex: 'status' },
        { title: '批次', dataIndex: 'batchNo' },
        { title: '渠道', dataIndex: 'channel' },
        { title: '使用用户', dataIndex: ['usedBy', 'nickname'] },
        { title: '有效期', dataIndex: 'expiresAt' },
        { title: '使用时间', dataIndex: 'usedAt' },
        { title: '创建时间', dataIndex: 'createdAt' },
        { title: '操作', key: 'action' },
      ]"
      :data-source="records"
      :loading="loading"
      :row-selection="{
        selectedRowKeys,
        onChange: (keys: string[]) => {
          selectedRowKeys = keys;
        },
        getCheckboxProps: (record: ActivationCodeRecord) => ({
          disabled: !canDeleteCode(record),
        }),
      }"
      :pagination="{
        current: pagination.page,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: (page: number, pageSize: number) => {
          pagination.page = page;
          pagination.pageSize = pageSize;
          fetchCodes();
        },
      }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          {{ formatStatus(record.status) }}
        </template>
        <template
          v-else-if="
            column.dataIndex === 'expiresAt' ||
            column.dataIndex === 'usedAt' ||
            column.dataIndex === 'createdAt'
          "
        >
          {{ formatDateTime(record[column.dataIndex]) }}
        </template>
        <template v-if="column.key === 'action'">
          <a-popconfirm
            title="确认作废这个激活码吗？"
            ok-text="确认"
            cancel-text="取消"
            @confirm="handleVoid(record.id)"
          >
            <a-button
              :disabled="
                record.status === 'USED' || record.status === 'VOIDED'
              "
              type="link"
            >
              作废
            </a-button>
          </a-popconfirm>
        </template>
      </template>
    </a-table>
  </OperationTablePage>

  <a-modal
    v-model:open="createOpen"
    title="批量生成激活码"
    @ok="handleCreate"
  >
    <a-form layout="vertical">
      <a-form-item label="会员套餐">
        <a-select v-model:value="createForm.planId" placeholder="请选择套餐">
          <a-select-option
            v-for="item in plans"
            :key="item.id"
            :value="item.id"
          >
            {{ item.name }}
          </a-select-option>
        </a-select>
      </a-form-item>
      <a-form-item label="数量">
        <a-input-number
          v-model:value="createForm.quantity"
          :min="1"
          :max="200"
          class="w-full"
        />
      </a-form-item>
      <a-form-item label="批次号">
        <a-input v-model:value="createForm.batchNo" />
      </a-form-item>
      <a-form-item label="渠道">
        <a-input v-model:value="createForm.channel" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>
