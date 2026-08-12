<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import type { FeedbackHandleStatus, FeedbackItem, FeedbackType } from '#/api';
import { getFeedbackDetailApi, getFeedbacksApi, updateFeedbackHandleApi } from '#/api';

const loading = ref(false);
const detailLoading = ref(false);
const handleSubmitting = ref(false);
const detailOpen = ref(false);
const records = ref<FeedbackItem[]>([]);
const detail = ref<FeedbackItem | null>(null);
const filters = reactive({
  handleStatus: undefined as FeedbackHandleStatus | undefined,
  keyword: '',
  type: undefined as FeedbackType | undefined,
});
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
});
const handleForm = reactive({
  handleRemark: '',
  handleStatus: 'PENDING' as FeedbackHandleStatus,
});

const handleStatusOptions = [
  { label: '待处理', value: 'PENDING' },
  { label: '处理中', value: 'PROCESSING' },
  { label: '已解决', value: 'RESOLVED' },
  { label: '已关闭', value: 'CLOSED' },
] as const;

const feedbackTypeOptions = [
  { label: '问题异常', value: 'BUG' },
  { label: '功能建议', value: 'FEATURE' },
  { label: '其他反馈', value: 'OTHER' },
] as const;

const typeLabelMap: Record<FeedbackType, string> = {
  BUG: '问题异常',
  FEATURE: '功能建议',
  OTHER: '其他反馈',
};

