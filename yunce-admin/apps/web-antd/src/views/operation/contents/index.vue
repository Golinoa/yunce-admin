<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  createActivityApi,
  createBannerApi,
  getActivitiesApi,
  getBannersApi,
  updateActivityApi,
  updateBannerApi,
} from '#/api';

type BannerStatus = 'ACTIVE' | 'INACTIVE';
type ActivityStatus = 'ACTIVE' | 'DRAFT' | 'ENDED' | 'INACTIVE';

interface BannerItem {
  id: string;
  imageUrl: string;
  jumpType: string;
  jumpValue?: null | string;
  sortOrder: number;
  status: BannerStatus;
  title: string;
}

interface ActivityItem {
  content?: null | string;
  coverImageUrl?: null | string;
  id: string;
  jumpType: string;
  jumpValue?: null | string;
  sortOrder: number;
  status: ActivityStatus;
  summary?: null | string;
  title: string;
}

interface BannerFormState {
  imageUrl: string;
  jumpType: string;
  jumpValue: string;
  sortOrder: number;
  status: BannerStatus;
  title: string;
}

interface ActivityFormState {
  content: string;
  coverImageUrl: string;
  jumpType: string;
  jumpValue: string;
  sortOrder: number;
  status: ActivityStatus;
  summary: string;
  title: string;
}

const loading = ref(false);
const banners = ref<BannerItem[]>([]);
const activities = ref<ActivityItem[]>([]);
const bannerOpen = ref(false);
const activityOpen = ref(false);
const editingBannerId = ref('');
const editingActivityId = ref('');

const bannerStatusOptions = [
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
] as const;

const activityStatusOptions = [
  { label: '草稿', value: 'DRAFT' },
  { label: '启用', value: 'ACTIVE' },
  { label: '停用', value: 'INACTIVE' },
  { label: '已结束', value: 'ENDED' },
] as const;

const createDefaultBannerForm = (): BannerFormState => ({
  imageUrl: '',
  jumpType: 'none',
  jumpValue: '',
  sortOrder: 0,
  status: 'ACTIVE',
  title: '',
});

const createDefaultActivityForm = (): ActivityFormState => ({
  content: '',
  coverImageUrl: '',
  jumpType: 'none',
  jumpValue: '',
  sortOrder: 0,
  status: 'DRAFT',
  summary: '',
  title: '',
});

const bannerForm = reactive<BannerFormState>(createDefaultBannerForm());
const activityForm = reactive<ActivityFormState>(createDefaultActivityForm());

function resetBannerForm() {
  Object.assign(bannerForm, createDefaultBannerForm());
}

function resetActivityForm() {
  Object.assign(activityForm, createDefaultActivityForm());
}

