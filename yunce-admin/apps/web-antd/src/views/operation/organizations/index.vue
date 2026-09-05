<script lang="ts" setup>
import type {
  OrganizationItem,
  OrganizationQuotaUsage,
  OrganizationStatus,
  OrganizationVersionCode,
  OrganizationVersionItem,
  OverLimitResult,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { useUserStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import {
  adjustOrganizationExpireApi,
  dissolveOrganizationApi,
  freezeOrganizationApi,
  getOrganizationQuotaUsageApi,
  getOrganizationsApi,
  getOrganizationVersionsApi,
  setOrganizationIsTestApi,
  setOrganizationVersionApi,
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

import OperationTablePage from '../components/OperationTablePage.vue';

const userStore = useUserStore();
const isFullAdmin = computed(() => {
  const roles = userStore.userInfo?.roles ?? [];
  return roles.includes('admin') || roles.includes('super_admin');
});

const loading = ref(false);
const records = ref<OrganizationItem[]>([]);
const versionDefinitions = ref<OrganizationVersionItem[]>([]);
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

/** 降配超限提示（Q8：存量保留、禁止新增） */
const overLimitNotice = ref<null | {
  campuses: boolean;
  employees: boolean;
  members: boolean;
  name: string;
}>(null);

// ==================== 版本调整弹窗 ====================

const versionModalOpen = ref(false);
const versionSubmitting = ref(false);
const versionTarget = ref<null | OrganizationItem>(null);
const versionForm = reactive({
  versionCode: 'FREE' as OrganizationVersionCode,
  enableOverride: false,
  maxMembers: 40,
  maxEmployees: 2,
  maxCampuses: 1,
  leadTrace: false,
  batchImportExport: false,
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

const versionOptions = computed(() =>
  buildVersionSelectOptions(versionDefinitions.value),
);

const selectedVersionDefaults = computed(
  () =>
    versionDefinitions.value.find(
      (item) => item.code === versionForm.versionCode,
    ) ?? null,
);

const tableData = computed(() =>
  records.value.map((item) => ({
    ...item,
    ownerName:
      item.owner?.name || item.owner?.nickname || item.owner?.phone || '-',
    usageMembers: item.quotaUsage?.members ?? 0,
    usageEmployees: item.quotaUsage?.employees ?? 0,
    usageCampuses: item.quotaUsage?.campuses ?? 0,
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

async function loadVersionDefinitions() {
  try {
    const versionResult = await getOrganizationVersionsApi();
    versionDefinitions.value = listOrganizationVersionsFromApi(
      versionResult.list,
    );
  } catch {
    versionDefinitions.value = [];
    message.error('套餐目录加载失败，版本变更已禁用，请稍后重试');
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

// ==================== 版本调整 ====================

function applyDefaultsFromVersion(code: OrganizationVersionCode) {
  const defaults =
    versionDefinitions.value.find((item) => item.code === code) ?? null;
  versionForm.maxMembers = defaults?.maxMembers ?? 40;
  versionForm.maxEmployees = defaults?.maxEmployees ?? 2;
  versionForm.maxCampuses = defaults?.maxCampuses ?? 1;
  versionForm.leadTrace = defaults?.features?.leadTrace ?? false;
  versionForm.batchImportExport =
    defaults?.features?.batchImportExport ?? false;
}

function prefillVersionForm(org: OrganizationItem) {
  versionForm.versionCode = org.versionCode;
  const overrides = org.quotaOverrides;
  const defaults =
    versionDefinitions.value.find((item) => item.code === org.versionCode) ??
    null;
  if (overrides) {
    versionForm.enableOverride = true;
    versionForm.maxMembers = overrides.maxMembers ?? defaults?.maxMembers ?? 40;
    versionForm.maxEmployees =
      overrides.maxEmployees ?? defaults?.maxEmployees ?? 2;
    versionForm.maxCampuses =
      overrides.maxCampuses ?? defaults?.maxCampuses ?? 1;
    versionForm.leadTrace =
      overrides.features?.leadTrace ?? defaults?.features?.leadTrace ?? false;
    versionForm.batchImportExport =
      overrides.features?.batchImportExport ??
      defaults?.features?.batchImportExport ??
      false;
  } else {
    versionForm.enableOverride = false;
    applyDefaultsFromVersion(org.versionCode);
  }
}

function openVersionModal(record: OrganizationItem) {
  if (versionDefinitions.value.length === 0) {
    message.error('套餐目录未加载，无法调整版本');
    return;
  }
  versionTarget.value = record;
  prefillVersionForm(record);
  versionModalOpen.value = true;
}

function handleVersionCodeChange(code: OrganizationVersionCode) {
  versionForm.versionCode = code;
  applyDefaultsFromVersion(code);
}

async function submitVersionChange() {
  if (!versionTarget.value) {
    return;
  }
  versionSubmitting.value = true;
  try {
    const result = await setOrganizationVersionApi(versionTarget.value.id, {
      versionCode: versionForm.versionCode,
      quotaOverrides: versionForm.enableOverride
        ? {
            maxMembers: versionForm.maxMembers,
            maxEmployees: versionForm.maxEmployees,
            maxCampuses: versionForm.maxCampuses,
            features: {
              leadTrace: versionForm.leadTrace,
              batchImportExport: versionForm.batchImportExport,
            },
          }
        : undefined,
    });
    versionModalOpen.value = false;
    const overLimit: OverLimitResult | undefined = result?.overLimit;
    if (overLimit?.overLimit) {
      overLimitNotice.value = {
        members: overLimit.members,
        employees: overLimit.employees,
        campuses: overLimit.campuses,
        name: versionTarget.value.name,
      };
      message.warning(
        '版本已调整，但降配后存在存量超出：已保留存量数据，禁止新增',
      );
    } else {
      message.success('版本已调整并立即生效');
    }
    await fetchOrganizations();
  } finally {
    versionSubmitting.value = false;
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

async function handleDissolve(record: OrganizationItem) {
  const ok = await confirmAction({
    content: `解散测试机构「${record.name}」？将永久删除该机构全部数据，不可恢复`,
    okType: 'danger',
    title: '确认解散机构',
  });
  if (!ok) return;
  await dissolveOrganizationApi(record.id);
  message.success(`测试机构「${record.name}」已解散，数据已删除`);
  await fetchOrganizations();
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
    return;
  }
  if (!expireForm.days) {
    message.warning('请填写调整天数');
    return;
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
  } finally {
    expireSubmitting.value = false;
  }
}

onMounted(async () => {
  await loadVersionDefinitions();
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
            :options="versionOptions"
            placeholder="全部版本"
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

      <a-alert
        v-if="overLimitNotice"
        class="mb-4"
        closable
        show-icon
        type="warning"
        @close="overLimitNotice = null"
      >
        <template #message>
          机构「{{ overLimitNotice.name }}」版本调整后存量超出配额：
          <template v-if="overLimitNotice.members">会员 </template>
          <template v-if="overLimitNotice.employees">员工 </template>
          <template v-if="overLimitNotice.campuses">校区 </template>
          已超限。降配策略为「存量保留、禁止新增」，请及时调整配额或升级版本。
        </template>
      </a-alert>

      <a-table
        :columns="[
          { title: '机构名称', dataIndex: 'name' },
          { title: '负责人', dataIndex: 'ownerName' },
          { title: '状态', dataIndex: 'status' },
          { title: '类型', dataIndex: 'isTest' },
          { title: '版本', dataIndex: 'versionCode' },
          { title: '会员数', dataIndex: 'usageMembers' },
          { title: '员工数', dataIndex: 'usageEmployees' },
          { title: '校区数', dataIndex: 'usageCampuses' },
          { title: '到期时间', dataIndex: 'expireAt' },
          { title: '操作', key: 'action', width: 280 },
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
            <a-tag :color="statusColor(record.status)">
              {{ formatStatus(record.status) }}
            </a-tag>
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
            {{ formatDateTime(record.expireAt) }}
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
                @click="openVersionModal(record)"
              >
                调整版本
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
                        @click="handleDissolve(record)"
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

    <!-- 调整版本弹窗 -->
    <a-modal
      v-model:open="versionModalOpen"
      title="调整机构版本 / 配额"
      ok-text="保存并生效"
      cancel-text="取消"
      :confirm-loading="versionSubmitting"
      @ok="submitVersionChange"
    >
      <a-form layout="vertical">
        <a-form-item v-if="versionTarget" label="当前版本">
          <a-tag :color="versionColor(versionTarget.versionCode)">
            {{ formatVersion(versionTarget.versionCode) }}
          </a-tag>
        </a-form-item>
        <a-form-item label="目标版本" required>
          <a-select
            v-model:value="versionForm.versionCode"
            :options="versionOptions"
            placeholder="请选择套餐（含 FREE）"
            @change="handleVersionCodeChange"
          />
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
            {{ selectedVersionDefaults.maxCampuses }}； 线索溯源
            {{
              featureLabel(
                selectedVersionDefaults.features?.leadTrace ?? false,
              )
            }}， 批量导入导出
            {{
              featureLabel(
                selectedVersionDefaults.features?.batchImportExport ?? false,
              )
            }}
          </template>
        </a-alert>
        <a-form-item>
          <a-switch v-model:checked="versionForm.enableOverride" />
          <span class="ml-2 text-[13px] text-[var(--ant-color-text-secondary)]">
            自定义配额覆盖（不开启则使用目标版本默认配额）
          </span>
        </a-form-item>
        <template v-if="versionForm.enableOverride">
          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="会员数上限">
                <a-input-number
                  v-model:value="versionForm.maxMembers"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="员工数上限">
                <a-input-number
                  v-model:value="versionForm.maxEmployees"
                  :min="0"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="校区数上限">
                <a-input-number
                  v-model:value="versionForm.maxCampuses"
                  :min="1"
                  :precision="0"
                  style="width: 100%"
                />
              </a-form-item>
            </a-col>
          </a-row>
          <a-form-item label="功能开关">
            <a-space :size="24">
              <span>
                <a-switch
                  v-model:checked="versionForm.leadTrace"
                  size="small"
                />
                <span class="ml-2">线索溯源</span>
              </span>
              <span>
                <a-switch
                  v-model:checked="versionForm.batchImportExport"
                  size="small"
                />
                <span class="ml-2">批量导入导出</span>
              </span>
            </a-space>
          </a-form-item>
        </template>
        <a-alert
          v-if="versionForm.enableOverride"
          show-icon
          type="info"
          message="自定义覆盖仅影响该机构；如需全局调整请到「套餐限额」修改默认配额与功能开关"
        />
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
            <a-descriptions-item label="线索溯源">
              {{ featureLabel(quotaDetail.features?.leadTrace ?? false) }}
            </a-descriptions-item>
            <a-descriptions-item label="批量导入导出">
              {{
                featureLabel(quotaDetail.features?.batchImportExport ?? false)
              }}
            </a-descriptions-item>
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
  </div>
</template>
