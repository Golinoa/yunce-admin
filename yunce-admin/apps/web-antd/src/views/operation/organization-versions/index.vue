<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import type { OrganizationVersionCode, OrganizationVersionItem } from '#/api';
import { getOrganizationVersionsApi, updateOrganizationVersionApi } from '#/api';

const loading = ref(false);
const records = ref<OrganizationVersionItem[]>([]);

const editOpen = ref(false);
const editing = ref(false);
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
  leadTrace: false,
  batchImportExport: false,
});

const statusOptions = [
  { label: '启用', value: 'active' },
  { label: '停用', value: 'disabled' },
];

const versionColorMap: Record<OrganizationVersionCode, string> = {
  FREE: 'default',
  STANDARD: 'blue',
  FLAGSHIP: 'purple',
};

function versionColor(code: OrganizationVersionCode) {
  return versionColorMap[code] ?? 'default';
}

function formatDateTime(value?: null | string) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('zh-CN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function featureLabel(enabled: boolean) {
  return enabled ? '开' : '关';
}

function featureTagColor(enabled: boolean) {
  return enabled ? 'green' : 'default';
}

function statusLabel(status: string) {
  return status === 'active' ? '启用' : status === 'disabled' ? '停用' : status || '-';
}

function statusColor(status: string) {
  return status === 'active' ? 'green' : status === 'disabled' ? 'default' : 'default';
}

async function fetchVersions() {
  loading.value = true;
  try {
    const result = await getOrganizationVersionsApi();
    records.value = result.list;
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
  editForm.leadTrace = record.features?.leadTrace ?? false;
  editForm.batchImportExport = record.features?.batchImportExport ?? false;
  editOpen.value = true;
}

async function submitEdit() {
  if (!editTarget.value) {
    return;
  }
  if (!editForm.name.trim()) {
    message.warning('版本名称不能为空');
    return;
  }
  if (editForm.maxMembers < 0 || editForm.maxEmployees < 0) {
    message.warning('配额不能为负数');
    return;
  }
  if (editForm.maxCampuses < 1) {
    message.warning('校区数上限至少为 1');
    return;
  }
  if (editForm.durationDays < 1) {
    message.warning('时长至少为 1 天');
    return;
  }
  editing.value = true;
  try {
    await updateOrganizationVersionApi(editTarget.value.code, {
      description: editForm.description.trim() || null,
      durationDays: editForm.durationDays,
      features: {
        batchImportExport: editForm.batchImportExport,
        leadTrace: editForm.leadTrace,
      },
      maxCampuses: editForm.maxCampuses,
      maxEmployees: editForm.maxEmployees,
      maxMembers: editForm.maxMembers,
      name: editForm.name.trim(),
      price: editForm.price,
      status: editForm.status,
    });
    message.success(`套餐「${editForm.name}」限额已更新`);
    editOpen.value = false;
    await fetchVersions();
  } finally {
    editing.value = false;
  }
}

onMounted(fetchVersions);
</script>

<template>
  <div class="p-5">
    <a-card title="套餐限额" :bordered="false">
      <div class="mb-4 rounded-lg bg-[var(--ant-color-fill-quaternary)] px-4 py-3 text-[13px] text-[var(--ant-color-text-secondary)]">
        为机构会员套餐（FREE / STANDARD / FLAGSHIP）配置<strong>用量配额</strong>与<strong>功能开关</strong>，同页编辑、保存即生效。单机构覆盖请到「机构管理」。免费版按产品口径固定（40 会员 / 2 员工 / 1 校区；禁线索溯源、禁批量导入导出）。
      </div>

      <a-table
        :columns="[
          { title: '版本', dataIndex: 'code' },
          { title: '名称', dataIndex: 'name' },
          { title: '描述', dataIndex: 'description' },
          { title: '会员上限', dataIndex: 'maxMembers' },
          { title: '员工上限', dataIndex: 'maxEmployees' },
          { title: '校区上限', dataIndex: 'maxCampuses' },
          { title: '线索溯源', dataIndex: 'leadTrace' },
          { title: '批量导入导出', dataIndex: 'batchImportExport' },
          { title: '价格(元/年)', dataIndex: 'price' },
          { title: '时长(天)', dataIndex: 'durationDays' },
          { title: '状态', dataIndex: 'status' },
          { title: '更新时间', dataIndex: 'updatedAt' },
          { title: '操作', key: 'action' },
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
              {{ record.code }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'description'">
            <span :title="record.description || '-'">{{ record.description || '-' }}</span>
          </template>
          <template v-else-if="column.dataIndex === 'leadTrace'">
            <a-tag :color="featureTagColor(record.features?.leadTrace ?? false)">
              {{ featureLabel(record.features?.leadTrace ?? false) }}
            </a-tag>
          </template>
          <template v-else-if="column.dataIndex === 'batchImportExport'">
            <a-tag :color="featureTagColor(record.features?.batchImportExport ?? false)">
              {{ featureLabel(record.features?.batchImportExport ?? false) }}
            </a-tag>
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
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="editOpen"
      :title="`编辑套餐限额：${editTarget?.name ?? ''}`"
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
            placeholder="选填，如：免费版：40 会员 / 2 员工 / 1 校区"
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

        <a-divider orientation="left" plain>功能开关</a-divider>
        <a-form-item>
          <a-space :size="24">
            <span>
              <a-switch v-model:checked="editForm.leadTrace" size="small" />
              <span class="ml-2">线索溯源</span>
            </span>
            <span>
              <a-switch v-model:checked="editForm.batchImportExport" size="small" />
              <span class="ml-2">批量导入导出</span>
            </span>
          </a-space>
        </a-form-item>

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
              <a-select v-model:value="editForm.status" :options="statusOptions" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>
