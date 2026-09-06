<script lang="ts" setup>
import type {
  FeatureModuleItem,
  OrganizationItem,
  OrganizationQuotaUsage,
  OrganizationStatus,
  OrganizationVersionCode,
  OrganizationVersionItem,
  QuotaFeatures,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import {
  adjustOrganizationExpireApi,
  dissolveOrganizationApi,
  freezeOrganizationApi,
  getFeatureModulesApi,
  getOrganizationQuotaUsageApi,
  getOrganizationsApi,
  getOrganizationVersionsApi,
  grantOrganizationEntitlementApi,
  setOrganizationIsTestApi,
  unbindOrganizationOwnerApi,
  unfreezeOrganizationApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';
import {
  buildVersionSelectOptions,
  formatVersionLabel,
  listOrganizationVersionsFromApi,
  versionColor as resolveVersionColor,
} from '#/utils/organization-version';
import { splitOrganizationVersions } from '#/utils/organization-version-split';

import OperationTablePage from '../components/OperationTablePage.vue';

const userStore = useUserStore();
const isFullAdmin = computed(() => {
  const roles = userStore.userInfo?.roles ?? [];
  return roles.includes('admin') || roles.includes('super_admin');
});

const loading = ref(false);
const records = ref<OrganizationItem[]>([]);
const versionDefinitions = ref<OrganizationVersionItem[]>([]);
const featureModules = ref<FeatureModuleItem[]>([]);
const filters = reactive({
  keyword: '',
  status: undefined as OrganizationStatus | undefined,
  versionCode: undefined as OrganizationVersionCode | undefined,
  isTest: undefined as boolean | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});

// ==================== 开通/续费弹窗 ====================

const grantModalOpen = ref(false);
const grantSubmitting = ref(false);
const grantTarget = ref<null | OrganizationItem>(null);
const grantForm = reactive({
  versionCode: 'FREE' as OrganizationVersionCode,
  durationDays: 365,
  remark: '',
  enableOverride: false,
  maxMembers: 40,
  maxEmployees: 2,
  maxCampuses: 1,
  featureSwitches: {} as QuotaFeatures,
});

// ==================== 机构详情 / 配额使用率弹窗 ====================

const quotaModalOpen = ref(false);
const quotaLoading = ref(false);
const quotaDetail = ref<null | OrganizationQuotaUsage>(null);
const quotaOrgName = ref('');

// ==================== 调整有效期弹窗 ====================

const expireModalOpen = ref(false);
const expireSubmitting = ref(false);
const expireTarget = ref<null | OrganizationItem>(null);
const expireForm = reactive({
  days: 30,
  remark: '',
});

// ==================== 解散确认弹窗 ====================

const dissolveOpen = ref(false);
const dissolveSubmitting = ref(false);
const dissolveTarget = ref<null | OrganizationItem>(null);
const dissolveConfirmName = ref('');

const statusOptions = [
  { label: '正常', value: 'ACTIVE' },
  { label: '已冻结', value: 'FROZEN' },
  { label: '待审核', value: 'PENDING' },
  { label: '已拒绝', value: 'REJECTED' },
] as const;

const statusLabelMap: Record<OrganizationStatus, string> = {
  ACTIVE: '正常',
  FROZEN: '已冻结',
  PENDING: '待审核',
  REJECTED: '已拒绝',
};

const statusColorMap: Record<OrganizationStatus, string> = {
  ACTIVE: 'green',
  FROZEN: 'orange',
  PENDING: 'processing',
  REJECTED: 'red',
};

const entitlementVersions = computed(
  () => splitOrganizationVersions(versionDefinitions.value).entitlements,
);

const versionOptions = computed(() =>
  buildVersionSelectOptions(entitlementVersions.value),
);

const filterVersionOptions = computed(() =>
  buildVersionSelectOptions(entitlementVersions.value),
);

const activeFeatureModules = computed(() =>
  featureModules.value.filter((m) => m.status !== 'disabled'),
);

const selectedVersionDefaults = computed(
  () =>
    entitlementVersions.value.find(
      (item) => item.code === grantForm.versionCode,
    ) ?? null,
);

function resolveMaxMembers(org: OrganizationItem) {
  const fromOverride = org.quotaOverrides?.maxMembers;
  if (typeof fromOverride === 'number') return fromOverride;
  const fromVersion = versionDefinitions.value.find(
    (v) => v.code === org.versionCode,
  )?.maxMembers;
  return typeof fromVersion === 'number' ? fromVersion : null;
}

function resolveMaxEmployees(org: OrganizationItem) {
  const fromOverride = org.quotaOverrides?.maxEmployees;
  if (typeof fromOverride === 'number') return fromOverride;
  const fromVersion = versionDefinitions.value.find(
    (v) => v.code === org.versionCode,
  )?.maxEmployees;
  return typeof fromVersion === 'number' ? fromVersion : null;
}

function resolveMaxCampuses(org: OrganizationItem) {
  const fromOverride = org.quotaOverrides?.maxCampuses;
  if (typeof fromOverride === 'number') return fromOverride;
  const fromVersion = versionDefinitions.value.find(
    (v) => v.code === org.versionCode,
  )?.maxCampuses;
  return typeof fromVersion === 'number' ? fromVersion : org.maxCampuses;
}

function isExpiredActive(org: OrganizationItem) {
  if (org.status !== 'ACTIVE' || !org.expireAt) return false;
  return new Date(org.expireAt).getTime() < Date.now();
}

const tableData = computed(() =>
  records.value.map((item) => {
    const maxMembers = resolveMaxMembers(item);
    const maxEmployees = resolveMaxEmployees(item);
    const maxCampuses = resolveMaxCampuses(item);
    const usedMembers = item.quotaUsage?.members ?? 0;
    const usedEmployees = item.quotaUsage?.employees ?? 0;
    const usedCampuses = item.quotaUsage?.campuses ?? 0;
    return {
      ...item,
      ownerName:
        item.owner?.name || item.owner?.nickname || item.owner?.phone || '-',
      usageMembersText:
        maxMembers === null ? String(usedMembers) : `${usedMembers}/${maxMembers}`,
      usageEmployeesText:
        maxEmployees === null
          ? String(usedEmployees)
          : `${usedEmployees}/${maxEmployees}`,
      usageCampusesText:
        typeof maxCampuses === 'number'
          ? `${usedCampuses}/${maxCampuses}`
          : String(usedCampuses),
      expiredActive: isExpiredActive(item),
    };
  }),
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

function formatStatus(status: OrganizationStatus) {
  return statusLabelMap[status] ?? status;
}

function statusColor(status: OrganizationStatus) {
  return statusColorMap[status] ?? 'default';
}

function formatVersion(code: OrganizationVersionCode) {
  return formatVersionLabel(code, versionDefinitions.value);
}

function versionColor(code: OrganizationVersionCode) {
  return resolveVersionColor(code);
}

function featureLabel(enabled: boolean) {
  return enabled ? '开' : '关';
}

function defaultDurationDays(code: OrganizationVersionCode) {
  if (code === 'TRIAL') return 14;
  const fromVersion = entitlementVersions.value.find(
    (item) => item.code === code,
  )?.durationDays;
  return fromVersion && fromVersion > 0 ? fromVersion : 365;
}

async function fetchOrganizations() {
  loading.value = true;
  try {
    const result = await getOrganizationsApi({
      keyword: filters.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      status: filters.status,
      versionCode: filters.versionCode,
      isTest: filters.isTest,
    });
    records.value = result.list;
    pagination.total = result.pagination.total;
  } finally {
    loading.value = false;
  }
}

async function loadCatalog() {
  try {
    const [versionResult, moduleResult] = await Promise.all([
      getOrganizationVersionsApi(),
      getFeatureModulesApi(),
    ]);
    versionDefinitions.value = listOrganizationVersionsFromApi(
      versionResult.list,
    );
    featureModules.value = moduleResult.list ?? [];
  } catch {
    versionDefinitions.value = [];
    featureModules.value = [];
    message.error('套餐/功能目录加载失败，开通续费已禁用，请稍后重试');
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchOrganizations();
}

function handleReset() {
  filters.keyword = '';
  filters.status = undefined;
  filters.versionCode = undefined;
  filters.isTest = undefined;
  pagination.page = 1;
  void fetchOrganizations();
}

// ==================== 开通 / 续费 ====================

function applyDefaultsFromVersion(code: OrganizationVersionCode) {
  const defaults =
    entitlementVersions.value.find((item) => item.code === code) ?? null;
  grantForm.durationDays = defaultDurationDays(code);
  grantForm.maxMembers = defaults?.maxMembers ?? 40;
  grantForm.maxEmployees = defaults?.maxEmployees ?? 2;
  grantForm.maxCampuses = defaults?.maxCampuses ?? 1;
  const switches: QuotaFeatures = {};
  for (const mod of activeFeatureModules.value) {
    switches[mod.code] = defaults?.features?.[mod.code] === true;
  }
  grantForm.featureSwitches = switches;
}

function prefillGrantForm(org: OrganizationItem) {
  const code = entitlementVersions.value.some((v) => v.code === org.versionCode)
    ? org.versionCode
    : (entitlementVersions.value[0]?.code ?? 'FREE');
  grantForm.versionCode = code;
  grantForm.remark = '';
  const overrides = org.quotaOverrides;
  const defaults =
    entitlementVersions.value.find((item) => item.code === code) ?? null;
  if (overrides) {
    grantForm.enableOverride = true;
    grantForm.maxMembers = overrides.maxMembers ?? defaults?.maxMembers ?? 40;
    grantForm.maxEmployees =
      overrides.maxEmployees ?? defaults?.maxEmployees ?? 2;
    grantForm.maxCampuses =
      overrides.maxCampuses ?? defaults?.maxCampuses ?? 1;
    const switches: QuotaFeatures = {};
    for (const mod of activeFeatureModules.value) {
      switches[mod.code] =
        overrides.features?.[mod.code] ??
        defaults?.features?.[mod.code] === true;
    }
    grantForm.featureSwitches = switches;
    grantForm.durationDays = defaultDurationDays(code);
  } else {
    grantForm.enableOverride = false;
    applyDefaultsFromVersion(code);
  }
}

function openGrantModal(record: OrganizationItem) {
  if (entitlementVersions.value.length === 0) {
    message.error('权益档目录未加载，无法开通/续费');
    return;
  }
  grantTarget.value = record;
  prefillGrantForm(record);
  grantModalOpen.value = true;
}

function handleGrantVersionChange(code: OrganizationVersionCode) {
  grantForm.versionCode = code;
  applyDefaultsFromVersion(code);
}

async function submitGrantEntitlement() {
  if (!grantTarget.value) {
    return Promise.reject();
  }
  if (!grantForm.versionCode) {
    message.warning('请选择权益档');
    return Promise.reject();
  }
  if (!grantForm.durationDays || grantForm.durationDays < 1) {
    message.warning('请填写有效天数');
    return Promise.reject();
  }
  const ok = await confirmAction({
    content: `确认为「${grantTarget.value.name}」开通/续费 ${formatVersion(grantForm.versionCode)}，时长 ${grantForm.durationDays} 天？`,
    title: '确认开通/续费',
  });
  if (!ok) return Promise.reject();

  grantSubmitting.value = true;
  try {
    await grantOrganizationEntitlementApi(grantTarget.value.id, {
      versionCode: grantForm.versionCode,
      durationDays: grantForm.durationDays,
      remark: grantForm.remark.trim() || null,
      quotaOverrides: grantForm.enableOverride
        ? {
            maxMembers: grantForm.maxMembers,
            maxEmployees: grantForm.maxEmployees,
            maxCampuses: grantForm.maxCampuses,
            features: { ...grantForm.featureSwitches },
          }
        : undefined,
    });
    grantModalOpen.value = false;
    message.success('权益已发放（续期 + 升档）');
    await fetchOrganizations();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    grantSubmitting.value = false;
  }
}

// ==================== 冻结 / 解冻 ====================

async function handleFreeze(record: OrganizationItem) {
  await freezeOrganizationApi(record.id);
  message.success(`机构「${record.name}」已冻结`);
  await fetchOrganizations();
}

async function handleUnfreeze(record: OrganizationItem) {
  await unfreezeOrganizationApi(record.id);
  message.success(`机构「${record.name}」已解冻`);
  await fetchOrganizations();
}

async function handleToggleIsTest(record: OrganizationItem, isTest: boolean) {
  const ok = await confirmAction({
    content: isTest
      ? `将「${record.name}」标记为测试机构？标记后可解散或解绑负责人`
      : `取消「${record.name}」的测试标记？取消后不可再解散`,
    title: isTest ? '标记测试机构' : '取消测试标记',
  });
  if (!ok) return;
  await setOrganizationIsTestApi(record.id, { isTest });
  message.success(isTest ? '已标记为测试机构' : '已取消测试机构标记');
  await fetchOrganizations();
}

function openDissolveModal(record: OrganizationItem) {
  dissolveTarget.value = record;
  dissolveConfirmName.value = '';
  dissolveOpen.value = true;
}

async function submitDissolve() {
  if (!dissolveTarget.value) return Promise.reject();
  if (dissolveConfirmName.value.trim() !== dissolveTarget.value.name) {
    message.error('请输入完整机构名称以确认解散');
    return Promise.reject();
  }
  dissolveSubmitting.value = true;
  try {
    await dissolveOrganizationApi(dissolveTarget.value.id);
    message.success(
      `测试机构「${dissolveTarget.value.name}」已解散，数据已删除`,
    );
    dissolveOpen.value = false;
    await fetchOrganizations();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    dissolveSubmitting.value = false;
  }
}

async function handleUnbindOwner(record: OrganizationItem) {
  const ok = await confirmAction({
    content: `解绑「${record.name}」负责人？对方可重新申请入驻，机构将冻结`,
    okType: 'danger',
    title: '确认解绑负责人',
  });
  if (!ok) return;
  await unbindOrganizationOwnerApi(record.id);
  message.success('负责人已解绑，对方可重新申请入驻其他门店');
  await fetchOrganizations();
}

// ==================== 机构详情 / 配额使用率 ====================

async function openQuotaModal(record: OrganizationItem) {
  quotaOrgName.value = record.name;
  quotaModalOpen.value = true;
  quotaLoading.value = true;
  try {
    quotaDetail.value = await getOrganizationQuotaUsageApi(record.id);
  } finally {
    quotaLoading.value = false;
  }
}

function usagePercent(current: number, max: number) {
  if (max <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((current / max) * 100));
}

// ==================== 调整有效期 ====================

function openExpireModal(record: OrganizationItem) {
  expireTarget.value = record;
  expireForm.days = 30;
  expireForm.remark = '';
  expireModalOpen.value = true;
}

async function submitExpireAdjust() {
  if (!expireTarget.value) {
    return Promise.reject();
  }
  if (!expireForm.days) {
    message.warning('请填写调整天数');
    return Promise.reject();
  }
  expireSubmitting.value = true;
  try {
    await adjustOrganizationExpireApi(expireTarget.value.id, {
      days: expireForm.days,
      remark: expireForm.remark.trim() || null,
    });
    message.success('有效期已调整');
    expireModalOpen.value = false;
    await fetchOrganizations();
  } catch (error) {
    return Promise.reject(error);
  } finally {
    expireSubmitting.value = false;
  }
}

onMounted(async () => {
  await loadCatalog();
  await fetchOrganizations();
});
</script>

<template>
  <div class="h-full">
  <OperationTablePage title="机构管理" :loading="loading">
    <template #filters>
      <a-form layout="inline">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="机构名称 / 负责人 / 手机号"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="filters.status"
            allow-clear
            :options="statusOptions"
            placeholder="全部状态"
            style="width: 130px"
          />
        </a-form-item>
        <a-form-item label="版本">
          <a-select
            v-model:value="filters.versionCode"
            allow-clear
            :options="filterVersionOptions"
            placeholder="全部权益档"
            style="width: 180px"
          />
        </a-form-item>
        <a-form-item label="类型">
          <a-select
            v-model:value="filters.isTest"
            allow-clear
            :options="[
              { label: '正式机构', value: false },
              { label: '测试机构', value: true },
            ]"
            placeholder="全部类型"
            style="width: 130px"
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
          { title: '机构名称', dataIndex: 'name' },
          { title: '负责人', dataIndex: 'ownerName' },
          { title: '状态', dataIndex: 'status' },
          { title: '类型', dataIndex: 'isTest' },
          { title: '版本', dataIndex: 'versionCode' },
          { title: '会员', dataIndex: 'usageMembersText' },
          { title: '员工', dataIndex: 'usageEmployeesText' },
          { title: '校区', dataIndex: 'usageCampusesText' },
          { title: '到期时间', dataIndex: 'expireAt' },
          { title: '操作', key: 'action', width: 300 },
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
            fetchOrganizations();
          },
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'status'">
            <a-space :size="4">
              <a-tag :color="statusColor(record.status)">
                {{ formatStatus(record.status) }}
              </a-tag>
              <a-tag v-if="record.expiredActive" color="red">已过期</a-tag>
            </a-space>
          </template>
          <template v-else-if="column.dataIndex === 'isTest'">
            <a-tag :color="record.isTest ? 'orange' : 'default'">
              {{ record.isTest ? '测试' : '正式' }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'versionCode'">
            <a-tag :color="versionColor(record.versionCode)">
              {{ formatVersion(record.versionCode) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'expireAt'">
            <span :class="record.expiredActive ? 'text-red-500' : ''">
              {{ formatDateTime(record.expireAt) }}
            </span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-space :size="4" wrap>
              <a-button
                type="link"
                size="small"
                @click="openQuotaModal(record)"
              >
                详情
              </a-button>
              <a-button
                type="link"
                size="small"
                @click="openGrantModal(record)"
              >
                开通/续费
              </a-button>
              <template v-if="record.status === 'FROZEN'">
                <a-popconfirm
                  :title="`确认解冻机构「${record.name}」？`"
                  ok-text="解冻"
                  cancel-text="取消"
                  @confirm="handleUnfreeze(record)"
                >
                  <a-button type="link" size="small">解冻</a-button>
                </a-popconfirm>
              </template>
              <template v-else-if="record.status === 'ACTIVE'">
                <a-popconfirm
                  :title="`确认冻结机构「${record.name}」？冻结后无法登录小程序`"
                  ok-text="冻结"
                  cancel-text="取消"
                  @confirm="handleFreeze(record)"
                >
                  <a-button danger type="link" size="small">冻结</a-button>
                </a-popconfirm>
              </template>
              <a-dropdown>
                <a-button type="link" size="small">更多</a-button>
                <template #overlay>
                  <a-menu>
                    <a-menu-item
                      key="expire"
                      @click="openExpireModal(record)"
                    >
                      有效期
                    </a-menu-item>
                    <a-menu-item
                      v-if="!record.isTest"
                      key="mark-test"
                      @click="handleToggleIsTest(record, true)"
                    >
                      标为测试
                    </a-menu-item>
                    <template v-else>
                      <a-menu-item
                        key="unmark-test"
                        @click="handleToggleIsTest(record, false)"
                      >
                        取消测试
                      </a-menu-item>
                      <a-menu-item
                        v-if="record.ownerId"
                        key="unbind"
                        @click="handleUnbindOwner(record)"
                      >
                        解绑负责人
                      </a-menu-item>
                      <a-menu-item
                        v-if="isFullAdmin"
                        key="dissolve"
                        @click="openDissolveModal(record)"
                      >
                        解散
                      </a-menu-item>
                    </template>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
  </OperationTablePage>

    <!-- 开通/续费弹窗 -->
    <a-modal
      v-model:open="grantModalOpen"
      title="开通 / 续费机构权益"
      ok-text="确认发放"
      cancel-text="取消"
      :confirm-loading="grantSubmitting"
      width="640px"
      @ok="submitGrantEntitlement"
    >
      <a-form layout="vertical">
        <a-form-item v-if="grantTarget" label="当前版本">
          <a-tag :color="versionColor(grantTarget.versionCode)">
            {{ formatVersion(grantTarget.versionCode) }}
          </a-tag>
        </a-form-item>
        <a-form-item label="目标权益档" required>
          <a-select
            v-model:value="grantForm.versionCode"
            :options="versionOptions"
            placeholder="仅权益档（不含年限 SKU）"
            @change="handleGrantVersionChange"
          />
        </a-form-item>
        <a-form-item label="时长（天）" required>
          <a-input-number
            v-model:value="grantForm.durationDays"
            :min="1"
            :max="3650"
            :precision="0"
            style="width: 200px"
          />
          <div class="mt-1 text-[13px] text-[var(--ant-color-text-secondary)]">
            试用默认 14 天，其余默认取档位时长或 365 天
          </div>
        </a-form-item>
        <a-alert
          v-if="selectedVersionDefaults"
          class="mb-4"
          show-icon
          type="info"
        >
          <template #message>
            {{ selectedVersionDefaults.name }}（{{
              selectedVersionDefaults.code
            }}）： 会员 {{ selectedVersionDefaults.maxMembers }} / 员工
            {{ selectedVersionDefaults.maxEmployees }} / 校区
            {{ selectedVersionDefaults.maxCampuses }}
          </template>
        </a-alert>
        <a-form-item label="备注">
          <a-input
            v-model:value="grantForm.remark"
            :maxlength="200"
            placeholder="选填"
          />
        </a-form-item>
        <a-form-item>
          <a-switch v-model:checked="grantForm.enableOverride" />
          <span class="ml-2 text-[13px] text-[var(--ant-color-text-secondary)]">
            自定义配额覆盖（不开启则使用目标权益档默认配额）
          </span>
        </a-form-item>
        <template v-if="grantForm.enableOverride">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="会员数上限">
                <a-input-number
                  v-model:value="grantForm.maxMembers"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="员工数上限">
                <a-input-number
                  v-model:value="grantForm.maxEmployees"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="校区数上限">
                <a-input-number
                  v-model:value="grantForm.maxCampuses"
                  :min="1"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="功能开关">
            <a-space :size="16" wrap>
              <span
                v-for="mod in activeFeatureModules"
                :key="mod.code"
                class="inline-flex items-center"
              >
                <a-switch
                  v-model:checked="grantForm.featureSwitches[mod.code]"
                  size="small"
                />
                <span class="ml-2">{{ mod.name }}</span>
              </span>
              <span
                v-if="activeFeatureModules.length === 0"
                class="text-[13px] text-[var(--ant-color-text-secondary)]"
              >
                暂无功能模块目录
              </span>
            </a-space>
          </a-form-item>
        </template>
      </a-form>
    </a-modal>

    <!-- 机构详情 / 配额使用率弹窗 -->
    <a-modal
      v-model:open="quotaModalOpen"
      :title="`机构详情：${quotaOrgName}`"
      :footer="null"
      width="560px"
    >
      <a-spin :spinning="quotaLoading">
        <template v-if="quotaDetail">
          <a-descriptions :column="1" bordered size="small" class="mb-4">
            <a-descriptions-item label="当前版本">
              <a-tag :color="versionColor(quotaDetail.versionCode)">
                {{
                  quotaDetail.versionName
                    ? `${quotaDetail.versionName} · ${quotaDetail.versionCode}`
                    : formatVersion(quotaDetail.versionCode)
                }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
          <a-card size="small" class="mb-4">
            <template #title>配额使用率（当前 / 上限）</template>
            <div class="mb-3">
              <div class="mb-1 flex justify-between text-[13px]">
                <span>会员</span>
                <span>
                  {{ quotaDetail.currentMembers }} /
                  {{ quotaDetail.maxMembers }}
                </span>
              </div>
              <a-progress
                :percent="
                  usagePercent(
                    quotaDetail.currentMembers,
                    quotaDetail.maxMembers,
                  )
                "
                :status="
                  quotaDetail.currentMembers > quotaDetail.maxMembers
                    ? 'exception'
                    : 'normal'
                "
                size="small"
              />
            </div>
            <div class="mb-3">
              <div class="mb-1 flex justify-between text-[13px]">
                <span>员工</span>
                <span>
                  {{ quotaDetail.currentEmployees }} /
                  {{ quotaDetail.maxEmployees }}
                </span>
              </div>
              <a-progress
                :percent="
                  usagePercent(
                    quotaDetail.currentEmployees,
                    quotaDetail.maxEmployees,
                  )
                "
                :status="
                  quotaDetail.currentEmployees > quotaDetail.maxEmployees
                    ? 'exception'
                    : 'normal'
                "
                size="small"
              />
            </div>
            <div>
              <div class="mb-1 flex justify-between text-[13px]">
                <span>校区</span>
                <span>
                  {{ quotaDetail.currentCampuses }} /
                  {{ quotaDetail.maxCampuses }}
                </span>
              </div>
              <a-progress
                :percent="
                  usagePercent(
                    quotaDetail.currentCampuses,
                    quotaDetail.maxCampuses,
                  )
                "
                :status="
                  quotaDetail.currentCampuses > quotaDetail.maxCampuses
                    ? 'exception'
                    : 'normal'
                "
                size="small"
              />
            </div>
          </a-card>
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item
              v-for="mod in activeFeatureModules"
              :key="mod.code"
              :label="mod.name"
            >
              {{ featureLabel(quotaDetail.features?.[mod.code] ?? false) }}
            </a-descriptions-item>
            <template v-if="activeFeatureModules.length === 0">
              <a-descriptions-item label="线索溯源">
                {{ featureLabel(quotaDetail.features?.leadTrace ?? false) }}
              </a-descriptions-item>
              <a-descriptions-item label="批量导入导出">
                {{
                  featureLabel(quotaDetail.features?.batchImportExport ?? false)
                }}
              </a-descriptions-item>
            </template>
          </a-descriptions>
        </template>
      </a-spin>
    </a-modal>

    <!-- 调整有效期弹窗 -->
    <a-modal
      v-model:open="expireModalOpen"
      title="调整机构有效期"
      ok-text="确认调整"
      cancel-text="取消"
      :confirm-loading="expireSubmitting"
      @ok="submitExpireAdjust"
    >
      <a-form layout="vertical">
        <a-form-item label="调整天数" required>
          <a-input-number
            v-model:value="expireForm.days"
            :min="-3650"
            :max="3650"
            :precision="0"
            style="width: 200px"
          />
          <div class="mt-1 text-[13px] text-[var(--ant-color-text-secondary)]">
            正数延长、负数缩短；在原到期时间基础上增减，机构当前无到期时间时按当前时间计算
          </div>
        </a-form-item>
        <a-form-item label="备注">
          <a-textarea
            v-model:value="expireForm.remark"
            :maxlength="500"
            :rows="3"
            placeholder="选填，将写入机构操作日志"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 解散确认：需输入机构全名 -->
    <a-modal
      v-model:open="dissolveOpen"
      title="确认解散机构"
      ok-text="确认解散"
      ok-type="danger"
      cancel-text="取消"
      :confirm-loading="dissolveSubmitting"
      @ok="submitDissolve"
    >
      <a-alert
        class="mb-4"
        show-icon
        type="error"
        :message="`将永久删除测试机构「${dissolveTarget?.name ?? ''}」全部数据，不可恢复。`"
      />
      <a-form layout="vertical">
        <a-form-item :label="`请输入机构名称「${dissolveTarget?.name ?? ''}」以确认`">
          <a-input
            v-model:value="dissolveConfirmName"
            placeholder="输入完整机构名称"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