const handleStatusLabelMap: Record<FeedbackHandleStatus, string> = {
  CLOSED: '已关闭',
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已解决',
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

function formatFeedbackType(value: FeedbackType) {
  return typeLabelMap[value] ?? value;
}

function formatHandleStatus(value: FeedbackHandleStatus) {
  return handleStatusLabelMap[value] ?? value;
}

function normalizeImages(images?: null | string[] | unknown) {
  if (!Array.isArray(images)) {
    return [];
  }
  return images.filter((item): item is string => typeof item === 'string');
}

function resolveUserName(record: FeedbackItem['profile']) {
  return record.name || record.nickname || '-';
}

const tableData = computed(() =>
  records.value.map((item) => ({
    ...item,
    institutionName: item.profile.teacher?.institution || '-',
    imageCount: normalizeImages(item.images).length,
    userName: resolveUserName(item.profile),
  })),
);

async function fetchFeedbacks() {
  loading.value = true;
  try {
    const result = await getFeedbacksApi({
      handleStatus: filters.handleStatus,
      keyword: filters.keyword || undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: filters.type,
    });
    records.value = result.list;
    pagination.total = result.pagination.total;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  pagination.page = 1;
  void fetchFeedbacks();
}

function handleReset() {
  filters.handleStatus = undefined;
  filters.keyword = '';
  filters.type = undefined;
  pagination.page = 1;
  void fetchFeedbacks();
}

async function openDetail(record: Pick<FeedbackItem, 'id'>) {
  detailLoading.value = true;
  detailOpen.value = true;
  try {
    const result = await getFeedbackDetailApi(record.id);
    detail.value = result;
    handleForm.handleStatus = result.handleStatus;
    handleForm.handleRemark = result.handleRemark || '';
  } finally {
    detailLoading.value = false;
  }
}

async function submitHandle() {
  if (!detail.value) {
    return;
  }
  handleSubmitting.value = true;
  try {
    await updateFeedbackHandleApi(detail.value.id, {
      handleRemark: handleForm.handleRemark || undefined,
      handleStatus: handleForm.handleStatus,
    });
    message.success('反馈处理状态已更新');
    await openDetail({ id: detail.value.id });
    await fetchFeedbacks();
  } finally {
    handleSubmitting.value = false;
  }
}

onMounted(fetchFeedbacks);
</script>

<template>
  <div class="p-5">
    <a-card title="使用反馈" :bordered="false">
      <a-form layout="inline" class="mb-4">
        <a-form-item label="关键词">
          <a-input
            v-model:value="filters.keyword"
            allow-clear
            placeholder="用户名称 / 手机号 / 问题描述 / 联系方式"
            @press-enter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="反馈类型">
          <a-select
            v-model:value="filters.type"
            allow-clear
            :options="feedbackTypeOptions"
            placeholder="全部类型"
            style="width: 140px"
          />
        </a-form-item>
        <a-form-item label="处理状态">
          <a-select
            v-model:value="filters.handleStatus"
            allow-clear
            :options="handleStatusOptions"
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
        小程序端所有已登录用户均可提交反馈，后台统一查看问题描述、图片证据与处理状态
      </div>

      <a-table
        :columns="[
          { title: '用户', dataIndex: 'userName' },
          { title: '手机号', dataIndex: ['profile', 'phone'] },
          { title: '机构', dataIndex: 'institutionName' },
          { title: '反馈类型', dataIndex: 'type' },
          { title: '图片数', dataIndex: 'imageCount' },
          { title: '处理状态', dataIndex: 'handleStatus' },
          { title: '提交时间', dataIndex: 'createdAt' },
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
            fetchFeedbacks();
          }
        }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'type'">
            {{ formatFeedbackType(record.type) }}
          </template>
          <template v-else-if="column.dataIndex === 'handleStatus'">
            <a-tag
              :color="
                record.handleStatus === 'RESOLVED'
                  ? 'green'
                  : record.handleStatus === 'PROCESSING'
                    ? 'blue'
                    : record.handleStatus === 'CLOSED'
                      ? 'default'
                      : 'orange'
              "
            >
              {{ formatHandleStatus(record.handleStatus) }}
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

    <a-drawer v-model:open="detailOpen" width="760" title="反馈详情">
      <a-spin :spinning="detailLoading">
        <template v-if="detail">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="用户">
              {{ detail.profile.name || detail.profile.nickname || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="手机号">{{ detail.profile.phone || '-' }}</a-descriptions-item>
            <a-descriptions-item label="机构">{{ detail.profile.teacher?.institution || '-' }}</a-descriptions-item>
            <a-descriptions-item label="反馈类型">{{ formatFeedbackType(detail.type) }}</a-descriptions-item>
            <a-descriptions-item label="处理状态">{{ formatHandleStatus(detail.handleStatus) }}</a-descriptions-item>
            <a-descriptions-item label="提交时间">{{ formatDateTime(detail.createdAt) }}</a-descriptions-item>
            <a-descriptions-item label="联系方式" :span="2">{{ detail.contact || '-' }}</a-descriptions-item>
            <a-descriptions-item label="问题描述" :span="2">{{ detail.content }}</a-descriptions-item>
          </a-descriptions>

          <a-card class="mt-4" size="small" title="反馈图片">
            <template v-if="normalizeImages(detail.images).length > 0">
              <a-image-preview-group>
                <div class="grid grid-cols-3 gap-4">
                  <a-image
                    v-for="image in normalizeImages(detail.images)"
                    :key="image"
                    :src="image"
                    class="h-[140px] rounded-md object-cover"
                  />
                </div>
              </a-image-preview-group>
            </template>
            <a-empty v-else description="未上传图片" />
          </a-card>

          <a-card class="mt-4" size="small" title="客诉处理">
            <a-form layout="vertical">
              <a-form-item label="处理状态">
                <a-select v-model:value="handleForm.handleStatus" :options="handleStatusOptions" />
              </a-form-item>
              <a-form-item label="处理备注">
                <a-textarea
                  v-model:value="handleForm.handleRemark"
                  :maxlength="500"
                  :rows="4"
                  placeholder="记录处理动作、沟通结果或后续跟进计划"
                  show-count
                />
              </a-form-item>
              <a-form-item label="最近处理人">
                <a-input
                  :value="detail.handledByAdmin?.nickname || detail.handledByAdmin?.username || '-'"
                  disabled
                />
              </a-form-item>
              <a-form-item label="最近处理时间">
                <a-input :value="formatDateTime(detail.handledAt)" disabled />
              </a-form-item>
              <a-button type="primary" :loading="handleSubmitting" @click="submitHandle">
                保存处理结果
              </a-button>
            </a-form>
          </a-card>
        </template>
      </a-spin>
    </a-drawer>
  </div>
</template>
