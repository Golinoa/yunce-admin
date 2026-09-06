<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';

import { message } from 'ant-design-vue';

import {
  createMembershipPlanApi,
  getMembershipPlansApi,
  getMembershipsApi,
  grantMembershipApi,
  updateMembershipPlanApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';
import { resolveRouteQueryString } from '#/utils/ops-nav';
import { formatVersionLabel } from '#/utils/organization-version';
import {
  ENTITLEMENT_CODES,
  type EntitlementVersionCode,
} from '#/utils/organization-version-split';

import UserSearchSelect from '../components/UserSearchSelect.vue';

type MembershipSource = 'ACTIVATION_CODE' | 'MANUAL' | 'POINT_EXCHANGE';
type MembershipStatus = 'ACTIVE' | 'EXPIRED';

interface MembershipPlanRecord {
  createdAt?: string;
  durationDays: number;
  id: string;
  isActive: boolean;
  name: string;
  pointsCost: number;
  remark?: null | string;
  targetVersionCode?: EntitlementVersionCode | null;
}

interface MembershipGrantRecord {
  createdAt: string;
  endAt: string;
  id: string;
  organization?: null | {
    expireAt?: null | string;
    id: string;
    name: string;
    versionCode?: string;
  };
  plan?: null | {
    name?: null | string;
    targetVersionCode?: EntitlementVersionCode | null;
  };
  profile?: null | {
    id: string;
    name?: null | string;
    nickname?: null | string;
    phone?: null | string;
    role: string;
    teacher?: null | {
      institution?: null | string;
    };
  };
  source: MembershipSource;
  startAt: string;
  status: MembershipStatus;
  targetVersionCode?: EntitlementVersionCode | null;
}

const route = useRoute();
const loading = ref(false);
const plans = ref<MembershipPlanRecord[]>([]);
const grants = ref<MembershipGrantRecord[]>([]);
const planOpen = ref(false);
const grantOpen = ref(false);
const planSubmitting = ref(false);
const grantSubmitting = ref(false);
const filters = reactive({
  profileId: '',
  source: undefined as MembershipSource | undefined,
  status: undefined as MembershipStatus | undefined,
});
const planForm = reactive({
  durationDays: 30,
  isActive: true,
  name: '',
  pointsCost: 300,
  remark: '',
  targetVersionCode: undefined as EntitlementVersionCode | undefined,
});
const grantForm = reactive({
  durationDays: 30,
  planId: undefined as string | undefined,
  profileId: '',
  remark: '',
  source: 'MANUAL' as MembershipSource,
  targetVersionCode: undefined as EntitlementVersionCode | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

const sourceOptions = [
  { label: '人工发放', value: 'MANUAL' },
  { label: '激活码', value: 'ACTIVATION_CODE' },
  { label: '积分兑换', value: 'POINT_EXCHANGE' },
] as const;

const statusOptions = [
  { label: '有效', value: 'ACTIVE' },
  { label: '已过期', value: 'EXPIRED' },
] as const;

const entitlementOptions = ENTITLEMENT_CODES.map((code) => ({
  label: formatVersionLabel(code),
  value: code as EntitlementVersionCode,
}));

const activePlansWithTarget = computed(() =>
  plans.value.filter((p) => p.isActive && p.targetVersionCode),
);

const sourceLabelMap: Record<MembershipSource, string> = {
  ACTIVATION_CODE: '激活码',
  MANUAL: '人工发放',
  POINT_EXCHANGE: '积分兑换',
};

const statusLabelMap: Record<MembershipStatus, string> = {
  ACTIVE: '有效',
  EXPIRED: '已过期',
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

function formatSource(value?: MembershipSource | null) {
  return value ? (sourceLabelMap[value] ?? value) : '-';
}

function formatStatus(value?: MembershipStatus | null) {
  return value ? (statusLabelMap[value] ?? value) : '-';
}

function formatUserName(record: MembershipGrantRecord) {
  return record.profile?.name || record.profile?.nickname || '-';
}

function formatTargetVersion(code?: EntitlementVersionCode | null) {
  return code ? formatVersionLabel(code) : '-';
}

function resetPlanForm() {
  planForm.durationDays = 30;
  planForm.isActive = true;
  planForm.name = '';
  planForm.pointsCost = 300;
  planForm.remark = '';
  planForm.targetVersionCode = undefined;
}

function resetGrantForm() {
  grantForm.durationDays = 30;
  grantForm.planId = undefined;
  grantForm.profileId = '';
  grantForm.remark = '';
  grantForm.source = 'MANUAL';
  grantForm.targetVersionCode = undefined;
}

function applyRouteQuery() {
  const profileId = resolveRouteQueryString(route.query, 'profileId');
  const status = resolveRouteQueryString(route.query, 'status');
  if (profileId) filters.profileId = profileId;
  if (status === 'ACTIVE' || status === 'EXPIRED') {
    filters.status = status;
  }
}

async function fetchData() {
  loading.value = true;
  try {
    const [planResult, grantResult] = await Promise.all([
      getMembershipPlansApi(),
      getMembershipsApi({
        page: pagination.page,
        pageSize: pagination.pageSize,
        profileId: filters.profileId || undefined,
        source: filters.source,
        status: filters.status,
      }),
    ]);
    plans.value = planResult;
    grants.value = grantResult.list;
    pagination.total = grantResult.pagination.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchData();
}

function handleReset() {
  filters.profileId = '';
  filters.source = undefined;
  filters.status = undefined;
  pagination.page = 1;
  void fetchData();
}

function openPlanModal() {
  resetPlanForm();
  planOpen.value = true;
}

function openGrantModal() {
  resetGrantForm();
  grantOpen.value = true;
}

function onGrantPlanChange(planId?: string) {
  grantForm.planId = planId;
  const plan = plans.value.find((p) => p.id === planId);
  if (plan) {
    grantForm.durationDays = plan.durationDays;
    if (plan.targetVersionCode) {
      grantForm.targetVersionCode = plan.targetVersionCode;
    }
  }
}

onMounted(() => {
  applyRouteQuery();
  void fetchData();
});

async function handleCreatePlan() {
  if (!planForm.name.trim()) {
    message.error('请输入套餐名称');
    return Promise.reject();
  }
  if (!planForm.targetVersionCode) {
    message.error('请选择目标权益档');
    return Promise.reject();
  }
  planSubmitting.value = true;
  try {
    await createMembershipPlanApi({
      durationDays: planForm.durationDays,
      isActive: planForm.isActive,
      name: planForm.name.trim(),
      pointsCost: planForm.pointsCost,
      remark: planForm.remark || undefined,
      targetVersionCode: planForm.targetVersionCode,
    });
    message.success('会员套餐创建成功');
    planOpen.value = false;
    resetPlanForm();
    await fetchData();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    planSubmitting.value = false;
  }
}

async function handleGrantMembership() {
  if (!grantForm.profileId.trim()) {
    message.error('请先搜索并选择用户');
    return Promise.reject();
  }
  if (!grantForm.planId && !grantForm.targetVersionCode) {
    message.error('请选择目标权益档或关联套餐');
    return Promise.reject();
  }
  if (!grantForm.planId && !grantForm.durationDays) {
    message.error('请填写发放天数');
    return Promise.reject();
  }
  const ok = await confirmAction({
    content: `将为所选用户开通会员，确认继续？`,
    okType: 'danger',
    title: '确认开通会员',
  });
  if (!ok) return Promise.reject();

  grantSubmitting.value = true;
  try {
    await grantMembershipApi({
      durationDays: grantForm.durationDays || undefined,
      planId: grantForm.planId || undefined,
      profileId: grantForm.profileId,
      remark: grantForm.remark || undefined,
      source: 'MANUAL',
      targetVersionCode: grantForm.targetVersionCode,
    });
    message.success('会员发放成功');
    grantOpen.value = false;
    resetGrantForm();
    await fetchData();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    grantSubmitting.value = false;
  }
}

async function handleTogglePlanStatus(
  record: MembershipPlanRecord,
  checked: boolean,
) {
  const ok = await confirmAction({
    content: `确认${checked ? '启用' : '停用'}套餐「${record.name}」？`,
    okType: checked ? 'primary' : 'danger',
    title: checked ? '确认启用套餐' : '确认停用套餐',
  });
  if (!ok) return;
  await updateMembershipPlanApi(record.id, {
    durationDays: record.durationDays,
    isActive: checked,
    name: record.name,
    pointsCost: record.pointsCost,
    remark: record.remark || undefined,
    targetVersionCode: record.targetVersionCode,
  });
  message.success(`套餐已${checked ? '启用' : '停用'}`);
  await fetchData();
}
</script>

<template>
  <div class="p-5">
    <a-space direction="vertical" size="middle" class="w-full">
      <a-card title="会员套餐" :bordered="false">
        <template #extra>
          <a-space>
            <a-button type="primary" @click="openPlanModal">新增套餐</a-button>
            <a-button @click="openGrantModal">给用户开通会员</a-button>
          </a-space>
        </template>
        <a-table
          :columns="[
            { title: '套餐名', dataIndex: 'name' },
            { title: '目标权益档', dataIndex: 'targetVersionCode' },
            { title: '天数', dataIndex: 'durationDays' },
            { title: '积分成本', dataIndex: 'pointsCost' },
            { title: '启用', dataIndex: 'isActive' },
            { title: '备注', dataIndex: 'remark' },
            { title: '创建时间', dataIndex: 'createdAt' },
          ]"
          :data-source="plans"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'targetVersionCode'">
              {{ formatTargetVersion(record.targetVersionCode) }}
            </template>
            <template v-else-if="column.dataIndex === 'isActive'">
              <a-switch
                :checked="record.isActive"
                checked-children="启用"
                un-checked-children="停用"
                @change="
                  (checked: boolean) => handleTogglePlanStatus(record, checked)
                "
              />
            </template>
            <template v-else-if="column.dataIndex === 'remark'">
              {{ record.remark || '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'createdAt'">
              {{ formatDateTime(record.createdAt) }}
            </template>
          </template>
        </a-table>
      </a-card>
      <a-card title="用户会员开通记录" :bordered="false">
        <a-form layout="inline" class="mb-4">
          <a-form-item label="用户">
            <div style="width: 240px">
              <UserSearchSelect
                v-model="filters.profileId"
                placeholder="姓名 / 手机号搜索"
              />
            </div>
          </a-form-item>
          <a-form-item label="来源">
            <a-select
              v-model:value="filters.source"
              allow-clear
              :options="sourceOptions"
              placeholder="全部来源"
              style="width: 140px"
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
        <a-table
          :columns="[
            { title: '用户', dataIndex: ['profile', 'nickname'] },
            { title: '机构', dataIndex: ['organization', 'name'] },
            { title: '手机号', dataIndex: ['profile', 'phone'] },
            { title: '套餐', dataIndex: ['plan', 'name'] },
            { title: '目标权益档', dataIndex: 'targetVersionCode' },
            { title: '来源', dataIndex: 'source' },
            { title: '状态', dataIndex: 'status' },
            { title: '开始时间', dataIndex: 'startAt' },
            { title: '到期时间', dataIndex: 'endAt' },
            { title: '发放时间', dataIndex: 'createdAt' },
          ]"
          :data-source="grants"
          :loading="loading"
          :pagination="{
            current: pagination.page,
            pageSize: pagination.pageSize,
            total: pagination.total,
            onChange: (page: number, pageSize: number) => {
              pagination.page = page;
              pagination.pageSize = pageSize;
              fetchData();
            },
          }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template
              v-if="
                JSON.stringify(column.dataIndex) ===
                JSON.stringify(['profile', 'nickname'])
              "
            >
              {{ formatUserName(record) }}
            </template>
            <template
              v-else-if="
                JSON.stringify(column.dataIndex) ===
                JSON.stringify(['organization', 'name'])
              "
            >
              {{
                record.organization?.name ||
                record.profile?.teacher?.institution ||
                '-'
              }}
            </template>
            <template v-else-if="column.dataIndex === 'targetVersionCode'">
              {{
                formatTargetVersion(
                  record.targetVersionCode || record.plan?.targetVersionCode,
                )
              }}
            </template>
            <template v-else-if="column.dataIndex === 'source'">
              {{ formatSource(record.source) }}
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              {{ formatStatus(record.status) }}
            </template>
            <template
              v-else-if="
                column.dataIndex === 'startAt' ||
                column.dataIndex === 'endAt' ||
                column.dataIndex === 'createdAt'
              "
            >
              {{ formatDateTime(record[column.dataIndex]) }}
            </template>
          </template>
        </a-table>
      </a-card>
    </a-space>
    <a-modal
      v-model:open="planOpen"
      title="新增会员套餐"
      :confirm-loading="planSubmitting"
      @ok="handleCreatePlan"
    >
      <a-form layout="vertical">
        <a-form-item label="套餐名称" required>
          <a-input v-model:value="planForm.name" />
        </a-form-item>
        <a-form-item label="目标权益档" required>
          <a-select
            v-model:value="planForm.targetVersionCode"
            :options="entitlementOptions"
            placeholder="激活码/履约将升到此档"
          />
        </a-form-item>
        <a-form-item label="会员天数">
          <a-input-number
            v-model:value="planForm.durationDays"
            :min="1"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="积分成本">
          <a-input-number
            v-model:value="planForm.pointsCost"
            :min="0"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="启用状态">
          <a-switch v-model:checked="planForm.isActive" />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="planForm.remark" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="grantOpen"
      title="给用户开通会员"
      :confirm-loading="grantSubmitting"
      @ok="handleGrantMembership"
    >
      <a-form layout="vertical">
        <a-form-item label="选择用户" required>
          <UserSearchSelect v-model="grantForm.profileId" />
        </a-form-item>
        <a-alert
          type="info"
          show-icon
          message="运营发放固定为人工来源；将解析用户所属机构并走机构权益履约（续期 + 升档）。"
          class="mb-4"
        />
        <a-form-item label="关联套餐（可选）">
          <a-select
            v-model:value="grantForm.planId"
            allow-clear
            placeholder="选择已配置目标权益档的套餐"
            @change="onGrantPlanChange"
          >
            <a-select-option
              v-for="item in activePlansWithTarget"
              :key="item.id"
              :value="item.id"
            >
              {{ item.name }}（{{ item.targetVersionCode }} ·
              {{ item.durationDays }}天）
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="目标权益档" required>
          <a-select
            v-model:value="grantForm.targetVersionCode"
            :options="entitlementOptions"
            placeholder="无套餐时必选；有套餐时可覆盖"
          />
        </a-form-item>
        <a-form-item label="发放天数">
          <a-input-number
            v-model:value="grantForm.durationDays"
            :min="1"
            class="w-full"
          />
        </a-form-item>
        <a-form-item label="发放来源">
          <a-select
            value="MANUAL"
            disabled
            :options="[{ label: '人工发放', value: 'MANUAL' }]"
          />
        </a-form-item>
        <a-form-item label="备注">
          <a-input v-model:value="grantForm.remark" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
