<script lang="ts" setup>
import type {
  FeatureModuleItem,
  OrganizationVersionItem,
  QuotaFeatures,
} from '#/api';

import { computed, onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  createOrganizationVersionApi,
  getFeatureModulesApi,
  getOrganizationVersionsApi,
  updateFeatureMatrixApi,
  updateOrganizationVersionApi,
} from '#/api';
import {
  mergeOrganizationVersionCatalog,
  versionColor,
} from '#/utils/organization-version';

const loading = ref(false);
const savingMatrix = ref(false);
const records = ref<OrganizationVersionItem[]>([]);
const featureModules = ref<FeatureModuleItem[]>([]);
/** versionCode -> featureCode -> boolean（可编辑草稿） */
const matrixDraft = ref<Record<string, Record<string, boolean>>>({});

const editOpen = ref(false);
const createOpen = ref(false);
const editing = ref(false);
const creating = ref(false);
const editTarget = ref<null | OrganizationVersionItem>(null);

const editForm = reactive({
  name: '',
  description: '',
  maxMembers: 0,
  maxEmployees: 0,
  maxCampuses: 1,
  price: 0,
  durationDays: 365,
  status: 'active',
  sort: 0,
});

const createForm = reactive({
  code: '',
  name: '',
  description: '',
  maxMembers: 40,
  maxEmployees: 2,
  maxCampuses: 1,
  price: 0,
  durationDays: 365,
  status: 'active',
  sort: 10,
});

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const activeModules = computed(() =>
  featureModules.value.filter((m) => m.status !== 'disabled'),
);

const matrixColumns = computed(() => [
  { title: '功能模块', dataIndex: 'name', fixed: 'left', width: 160 },
  { title: '分类', dataIndex: 'category', width: 100 },
  ...records.value.map((v) => ({
    title: `${v.name}`,
    dataIndex: v.code,
    width: 110,
    align: 'center' as const,
  })),
]);

const matrixRows = computed(() =>
  activeModules.value.map((mod) => ({
    key: mod.code,
    code: mod.code,
    name: mod.name,
    category: mod.category,
    description: mod.description,
  })),
);

function formatDateTime(value?: null | string) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === 'active') return '启用';
  if (status === 'disabled') return '停用';
  return status || '-';
}

function statusColor(status: string) {
  return status === 'active' ? 'green' : 'default';
}

function enabledFeatureCount(features?: QuotaFeatures) {
  if (!features) return 0;
  return Object.values(features).filter(Boolean).length;
}

function rebuildMatrixDraft(
  versions: OrganizationVersionItem[],
  modules: FeatureModuleItem[],
) {
  const draft: Record<string, Record<string, boolean>> = {};
  for (const v of versions) {
    const row: Record<string, boolean> = {};
    for (const m of modules) {
      row[m.code] = v.features?.[m.code] === true;
    }
    draft[v.code] = row;
  }
  matrixDraft.value = draft;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [versionResult, moduleResult] = await Promise.all([
      getOrganizationVersionsApi(),
      getFeatureModulesApi(),
    ]);
    records.value = mergeOrganizationVersionCatalog(versionResult.list);
    featureModules.value = moduleResult.list ?? [];
    rebuildMatrixDraft(records.value, featureModules.value);
  } catch {
    records.value = [];
    featureModules.value = [];
    matrixDraft.value = {};
    message.error(
      '套餐目录加载失败，请检查网络后重试（未使用本地兜底，避免误改）',
    );
  } finally {
    loading.value = false;
  }
}

function openEdit(record: OrganizationVersionItem) {
  editTarget.value = record;
  editForm.name = record.name;
  editForm.description = record.description ?? '';
  editForm.maxMembers = record.maxMembers;
  editForm.maxEmployees = record.maxEmployees;
  editForm.maxCampuses = record.maxCampuses;
  editForm.price = record.price;
  editForm.durationDays = record.durationDays;
  editForm.status = record.status || 'active';
  editForm.sort = record.sort;
  editOpen.value = true;
}

