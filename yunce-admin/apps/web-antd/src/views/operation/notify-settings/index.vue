<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  debugOpsNotifySimulateApi,
  getOpsNotifyConfigApi,
  testOpsNotifyWebhookApi,
  updateOpsNotifyConfigApi,
  type OpsNotifyConfig,
} from '#/api';

const loading = ref(false);
const saving = ref(false);
const testingReview = ref(false);
const testingApproved = ref(false);
const debugging = ref(false);
/** 仅开发构建展示「模拟推送」；生产由后端二次拦截 */
const showDebugSimulate = import.meta.env.DEV;
const config = ref<null | OpsNotifyConfig>(null);

const form = reactive({
  enabled: false,
  webhookUrl: '',
  webhookUrlApproved: '',
  reviewChatId: '',
  approvedChatId: '',
  defaultTrialPlanId: '',
  defaultTrialDays: 14,
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
    form.webhookUrlApproved = data.webhookUrlApproved || '';
    form.reviewChatId = data.reviewChatId || '';
    form.approvedChatId = data.approvedChatId || '';
    form.defaultTrialPlanId = data.defaultTrialPlanId || '';
    form.defaultTrialDays = data.defaultTrialDays ?? 14;
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
      webhookUrlApproved: form.webhookUrlApproved.trim() || null,
      reviewChatId: form.reviewChatId.trim() || null,
      approvedChatId: form.approvedChatId.trim() || null,
      defaultTrialPlanId: form.defaultTrialPlanId.trim() || null,
      defaultTrialDays: form.defaultTrialDays,
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
    form.webhookUrlApproved = data.webhookUrlApproved || '';
    form.reviewChatId = data.reviewChatId || '';
    form.approvedChatId = data.approvedChatId || '';
    form.defaultTrialPlanId = data.defaultTrialPlanId || '';
    form.defaultTrialDays = data.defaultTrialDays ?? 14;
    message.success('已保存');
  } finally {
    saving.value = false;
  }
}

async function testSend(target: 'approved' | 'review') {
  const testing = target === 'approved' ? testingApproved : testingReview;
  testing.value = true;
  try {
    await save();
    const result = await testOpsNotifyWebhookApi({ target });
    if (result.success) {
      message.success(result.message);
    } else {
      message.error(result.message);
    }
  } finally {
    testing.value = false;
  }
}

async function debugSimulate(
  scene:
    | 'orgVersionChanged'
    | 'storeEntryApproved'
    | 'storeEntryRejected'
    | 'storeEntrySubmitted',
) {
  debugging.value = true;
  try {
    await save();
    const result = await debugOpsNotifySimulateApi({ scene });
    if (result.success) {
      message.success(`${result.message}（模式: ${result.mode}）`);
    } else {
      message.error(result.message);
    }
  } finally {
    debugging.value = false;
  }
}

async function copyCallbackUrl() {
  if (!config.value?.callbackUrl) return;
  try {
    await navigator.clipboard.writeText(config.value.callbackUrl);
    message.success('回调地址已复制');
  } catch {
    message.warning('复制失败，请手动选中复制');
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
        :message="
          config?.feishuAppConfigured
            ? '已配置自建应用：卡片按钮走真回调（飞书内完成同意/拒绝/发试用）。'
            : '未配置 FEISHU_APP_*：将回退自定义机器人 Webhook（仅能打开链接）。'
        "
      />

      <a-form layout="vertical" class="max-w-2xl">
        <a-form-item label="启用通知">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>

        <a-divider>自建应用群聊（真回调，推荐）</a-divider>

        <a-form-item label="审核群 chat_id">
          <a-input v-model:value="form.reviewChatId" placeholder="oc_xxx" allow-clear />
        </a-form-item>
        <a-form-item label="履约群 chat_id（可空=同审核群）">
          <a-input v-model:value="form.approvedChatId" placeholder="oc_xxx" allow-clear />
        </a-form-item>
        <div v-if="config?.callbackUrl" class="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>回调地址：</span>
          <code class="break-all">{{ config.callbackUrl }}</code>
          <a-button size="small" type="link" @click="copyCallbackUrl">复制</a-button>
        </div>

        <a-divider>自定义机器人 Webhook（回退）</a-divider>

        <a-form-item label="审核群 Webhook">
          <a-input
            v-model:value="form.webhookUrl"
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
            allow-clear
          />
          <div class="mt-1 text-xs text-gray-500">
            脱敏：{{ config?.webhookMasked || '未配置' }}
          </div>
        </a-form-item>
        <a-form-item label="履约群 Webhook">
          <a-input
            v-model:value="form.webhookUrlApproved"
            placeholder="可留空 = 与审核群相同"
            allow-clear
          />
          <div class="mt-1 text-xs text-gray-500">
            脱敏：{{ config?.webhookApprovedMasked || '未配置' }}
          </div>
        </a-form-item>

        <a-divider>默认试用</a-divider>

        <a-form-item label="默认套餐 Plan ID（优先）">
          <a-input
            v-model:value="form.defaultTrialPlanId"
            placeholder="会员管理套餐 UUID，可空"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="无套餐时按天数">
          <a-input-number v-model:value="form.defaultTrialDays" :min="1" :max="3650" />
        </a-form-item>

        <a-divider>事件开关</a-divider>

        <a-form-item label="新入驻申请">
          <a-switch v-model:checked="form.storeEntrySubmitted" />
        </a-form-item>
        <a-form-item label="入驻审核通过（履约提醒）">
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

        <a-space wrap>
          <a-button type="primary" :loading="saving" @click="save">保存</a-button>
          <a-button :loading="testingReview" @click="testSend('review')">
            测试审核通道
          </a-button>
          <a-button :loading="testingApproved" @click="testSend('approved')">
            测试履约通道
          </a-button>
        </a-space>

        <template v-if="showDebugSimulate">
          <a-divider>调试</a-divider>
          <a-alert
            class="mb-3"
            type="warning"
            show-icon
            message="推送与真实业务同结构的样例卡片（假 UUID）。点「同意/发放」会因申请不存在而失败，仅用于验通道与按钮形态。"
          />
          <a-space wrap>
            <a-button
              :loading="debugging"
              @click="debugSimulate('storeEntrySubmitted')"
            >
              模拟新入驻卡片
            </a-button>
            <a-button
              :loading="debugging"
              @click="debugSimulate('storeEntryApproved')"
            >
              模拟通过+发试用卡片
            </a-button>
            <a-button
              :loading="debugging"
              @click="debugSimulate('storeEntryRejected')"
            >
              模拟拒绝卡片
            </a-button>
            <a-button
              :loading="debugging"
              @click="debugSimulate('orgVersionChanged')"
            >
              模拟版本变更卡片
            </a-button>
          </a-space>
        </template>
      </a-form>
    </a-card>
  </div>
</template>
