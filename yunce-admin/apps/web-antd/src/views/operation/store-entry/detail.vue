<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';
import { useRoute, useRouter } from 'vue-router';

import type { StoreEntryApplicationDetail, StoreEntryStatus } from '#/api';
import {
  approveStoreEntryApplicationApi,
  getStoreEntryApplicationDetailApi,
  rejectStoreEntryApplicationApi,
} from '#/api';

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const detail = ref<StoreEntryApplicationDetail | null>(null);
const approving = ref(false);
const rejecting = ref(false);
const rejectOpen = ref(false);
const rejectForm = reactive({
  reason: '',
});

const applicationId = route.query.id as string;

const statusLabelMap: Record<StoreEntryStatus, string> = {
  APPROVED: '已通过',
  PENDING: '待审核',
  REJECTED: '已拒绝',
};

const statusColorMap: Record<StoreEntryStatus, string> = {
  APPROVED: 'green',
  PENDING: 'orange',
  REJECTED: 'red',
};

const versionLabelMap: Record<string, string> = {
  FLAGSHIP: '旗舰版',
  FREE: '免费版',
  STANDARD: '标准版',
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

function regionText(region?: string[] | null) {
  return Array.isArray(region) && region.length > 0 ? region.join(' / ') : '-';
}

function statusLabel(status?: StoreEntryStatus) {
  return status ? (statusLabelMap[status] ?? status) : '-';
}

function statusColor(status?: StoreEntryStatus) {
  return status ? (statusColorMap[status] ?? 'default') : 'default';
}

function versionLabel(code?: string) {
  return code ? (versionLabelMap[code] ?? code) : '-';
}

async function fetchDetail() {
  if (!applicationId) {
    message.error('缺少申请 ID');
    return;
  }
  loading.value = true;
  try {
    detail.value = await getStoreEntryApplicationDetailApi(applicationId);
  } finally {
    loading.value = false;
  }
}

function openRejectModal() {
  rejectForm.reason = '';
  rejectOpen.value = true;
}

async function handleApprove() {
  if (!detail.value) {
    return;
  }
  approving.value = true;
  try {
    await approveStoreEntryApplicationApi(detail.value.id);
    message.success('已通过该入驻申请，机构已启用');
    await fetchDetail();
  } finally {
    approving.value = false;
  }
}

async function handleReject() {
  if (!detail.value) {
    return;
  }
  const reason = rejectForm.reason.trim();
  if (!reason) {
    message.warning('请填写拒绝原因');
    return;
  }
  rejecting.value = true;
  try {
    await rejectStoreEntryApplicationApi(detail.value.id, { reason });
    message.success('已拒绝该入驻申请');
    rejectOpen.value = false;
    await fetchDetail();
  } finally {
    rejecting.value = false;
  }
}

function goBack() {
  router.back();
}

onMounted(fetchDetail);
</script>

<template>
  <div class="p-5">
    <a-page-header title="入驻审核详情" class="mb-4 rounded-lg bg-white" @back="goBack">
      <template #extra>
        <template v-if="detail && detail.status === 'PENDING'">
          <a-popconfirm
            title="确认通过该门店入驻申请吗？通过后机构将立即启用并创建默认校区。"
            ok-text="确认通过"
            cancel-text="取消"
            @confirm="handleApprove"
          >
            <a-button type="primary" :loading="approving">通过审核</a-button>
          </a-popconfirm>
          <a-button danger :loading="rejecting" @click="openRejectModal">拒绝</a-button>
        </template>
      </template>
    </a-page-header>

    <a-spin :spinning="loading">
      <template v-if="detail">
        <a-card title="申请信息" :bordered="false" class="mb-4">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="门店名称">{{ detail.name }}</a-descriptions-item>
            <a-descriptions-item label="门店类型">{{ detail.type || '-' }}</a-descriptions-item>
            <a-descriptions-item label="所在地区">{{ regionText(detail.region) }}</a-descriptions-item>
            <a-descriptions-item label="详细地址">{{ detail.address || '-' }}</a-descriptions-item>
            <a-descriptions-item label="定位名称">{{ detail.locationName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="审核状态">
              <a-tag :color="statusColor(detail.status)">
                {{ statusLabel(detail.status) }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="申请时间">{{ formatDateTime(detail.createdAt) }}</a-descriptions-item>
            <a-descriptions-item label="最近更新时间">{{ formatDateTime(detail.updatedAt) }}</a-descriptions-item>
            <a-descriptions-item label="拒绝原因" :span="2">
              {{ detail.rejectReason || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="联系人信息" :bordered="false" class="mb-4">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="申请人">
              {{ detail.applicant?.name || detail.applicant?.nickname || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="联系电话">
              {{ detail.applicant?.phone || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="联系人">{{ detail.contactName || '-' }}</a-descriptions-item>
            <a-descriptions-item label="联系电话">{{ detail.contactPhone || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="关联机构" :bordered="false" class="mb-4">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="机构名称">
              {{ detail.organization?.name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="机构状态">
              {{ detail.organization?.status || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="版本">
              {{ versionLabel(detail.organization?.versionCode) }}
            </a-descriptions-item>
            <a-descriptions-item label="机构创建时间">
              {{ formatDateTime(detail.organization?.createdAt) }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>

        <a-card title="审核记录" :bordered="false">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="审核人">
              {{
                detail.reviewedBy?.nickname || detail.reviewedBy?.username || '-'
              }}
            </a-descriptions-item>
            <a-descriptions-item label="审核时间">
              {{ formatDateTime(detail.reviewedAt) }}
            </a-descriptions-item>
          </a-descriptions>
        </a-card>
      </template>
    </a-spin>

    <a-modal
      v-model:open="rejectOpen"
      title="拒绝入驻申请"
      ok-text="确认拒绝"
      cancel-text="取消"
      :confirm-loading="rejecting"
      @ok="handleReject"
    >
      <a-form layout="vertical">
        <a-form-item label="拒绝原因" required>
          <a-textarea
            v-model:value="rejectForm.reason"
            :maxlength="500"
            :rows="4"
            placeholder="请填写拒绝原因，将展示给申请人并支持其修改后重新提交"
            show-count
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>
