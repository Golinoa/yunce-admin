<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  adjustPointsApi,
  getInviteRulesApi,
  getInvitesApi,
  getPointRecordsApi,
  saveInviteRuleApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';

type PointType = 'EARN' | 'SPEND';
type PointSource =
  | 'INVITE_REWARD'
  | 'INVITEE_REWARD'
  | 'MANUAL_ADJUST'
  | 'MEMBERSHIP_EXCHANGE';

interface InviteRuleRecord {
  enabled: boolean;
  id: string;
  inviteePointsReward: number;
  name: string;
  pointsReward: number;
  remark?: null | string;
  taskKey: string;
}

interface InviteRecord {
  createdAt: string;
  id: string;
  invitee?: null | {
    createdAt?: string;
    nickname?: null | string;
    phone?: null | string;
  };
  inviter?: null | {
    nickname?: null | string;
    phone?: null | string;
  };
}

interface PointRecord {
  amount: number;
  balanceAfter: number;
  createdAt: string;
  id: string;
  profile?: null | {
    nickname?: null | string;
    phone?: null | string;
  };
  source: PointSource;
  type: PointType;
}

const loading = ref(false);
const invites = ref<InviteRecord[]>([]);
const pointRecords = ref<PointRecord[]>([]);
const rules = ref<InviteRuleRecord[]>([]);
const ruleOpen = ref(false);
const pointOpen = ref(false);
const inviteFilters = reactive({
  keyword: '',
});
const pointFilters = reactive({
  profileId: '',
  source: undefined as PointSource | undefined,
  type: undefined as PointType | undefined,
});
const invitePagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});
const pointPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});
const ruleForm = reactive({
  enabled: true,
  inviteePointsReward: 0,
  name: '',
  pointsReward: 0,
  taskKey: '',
});
const pointForm = reactive({
  amount: 0,
  profileId: '',
  remark: '',
});

const pointTypeOptions = [
  { label: '收入', value: 'EARN' },
  { label: '支出', value: 'SPEND' },
] as const;

const pointSourceOptions = [
  { label: '邀请奖励', value: 'INVITE_REWARD' },
  { label: '被邀请奖励', value: 'INVITEE_REWARD' },
  { label: '会员兑换', value: 'MEMBERSHIP_EXCHANGE' },
  { label: '手工调整', value: 'MANUAL_ADJUST' },
] as const;

const pointTypeLabelMap: Record<PointType, string> = {
  EARN: '收入',
  SPEND: '支出',
};

const pointSourceLabelMap: Record<PointSource, string> = {
  INVITE_REWARD: '邀请奖励',
  INVITEE_REWARD: '被邀请奖励',
  MEMBERSHIP_EXCHANGE: '会员兑换',
  MANUAL_ADJUST: '手工调整',
};

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

function formatPointType(value?: null | PointType) {
  return value ? (pointTypeLabelMap[value] ?? value) : '-';
}

function formatPointSource(value?: null | PointSource) {
  return value ? (pointSourceLabelMap[value] ?? value) : '-';
}