function openCreate() {
  createForm.code = '';
  createForm.name = '';
  createForm.description = '';
  createForm.maxMembers = 40;
  createForm.maxEmployees = 2;
  createForm.maxCampuses = 1;
  createForm.price = 0;
  createForm.durationDays = 365;
  createForm.status = 'active';
  createForm.sort = (records.value.at(-1)?.sort ?? 0) + 1;
  createOpen.value = true;
}

async function submitEdit() {
  if (!editTarget.value) return;
  if (!editForm.name.trim()) {
    message.warning('版本名称不能为空');
    return;
  }
  if (editForm.maxCampuses < 1) {
    message.warning('校区数上限至少为 1');
    return;
  }
  editing.value = true;
  try {
    await updateOrganizationVersionApi(editTarget.value.code, {
      description: editForm.description.trim() || null,
      durationDays: editForm.durationDays,
      maxCampuses: editForm.maxCampuses,
      maxEmployees: editForm.maxEmployees,
      maxMembers: editForm.maxMembers,
      name: editForm.name.trim(),
      price: editForm.price,
      sort: editForm.sort,
      status: editForm.status,
    });
    message.success(`套餐「${editForm.name}」已更新`);
    editOpen.value = false;
    await fetchAll();
  } finally {
    editing.value = false;
  }
}

async function submitCreate() {
  const code = createForm.code.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_]*$/.test(code)) {
    message.warning('code 需为大写字母开头，仅含字母/数字/下划线');
    return;
  }
  if (!createForm.name.trim()) {
    message.warning('版本名称不能为空');
    return;
  }
  creating.value = true;
  try {
    await createOrganizationVersionApi({
      code,
      description: createForm.description.trim() || null,
      durationDays: createForm.durationDays,
      maxCampuses: createForm.maxCampuses,
      maxEmployees: createForm.maxEmployees,
      maxMembers: createForm.maxMembers,
      name: createForm.name.trim(),
      price: createForm.price,
      sort: createForm.sort,
      status: createForm.status,
    });
    message.success(`套餐「${createForm.name}」已创建`);
    createOpen.value = false;
    await fetchAll();
  } finally {
    creating.value = false;
  }
}

function toggleMatrix(
  versionCode: string,
  featureCode: string,
  checked: boolean,
) {
  if (!matrixDraft.value[versionCode]) {
    matrixDraft.value[versionCode] = {};
  }
  matrixDraft.value[versionCode][featureCode] = checked;
}

async function saveMatrix() {
  savingMatrix.value = true;
  try {
    await updateFeatureMatrixApi({ matrix: matrixDraft.value });
    message.success('功能矩阵已保存');
    await fetchAll();
  } finally {
    savingMatrix.value = false;
  }
}

onMounted(fetchAll);
</script>

