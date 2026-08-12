<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import { adjustPointsApi, getUserDetailApi, getUsersApi } from '#/api';

type MembershipStatus = 'ACTIVE' | 'EXPIRED';

interface UserRecord {
  createdAt: string;
  id: string;
  inviteCount: number;
  inviter?: {
    nickname?: null | string;
    phone?: null | string;
  } | null;
  membershipExpireAt?: null | string;
  membershipPlanName?: null | string;
  membershipStatus: MembershipStatus;
  name?: null | string;
  nickname?: null | string;
  phone?: null | string;
  pointsBalance: number;
}

const loading = ref(false);
const records = ref<UserRecord[]>([]);
const detailLoading = ref(false);
const detailOpen = ref(false);
const detail = ref<Record<string, any> | null>(null);
const adjustOpen = ref(false);
const filters = reactive({
  keyword: '',
  membershipStatus: undefined as MembershipStatus | undefined,
});
const adjustForm = reactive({
  amount: 0,
  profileId: '',
  remark: '',
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const membershipStatusOptions = [
  { label: '有效', value: 'ACTIVE' },
  { label: '已过期', value: 'EXPIRED' },
] as const;

const membershipStatusLabelMap: Record<MembershipStatus, string> = {
  ACTIVE: '有效',
  EXPIRED: '已过期',
};

const tableColumns = [
  { title: '用户名称', dataIndex: 'displayName' },
  { title: '手机号', dataIndex: 'phone' },
  { title: '会员状态', dataIndex: 'membershipStatus' },
  { title: '会员到期', dataIndex: 'membershipExpireAt' },
  { title: '积分余额', dataIndex: 'pointsBalance' },
  { title: '邀请人数', dataIndex: 'inviteCount' },
  { title: '注册时间', dataIndex: 'createdAt' },
  { title: '操作', key: 'action' },
];

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

function formatMembershipStatus(value?: null | MembershipStatus) {
  return value ? membershipStatusLabelMap[value] ?? value : '-';
}

function formatDisplayName(record: Pick<UserRecord, 'name' | 'nickname'>) {
  return record.name || record.nickname || '-';
}

const tableData = computed(() =>
  records.value.map((item) => ({
    ...item,
    displayName: formatDisplayName(item),
  })),
);

async function fetchUsers() {
  loading.value = true;
  try {
    const result = await getUsersApi({
      keyword: filters.keyword || undefined,
      membershipStatus: filters.membershipStatus,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    records.value = result.list;
    pagination.total = result.pagination.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchUsers();
}

function handleReset() {
  filters.keyword = '';
  filters.membershipStatus = undefined;
  pagination.page = 1;
  void fetchUsers();
}

async function handleOpenDetail(record: Pick<UserRecord, 'id'>) {
  detailLoading.value = true;
  detailOpen.value = true;
  try {
    detail.value = await getUserDetailApi(record.id);
    adjustForm.profileId = record.id;
  } finally {
    detailLoading.value = false;
  }
}

function openAdjustModal(record: Pick<UserRecord, 'id'>) {
  adjustForm.profileId = record.id;
  adjustForm.amount = 0;
  adjustForm.remark = '';
  adjustOpen.value = true;
}

async function handleAdjustPoints() {
  if (!adjustForm.profileId || adjustForm.amount === 0) {
    message.error('请输入有效的积分调整值');
    return;
  }
  await adjustPointsApi(adjustForm);
  message.success('积分调整成功');
  adjustOpen.value = false;
  await Promise.all([
    fetchUsers(),
    detail.value ? handleOpenDetail({ id: adjustForm.profileId }) : Promise.resolve(),
  ]);
}

onMounted(fetchUsers);
</script>

<template>
  <div class="p-5">
    <a-card title="用户管理" :bordered="false">
      <a-form layout="inline" class="mb-4">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="用户名称 / 手机号"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="会员状态">
          <a-select
            v-model:value="filters.membershipStatus"
            allow-clear
            :options="membershipStatusOptions"
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
        用户默认指校长客户，教师、家长、学生只在详情中做机构基础数据查看
      </div>
      <a-table
        :columns="tableColumns"
        :data-source="tableData"
        :loading="loading"
        :pagination="{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total: pagination.total,
          onChange: (page: number, pageSize: number) => {
            pagination.page = page;
            pagination.pageSize = pageSize;
            fetchUsers();
          }
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'membershipStatus'">
            {{ formatMembershipStatus(record.membershipStatus) }}
          </template>
          <template v-else-if="column.dataIndex === 'membershipExpireAt'">
            {{ formatDateTime(record.membershipExpireAt) }}
          </template>
          <template v-else-if="column.dataIndex === 'createdAt'">
            {{ formatDateTime(record.createdAt) }}
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" @click="handleOpenDetail(record)">详情</a-button>
              <a-button type="link" @click="openAdjustModal(record)">调积分</a-button>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>
    <a-drawer v-model:open="detailOpen" width="720" title="用户详情">
      <a-spin :spinning="detailLoading">
        <a-descriptions v-if="detail" :column="2" bordered size="small">
          <a-descriptions-item label="用户名称">
            {{ detail.name || detail.nickname || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="手机号">{{ detail.phone || '-' }}</a-descriptions-item>
          <a-descriptions-item label="会员状态">
            {{ formatMembershipStatus(detail.membershipGrants?.[0]?.status || 'EXPIRED') }}
          </a-descriptions-item>
          <a-descriptions-item label="积分余额">{{ detail.pointAccount?.balance ?? 0 }}</a-descriptions-item>
          <a-descriptions-item label="邀请人">
            {{ detail.receivedInvite?.inviter?.nickname || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ formatDateTime(detail.createdAt) }}</a-descriptions-item>
        </a-descriptions>
        <a-card class="mt-4" size="small" title="机构基础数据">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="机构名称">
              {{ detail?.institutionSummary?.institutionName || detail?.teacher?.institution || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="教师数">
              {{ detail?.institutionSummary?.teacherCount ?? 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="家长数">
              {{ detail?.institutionSummary?.parentCount ?? 0 }}
            </a-descriptions-item>
            <a-descriptions-item label="学生数">
              {{ detail?.institutionSummary?.studentCount ?? 0 }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
        <a-card class="mt-4" size="small" title="会员记录">
          <a-table
            :columns="[
              { title: '套餐', dataIndex: ['plan', 'name'] },
              { title: '来源', dataIndex: 'source' },
              { title: '状态', dataIndex: 'status' },
              { title: '开始时间', dataIndex: 'startAt' },
              { title: '到期时间', dataIndex: 'endAt' }
            ]"
            :data-source="detail?.membershipGrants || []"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'status'">
                {{ formatMembershipStatus(record.status) }}
              </template>
              <template v-else-if="column.dataIndex === 'startAt' || column.dataIndex === 'endAt'">
                {{ formatDateTime(record[column.dataIndex]) }}
              </template>
            </template>
          </a-table>
        </a-card>
        <a-card class="mt-4" size="small" title="最近积分流水">
          <a-table
            :columns="[
              { title: '类型', dataIndex: 'type' },
              { title: '来源', dataIndex: 'source' },
              { title: '积分', dataIndex: 'amount' },
              { title: '余额', dataIndex: 'balanceAfter' },
              { title: '时间', dataIndex: 'createdAt' }
            ]"
            :data-source="detail?.pointRecords || []"
            :pagination="false"
            row-key="id"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.dataIndex === 'createdAt'">
                {{ formatDateTime(record.createdAt) }}
              </template>
            </template>
          </a-table>
        </a-card>
      </a-spin>
    </a-drawer>
    <a-modal v-model:open="adjustOpen" title="调整积分" @ok="handleAdjustPoints">
      <a-form layout="vertical">
        <a-form-item label="用户 ID">
          <a-input v-model:value="adjustForm.profileId" />
        </a-form-item>
        <a-form-item label="变更积分">
          <a-input-number v-model:value="adjustForm.amount" class="w-full" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="adjustForm.remark" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