async function fetchData() {
  loading.value = true;
  try {
    const [inviteResult, pointResult, ruleResult] = await Promise.all([
      getInvitesApi({
        keyword: inviteFilters.keyword || undefined,
        page: invitePagination.page,
        pageSize: invitePagination.pageSize,
      }),
      getPointRecordsApi({
        page: pointPagination.page,
        pageSize: pointPagination.pageSize,
        profileId: pointFilters.profileId || undefined,
        source: pointFilters.source,
        type: pointFilters.type,
      }),
      getInviteRulesApi(),
    ]);
    invites.value = inviteResult.list;
    invitePagination.total = inviteResult.pagination.total;
    pointRecords.value = pointResult.list;
    pointPagination.total = pointResult.pagination.total;
    rules.value = ruleResult;
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

function handleSearchInvites() {
  invitePagination.page = 1;
  void fetchData();
}

function handleResetInvites() {
  inviteFilters.keyword = '';
  invitePagination.page = 1;
  void fetchData();
}

function handleSearchPoints() {
  pointPagination.page = 1;
  void fetchData();
}

function handleResetPoints() {
  pointFilters.profileId = '';
  pointFilters.source = undefined;
  pointFilters.type = undefined;
  pointPagination.page = 1;
  void fetchData();
}

function handleEditRule(record: InviteRuleRecord) {
  ruleForm.taskKey = record.taskKey;
  ruleForm.name = record.name;
  ruleForm.pointsReward = record.pointsReward;
  ruleForm.inviteePointsReward = record.inviteePointsReward;
  ruleForm.enabled = record.enabled;
  ruleOpen.value = true;
}

function openPointModal() {
  pointForm.amount = 0;
  pointForm.profileId = '';
  pointForm.remark = '';
  pointOpen.value = true;
}

async function handleSaveRule() {
  const ok = await confirmAction({
    content: `确认保存邀请规则「${ruleForm.name || ruleForm.taskKey}」？`,
    title: '确认保存规则',
  });
  if (!ok) return;
  await saveInviteRuleApi(ruleForm.taskKey, ruleForm);
  message.success('邀请规则已保存');
  ruleOpen.value = false;
  await fetchData();
}

async function handleAdjustPoints() {
  if (!pointForm.profileId.trim() || pointForm.amount === 0) {
    message.error('请输入有效的用户 ID 和积分值');
    return;
  }
  const ok = await confirmAction({
    content: `确认为用户 ${pointForm.profileId} 调整积分 ${pointForm.amount}？`,
    okType: 'danger',
    title: '确认调整积分',
  });
  if (!ok) return;
  await adjustPointsApi(pointForm);
  message.success('积分调整成功');
  pointOpen.value = false;
  await fetchData();
}

async function handleToggleRule(record: InviteRuleRecord, checked: boolean) {
  const ok = await confirmAction({
    content: `确认${checked ? '启用' : '停用'}规则「${record.name}」？`,
    okType: checked ? 'primary' : 'danger',
    title: checked ? '确认启用规则' : '确认停用规则',
  });
  if (!ok) return;
  await saveInviteRuleApi(record.taskKey, {
    enabled: checked,
    inviteePointsReward: record.inviteePointsReward,
    name: record.name,
    pointsReward: record.pointsReward,
  });
  message.success(`邀请规则已${checked ? '启用' : '停用'}`);
  await fetchData();
}
</script>

<template>
  <div class="p-5">
    <a-space direction="vertical" size="middle" class="w-full">
      <a-card title="邀请规则" :bordered="false">
        <template #extra>
          <a-button @click="openPointModal">手工调积分</a-button>
        </template>
        <a-table
          :columns="[
            { title: '任务标识', dataIndex: 'taskKey' },
            { title: '规则名称', dataIndex: 'name' },
            { title: '邀请奖励', dataIndex: 'pointsReward' },
            { title: '被邀请奖励', dataIndex: 'inviteePointsReward' },
            { title: '启用', dataIndex: 'enabled' },
            { title: '备注', dataIndex: 'remark' },
            { title: '操作', key: 'action' },
          ]"
          :data-source="rules"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'enabled'">
              <a-switch
                :checked="record.enabled"
                checked-children="启用"
                un-checked-children="停用"
                @change="
                  (checked: boolean) => handleToggleRule(record, checked)
                "
              />
            </template>
            <template v-else-if="column.dataIndex === 'remark'">
              {{ record.remark || '-' }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="handleEditRule(record)">
                编辑
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>
      <a-card title="邀请关系" :bordered="false">
        <a-form layout="inline" class="mb-4">
          <a-form-item label="关键词">
            <a-input
              v-model:value="inviteFilters.keyword"
              allow-clear
              placeholder="邀请人 / 被邀请人 / 手机号"
              @press-enter="handleSearchInvites"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearchInvites">
                查询
              </a-button>
              <a-button @click="handleResetInvites">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
        <a-table
          :columns="[
            { title: '邀请人', dataIndex: ['inviter', 'nickname'] },
            { title: '邀请人手机号', dataIndex: ['inviter', 'phone'] },
            { title: '被邀请人', dataIndex: ['invitee', 'nickname'] },
            { title: '手机号', dataIndex: ['invitee', 'phone'] },
            { title: '被邀请注册', dataIndex: ['invitee', 'createdAt'] },
            { title: '绑定时间', dataIndex: 'createdAt' },
          ]"
          :data-source="invites"
          :loading="loading"
          :pagination="{
            current: invitePagination.page,
            pageSize: invitePagination.pageSize,
            total: invitePagination.total,
            onChange: (page: number, pageSize: number) => {
              invitePagination.page = page;
              invitePagination.pageSize = pageSize;
              fetchData();
            },
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template
              v-if="
                column.dataIndex === 'createdAt' ||
                JSON.stringify(column.dataIndex) ===
                  JSON.stringify(['invitee', 'createdAt'])
              "
            >
              {{
                formatDateTime(
                  column.dataIndex === 'createdAt'
                    ? record.createdAt
                    : record.invitee?.createdAt,
                )
              }}
            </template>
          </template>
        </a-table>
      </a-card>
      <a-card title="积分流水" :bordered="false">
        <a-form layout="inline" class="mb-4">
          <a-form-item label="用户 ID">
            <a-input
              v-model:value="pointFilters.profileId"
              allow-clear
              placeholder="输入用户 ID"
              @press-enter="handleSearchPoints"
            />
          </a-form-item>
          <a-form-item label="类型">
            <a-select
              v-model:value="pointFilters.type"
              allow-clear
              :options="pointTypeOptions"
              placeholder="全部类型"
              style="width: 140px"
            />
          </a-form-item>
          <a-form-item label="来源">
            <a-select
              v-model:value="pointFilters.source"
              allow-clear
              :options="pointSourceOptions"
              placeholder="全部来源"
              style="width: 160px"
            />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" @click="handleSearchPoints">
                查询
              </a-button>
              <a-button @click="handleResetPoints">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>
        <a-table
          :columns="[
            { title: '用户', dataIndex: ['profile', 'nickname'] },
            { title: '手机号', dataIndex: ['profile', 'phone'] },
            { title: '类型', dataIndex: 'type' },
            { title: '来源', dataIndex: 'source' },
            { title: '积分', dataIndex: 'amount' },
            { title: '变更后余额', dataIndex: 'balanceAfter' },
            { title: '时间', dataIndex: 'createdAt' },
          ]"
          :data-source="pointRecords"
          :loading="loading"
          :pagination="{
            current: pointPagination.page,
            pageSize: pointPagination.pageSize,
            total: pointPagination.total,
            onChange: (page: number, pageSize: number) => {
              pointPagination.page = page;
              pointPagination.pageSize = pageSize;
              fetchData();
            },
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'type'">
              {{ formatPointType(record.type) }}
            </template>
            <template v-else-if="column.dataIndex === 'source'">
              {{ formatPointSource(record.source) }}
            </template>
            <template v-else-if="column.dataIndex === 'createdAt'">
              {{ formatDateTime(record.createdAt) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </a-space>
    <a-modal v-model:open="ruleOpen" title="编辑邀请规则" @ok="handleSaveRule">
      <a-form layout="vertical">
        <a-form-item label="任务标识">
          <a-input v-model:value="ruleForm.taskKey" disabled />
        </a-form-item>
        <a-form-item label="规则名称">
          <a-input v-model:value="ruleForm.name" />
        </a-form-item>
        <a-form-item label="邀请奖励">
          <a-input-number
            v-model:value="ruleForm.pointsReward"
            :min="0"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="被邀请奖励">
          <a-input-number
            v-model:value="ruleForm.inviteePointsReward"
            :min="0"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-switch v-model:checked="ruleForm.enabled" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="pointOpen"
      title="手工调整积分"
      @ok="handleAdjustPoints"
    >
      <a-form layout="vertical">
        <a-form-item label="用户 ID">
          <a-input v-model:value="pointForm.profileId" />
        </a-form-item>
        <a-form-item label="积分变更">
          <a-input-number v-model:value="pointForm.amount" class="w-full" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="pointForm.remark" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