<template>
  <div class="p-5">
    <a-card title="套餐与功能" :bordered="false" class="mb-4">
      <div
        class="mb-4 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-[13px] text-[var(--ant-color-text-secondary)]"
      >
        配置机构 SaaS 档位的用量配额，并在下方矩阵中按「档位 ×
        功能模块」开关授权。保存后即时影响
        <code>assertFeature</code> / 小程序
        entitlements。个人会员套餐请到「会员管理」。
      </div>

      <div class="mb-3 flex justify-end">
        <a-button type="primary" @click="openCreate">新增档位</a-button>
      </div>

      <a-table
        :columns="[
          { title: '版本', dataIndex: 'code' },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description', ellipsis: true },
          { title: '会员上限', dataIndex: 'maxMembers', width: 100 },
          { title: '员工上限', dataIndex: 'maxEmployees', width: 100 },
          { title: '校区上限', dataIndex: 'maxCampuses', width: 100 },
          { title: '已开功能', dataIndex: 'features', width: 100 },
          { title: '价格(元/年)', dataIndex: 'price', width: 110 },
          { title: '时长(天)', dataIndex: 'durationDays', width: 90 },
          { title: '状态', dataIndex: 'status', width: 80 },
          { title: '更新时间', dataIndex: 'updatedAt', width: 120 },
          { title: '操作', key: 'action', width: 90 },
        ]"
        :data-source="records"
        :loading="loading"
        :pagination="false"
        row-key="code"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'code'">
            <a-tag :color="versionColor(record.code)">
              {{ record.name }} · {{ record.code }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'description'">
            <span :title="record.description || '-'">{{
              record.description || '-'
            }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'features'">
            {{ enabledFeatureCount(record.features) }} /
            {{ activeModules.length || '-' }}
          </template>
          <template v-else-if="column.dataIndex === 'status'">
            <a-tag :color="statusColor(record.status)">
              {{ statusLabel(record.status) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'updatedAt'">
            {{ formatDateTime(record.updatedAt) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openEdit(record)">
              编辑配额
            </a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card title="功能授权矩阵" :bordered="false">
      <template #extra>
        <a-button type="primary" :loading="savingMatrix" @click="saveMatrix">
          保存矩阵
        </a-button>
      </template>
      <a-table
        :columns="matrixColumns"
        :data-source="matrixRows"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 200 + records.length * 110 }"
        row-key="code"
        size="small"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'name'">
            <div>
              <div>{{ record.name }}</div>
              <div class="text-xs text-[var(--ant-color-text-secondary)]">
                {{ record.code }}
              </div>
            </div>
          </template>
          <template
            v-else-if="
              column.dataIndex &&
              column.dataIndex !== 'category' &&
              matrixDraft[column.dataIndex as string]
            "
          >
            <a-switch
              size="small"
              :checked="
                matrixDraft[column.dataIndex as string]?.[record.code] === true
              "
              @change="
                (checked: boolean) =>
                  toggleMatrix(column.dataIndex as string, record.code, checked)
              "
            />
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editOpen"
      :title="`编辑配额：${editTarget?.name ?? ''}（${editTarget?.code ?? ''}）`"
      ok-text="保存"
      cancel-text="取消"
      :confirm-loading="editing"
      width="560px"
      @ok="submitEdit"
    >
      <a-form layout="vertical">
        <a-form-item label="套餐名称" required>
          <a-input v-model:value="editForm.name" :maxlength="50" />
        </a-form-item>
        <a-form-item label="套餐描述">
          <a-textarea
            v-model:value="editForm.description"
            :maxlength="200"
            :rows="2"
          />
        </a-form-item>
        <a-divider orientation="left" plain>用量配额</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="会员数上限" required>
              <a-input-number
                v-model:value="editForm.maxMembers"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="员工数上限" required>
              <a-input-number
                v-model:value="editForm.maxEmployees"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="校区数上限" required>
              <a-input-number
                v-model:value="editForm.maxCampuses"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-divider orientation="left" plain>售卖信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="价格（元/年）">
              <a-input-number
                v-model:value="editForm.price"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="时长（天）" required>
              <a-input-number
                v-model:value="editForm.durationDays"
                :min="1"
                :max="3650"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="状态">
              <a-select
                v-model:value="editForm.status"
                :options="statusOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="排序">
          <a-input-number
            v-model:value="editForm.sort"
            :min="0"
            :precision="0"
            style="width: 160px"
          />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="createOpen"
      title="新增套餐档位"
      ok-text="创建"
      cancel-text="取消"
      :confirm-loading="creating"
      width="560px"
      @ok="submitCreate"
    >
      <a-form layout="vertical">
        <a-form-item label="版本 code" required>
          <a-input
            v-model:value="createForm.code"
            placeholder="如 ENTERPRISE"
            :maxlength="50"
            style="text-transform: uppercase"
          />
        </a-form-item>
        <a-form-item label="套餐名称" required>
          <a-input v-model:value="createForm.name" :maxlength="50" />
        </a-form-item>
        <a-form-item label="套餐描述">
          <a-textarea
            v-model:value="createForm.description"
            :maxlength="200"
            :rows="2"
          />
        </a-form-item>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="会员上限">
              <a-input-number
                v-model:value="createForm.maxMembers"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="员工上限">
              <a-input-number
                v-model:value="createForm.maxEmployees"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="校区上限">
              <a-input-number
                v-model:value="createForm.maxCampuses"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="价格（元/年）">
              <a-input-number
                v-model:value="createForm.price"
                :min="0"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="时长（天）">
              <a-input-number
                v-model:value="createForm.durationDays"
                :min="1"
                :max="3650"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="状态">
              <a-select
                v-model:value="createForm.status"
                :options="statusOptions"
              />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>