async function fetchData() {
  loading.value = true;
  try {
    const [bannerResult, activityResult] = await Promise.all([
      getBannersApi(),
      getActivitiesApi(),
    ]);
    banners.value = bannerResult as BannerItem[];
    activities.value = activityResult as ActivityItem[];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchData);

function openCreateBannerModal() {
  editingBannerId.value = '';
  resetBannerForm();
  bannerOpen.value = true;
}

function openCreateActivityModal() {
  editingActivityId.value = '';
  resetActivityForm();
  activityOpen.value = true;
}

async function handleCreateBanner() {
  if (!bannerForm.title.trim() || !bannerForm.imageUrl.trim()) {
    message.error('请填写轮播图标题和图片地址');
    return;
  }

  const payload = {
    ...bannerForm,
    jumpValue: bannerForm.jumpValue || undefined,
  };

  if (editingBannerId.value) {
    await updateBannerApi(editingBannerId.value, payload);
    message.success('轮播图更新成功');
  } else {
    await createBannerApi(payload);
    message.success('轮播图创建成功');
  }

  bannerOpen.value = false;
  editingBannerId.value = '';
  resetBannerForm();
  await fetchData();
}

async function handleCreateActivity() {
  if (!activityForm.title.trim()) {
    message.error('请填写活动标题');
    return;
  }

  const payload = {
    ...activityForm,
    content: activityForm.content || undefined,
    coverImageUrl: activityForm.coverImageUrl || undefined,
    jumpValue: activityForm.jumpValue || undefined,
    summary: activityForm.summary || undefined,
  };

  if (editingActivityId.value) {
    await updateActivityApi(editingActivityId.value, payload);
    message.success('活动更新成功');
  } else {
    await createActivityApi(payload);
    message.success('活动创建成功');
  }

  activityOpen.value = false;
  editingActivityId.value = '';
  resetActivityForm();
  await fetchData();
}

async function handleToggleBannerStatus(record: BannerItem, checked: boolean) {
  await updateBannerApi(record.id, {
    imageUrl: record.imageUrl,
    jumpType: record.jumpType,
    jumpValue: record.jumpValue || undefined,
    sortOrder: record.sortOrder,
    status: checked ? 'ACTIVE' : 'INACTIVE',
    title: record.title,
  });
  message.success(`轮播图已${checked ? '启用' : '停用'}`);
  await fetchData();
}

function handleEditBanner(record: BannerItem) {
  editingBannerId.value = record.id;
  bannerForm.title = record.title ?? '';
  bannerForm.imageUrl = record.imageUrl ?? '';
  bannerForm.jumpType = record.jumpType ?? 'none';
  bannerForm.jumpValue = record.jumpValue ?? '';
  bannerForm.sortOrder = record.sortOrder ?? 0;
  bannerForm.status = record.status ?? 'ACTIVE';
  bannerOpen.value = true;
}

function handleEditActivity(record: ActivityItem) {
  editingActivityId.value = record.id;
  activityForm.title = record.title ?? '';
  activityForm.summary = record.summary ?? '';
  activityForm.content = record.content ?? '';
  activityForm.coverImageUrl = record.coverImageUrl ?? '';
  activityForm.jumpType = record.jumpType ?? 'none';
  activityForm.jumpValue = record.jumpValue ?? '';
  activityForm.sortOrder = record.sortOrder ?? 0;
  activityForm.status = record.status ?? 'DRAFT';
  activityOpen.value = true;
}
</script>

<template>
  <div class="p-5">
    <a-space direction="vertical" size="middle" class="w-full">
      <a-card title="轮播图管理" :bordered="false">
        <template #extra>
          <a-button type="primary" @click="openCreateBannerModal">
            新增轮播图
          </a-button>
        </template>
        <a-table
          :columns="[
            { title: '标题', dataIndex: 'title' },
            { title: '跳转类型', dataIndex: 'jumpType' },
            { title: '跳转值', dataIndex: 'jumpValue' },
            { title: '状态', dataIndex: 'status' },
            { title: '排序', dataIndex: 'sortOrder' },
            { title: '操作', key: 'action' },
          ]"
          :data-source="banners"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              <a-switch
                :checked="record.status === 'ACTIVE'"
                checked-children="启用"
                un-checked-children="停用"
                @change="
                  (checked: boolean) =>
                    handleToggleBannerStatus(record, checked)
                "
              />
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="handleEditBanner(record)">
                编辑
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>
      <a-card title="活动管理" :bordered="false">
        <template #extra>
          <a-button type="primary" @click="openCreateActivityModal">
            新增活动
          </a-button>
        </template>
        <a-table
          :columns="[
            { title: '活动标题', dataIndex: 'title' },
            { title: '摘要', dataIndex: 'summary' },
            { title: '状态', dataIndex: 'status' },
            { title: '跳转值', dataIndex: 'jumpValue' },
            { title: '排序', dataIndex: 'sortOrder' },
            { title: '操作', key: 'action' },
          ]"
          :data-source="activities"
          :loading="loading"
          :pagination="false"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'status'">
              {{
                record.status === 'ACTIVE'
                  ? '启用'
                  : record.status === 'DRAFT'
                    ? '草稿'
                    : record.status === 'INACTIVE'
                      ? '停用'
                      : '已结束'
              }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="link" @click="handleEditActivity(record)">
                编辑
              </a-button>
            </template>
          </template>
        </a-table>
      </a-card>
    </a-space>
    <a-modal
      v-model:open="bannerOpen"
      :title="editingBannerId ? '编辑轮播图' : '新增轮播图'"
      @ok="handleCreateBanner"
    >
      <a-form layout="vertical">
        <a-form-item label="标题">
          <a-input v-model:value="bannerForm.title" />
        </a-form-item>
        <a-form-item label="图片地址">
          <a-input v-model:value="bannerForm.imageUrl" />
        </a-form-item>
        <a-form-item label="跳转类型">
          <a-input v-model:value="bannerForm.jumpType" />
        </a-form-item>
        <a-form-item label="跳转值">
          <a-input v-model:value="bannerForm.jumpValue" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="bannerForm.status"
            :options="bannerStatusOptions"
          />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number v-model:value="bannerForm.sortOrder" class="w-full" />
        </a-form-item>
      </a-form>
    </a-modal>
    <a-modal
      v-model:open="activityOpen"
      :title="editingActivityId ? '编辑活动' : '新增活动'"
      @ok="handleCreateActivity"
    >
      <a-form layout="vertical">
        <a-form-item label="活动标题">
          <a-input v-model:value="activityForm.title" />
        </a-form-item>
        <a-form-item label="封面地址">
          <a-input v-model:value="activityForm.coverImageUrl" />
        </a-form-item>
        <a-form-item label="活动摘要">
          <a-input v-model:value="activityForm.summary" />
        </a-form-item>
        <a-form-item label="活动内容">
          <a-textarea v-model:value="activityForm.content" :rows="4" />
        </a-form-item>
        <a-form-item label="跳转类型">
          <a-input v-model:value="activityForm.jumpType" />
        </a-form-item>
        <a-form-item label="跳转值">
          <a-input v-model:value="activityForm.jumpValue" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="activityForm.status"
            :options="activityStatusOptions"
          />
        </a-form-item>
        <a-form-item label="排序">
          <a-input-number
            v-model:value="activityForm.sortOrder"
            class="w-full"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
