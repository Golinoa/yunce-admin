<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getOpsNotifyConfigApi,
  testOpsNotifyWebhookApi,
  updateOpsNotifyConfigApi,
  type OpsNotifyConfig,
} from '#/api';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const config = ref<null | OpsNotifyConfig>(null);

const form = reactive({
  enabled: false,
  webhookUrl: '',
  storeEntrySubmitted: true,
  storeEntryApproved: true,
  storeEntryRejected: true,
  orgVersionChanged: true,
  feedbackNew: false,
});

async function load() {
  loading.value = true;
  try {
    const data = await getOpsNotifyConfigApi();
    config.value = data;
    form.enabled = data.enabled;
    form.webhookUrl = data.webhookUrl || '';
    form.storeEntrySubmitted = data.switches.storeEntrySubmitted;
    form.storeEntryApproved = data.switches.storeEntryApproved;
    form.storeEntryRejected = data.switches.storeEntryRejected;
    form.orgVersionChanged = data.switches.orgVersionChanged;
    form.feedbackNew = data.switches.feedbackNew;
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  try {
    const data = await updateOpsNotifyConfigApi({
      enabled: form.enabled,
      webhookUrl: form.webhookUrl.trim() || null,
      switches: {
        storeEntrySubmitted: form.storeEntrySubmitted,
        storeEntryApproved: form.storeEntryApproved,
        storeEntryRejected: form.storeEntryRejected,
        orgVersionChanged: form.orgVersionChanged,
        feedbackNew: form.feedbackNew,
      },
    });
    config.value = data;
    form.webhookUrl = data.webhookUrl || '';
    message.success('已保存');
  } finally {
    saving.value = false;
  }
}

async function testSend() {
  if (!form.webhookUrl.trim() && !config.value?.hasWebhook) {
    message.warning('请先填写并保存 Webhook');
    return;
  }
  testing.value = true;
  try {
    if (form.webhookUrl.trim() !== (config.value?.webhookUrl || '')) {
      await save();
    }
    const result = await testOpsNotifyWebhookApi();
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  } finally {
    testing.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div class="p-5">
    <a-card title="飞书运营通知" :loading="loading">
      <a-alert
        class="mb-4"
        type="info"
        show-icon
        message="Phase 1：自定义机器人 Webhook 推送卡片，按钮跳转运营后台处理。卡片内一键开通版本需后续接入飞书应用回调。"
      />

      <a-form layout="vertical" class="max-w-2xl">
        <a-form-item label="启用通知">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>

        <a-form-item label="飞书机器人 Webhook">
          <a-input
            v-model:value="form.webhookUrl"
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
            allow-clear
          />
          <div class="mt-1 text-xs text-gray-500">
            在飞书群 → 设置 → 群机器人 → 自定义机器人中获取。当前脱敏：
            {{ config?.webhookMasked || '未配置' }}
          </div>
        </a-form-item>

        <a-divider>事件开关</a-divider>

        <a-form-item label="新入驻申请">
          <a-switch v-model:checked="form.storeEntrySubmitted" />
        </a-form-item>
        <a-form-item label="入驻审核通过">
          <a-switch v-model:checked="form.storeEntryApproved" />
        </a-form-item>
        <a-form-item label="入驻审核拒绝">
          <a-switch v-model:checked="form.storeEntryRejected" />
        </a-form-item>
        <a-form-item label="机构版本变更">
          <a-switch v-model:checked="form.orgVersionChanged" />
        </a-form-item>
        <a-form-item label="新反馈（预留）">
          <a-switch v-model:checked="form.feedbackNew" />
        </a-form-item>

        <a-space>
          <a-button type="primary" :loading="saving" @click="save">保存</a-button>
          <a-button :loading="testing" @click="testSend">发送测试卡片</a-button>
        </a-space>

        <div v-if="config?.dashboardOrigin" class="mt-4 text-xs text-gray-500">
          卡片跳转域名：{{ config.dashboardOrigin }}
        </div>
      </a-form>
    </a-card>
  </div>
</template>
