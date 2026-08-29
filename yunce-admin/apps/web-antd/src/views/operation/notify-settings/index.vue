<script lang="ts" setup>
import type {
  OpsNotifyConfig,
  OpsNotifyTemplateFields,
  OpsNotifyTemplateKey,
} from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  debugOpsNotifySimulateApi,
  getOpsNotifyConfigApi,
  testOpsNotifyWebhookApi,
  updateOpsNotifyConfigApi,
} from '#/api';

const loading = ref(false);
const saving = ref(false);
const testingReview = ref(false);
const testingApproved = ref(false);
const debugging = ref(false);
/** 仅开发构建展示「模拟推送」；生产由后端二次拦截 */
const showDebugSimulate = import.meta.env.DEV;
const config = ref<null | OpsNotifyConfig>(null);

const TEMPLATE_META: Array<{
  key: OpsNotifyTemplateKey;
  label: string;
  showDetailWebhook?: boolean;
  showTitleTest?: boolean;
}> = [
  {
    key: 'storeEntrySubmitted',
    label: '新入驻申请',
    showDetailWebhook: true,
  },
  {
    key: 'storeEntryApproved',
    label: '入驻通过 / 发试用',
    showTitleTest: true,
    showDetailWebhook: true,
  },
  { key: 'storeEntryRejected', label: '入驻拒绝' },
  { key: 'orgVersionChanged', label: '机构版本变更' },
  { key: 'feedbackNew', label: '新反馈（预留）' },
];

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
  feishuAppId: '',
  feishuAppSecret: '',
  feishuVerificationToken: '',
  feishuEncryptKey: '',
  actionHmacSecret: '',
  clearFeishuAppSecret: false,
  clearFeishuVerificationToken: false,
  clearFeishuEncryptKey: false,
  clearActionHmacSecret: false,
  templates: {
    storeEntrySubmitted: { title: '', detail: '', detailWebhook: '' },
    storeEntryApproved: {
      title: '',
      titleTest: '',
      detail: '',
      detailWebhook: '',
    },
    storeEntryRejected: { title: '', detail: '' },
    orgVersionChanged: { title: '', detail: '' },
    feedbackNew: { title: '', detail: '' },
  } as Record<OpsNotifyTemplateKey, OpsNotifyTemplateFields>,
});

function applyConfig(data: OpsNotifyConfig) {
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
  form.feishuAppId = data.feishuAppId || '';
  form.feishuAppSecret = '';
  form.feishuVerificationToken = '';
  form.feishuEncryptKey = '';
  form.actionHmacSecret = '';
  form.clearFeishuAppSecret = false;
  form.clearFeishuVerificationToken = false;
  form.clearFeishuEncryptKey = false;
  form.clearActionHmacSecret = false;
  for (const meta of TEMPLATE_META) {
    const t = data.templates?.[meta.key] ?? {};
    form.templates[meta.key] = {
      title: t.title || '',
      titleTest: t.titleTest || '',
      detail: t.detail || '',
      detailWebhook: t.detailWebhook || '',
    };
  }
}

async function load() {
  loading.value = true;
  try {
    applyConfig(await getOpsNotifyConfigApi());
  } finally {
    loading.value = false;
  }
}

function secretPayload(
  value: string,
  clear: boolean,
): null | string | undefined {
  if (clear) return null;
  const t = value.trim();
  return t || undefined;
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
      feishuAppId: form.feishuAppId.trim() || null,
      feishuAppSecret: secretPayload(
        form.feishuAppSecret,
        form.clearFeishuAppSecret,
      ),
      feishuVerificationToken: secretPayload(
        form.feishuVerificationToken,
        form.clearFeishuVerificationToken,
      ),
      feishuEncryptKey: secretPayload(
        form.feishuEncryptKey,
        form.clearFeishuEncryptKey,
      ),
      actionHmacSecret: secretPayload(
        form.actionHmacSecret,
        form.clearActionHmacSecret,
      ),
      templates: form.templates,
    });
    applyConfig(data);
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
      message.success(
        result.mode
          ? `${result.message}（模式: ${result.mode}）`
          : result.message,
      );
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
            ? '已配置自建应用：卡片按钮走真回调（飞书内完成同意/拒绝/发试用）。凭证可在本页维护，环境变量仅作回退。'
            : '未配置自建应用凭证：将回退自定义机器人 Webhook。请在下方填写 App ID/Secret，或继续只用 Webhook。'
        "
      />

      <a-form layout="vertical" class="max-w-3xl">
        <a-form-item label="启用通知">
          <a-switch v-model:checked="form.enabled" />
        </a-form-item>

        <a-divider>自建应用凭证（后台配置，优先于环境变量）</a-divider>

        <a-form-item label="App ID">
          <a-input
            v-model:value="form.feishuAppId"
            placeholder="cli_xxx"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="App Secret">
          <a-input-password
            v-model:value="form.feishuAppSecret"
            :placeholder="
              config?.hasFeishuAppSecret
                ? '已配置（留空不改）'
                : '未配置，粘贴后保存'
            "
            allow-clear
          />
          <a-checkbox v-model:checked="form.clearFeishuAppSecret" class="mt-1">
            清除已保存的 Secret
          </a-checkbox>
        </a-form-item>
        <a-form-item label="Verification Token">
          <a-input-password
            v-model:value="form.feishuVerificationToken"
            :placeholder="
              config?.hasFeishuVerificationToken
                ? '已配置（留空不改）'
                : '事件订阅校验 Token'
            "
            allow-clear
          />
          <a-checkbox
            v-model:checked="form.clearFeishuVerificationToken"
            class="mt-1"
          >
            清除
          </a-checkbox>
        </a-form-item>
        <a-form-item label="Encrypt Key">
          <a-input-password
            v-model:value="form.feishuEncryptKey"
            :placeholder="
              config?.hasFeishuEncryptKey
                ? '已配置（留空不改）'
                : '事件加密密钥（可选）'
            "
            allow-clear
          />
          <a-checkbox v-model:checked="form.clearFeishuEncryptKey" class="mt-1">
            清除
          </a-checkbox>
        </a-form-item>
        <a-form-item label="Webhook 签名密钥（Action HMAC）">
          <a-input-password
            v-model:value="form.actionHmacSecret"
            :placeholder="
              config?.hasActionHmacSecret
                ? '已配置（留空不改）'
                : 'Webhook 模式一键链接签名用，建议随机长串'
            "
            allow-clear
          />
          <div class="mt-1 text-xs text-gray-500">
            仅 Webhook 回退需要；自建应用真回调可不填。也可继续用环境变量
            FEISHU_ACTION_HMAC_SECRET。
          </div>
          <a-checkbox v-model:checked="form.clearActionHmacSecret" class="mt-1">
            清除
          </a-checkbox>
        </a-form-item>

        <a-divider>自建应用群聊（真回调，推荐）</a-divider>

        <a-form-item label="审核群 chat_id">
          <a-input
            v-model:value="form.reviewChatId"
            placeholder="oc_xxx"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="履约群 chat_id（可空=同审核群）">
          <a-input
            v-model:value="form.approvedChatId"
            placeholder="oc_xxx"
            allow-clear
          />
        </a-form-item>
        <div
          v-if="config?.callbackUrl"
          class="mb-4 flex flex-wrap items-center gap-2 text-xs text-gray-500"
        >
          <span>回调地址：</span>
          <code class="break-all">{{ config.callbackUrl }}</code>
          <a-button size="small" type="link" @click="copyCallbackUrl">
            复制
          </a-button>
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
          <a-input-number
            v-model:value="form.defaultTrialDays"
            :min="1"
            :max="3650"
          />
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

        <a-divider>发信文案（可按类型改标题与说明）</a-divider>
        <a-alert
          class="mb-4"
          type="info"
          show-icon
          message="留空字段会使用系统默认文案。字段标签（门店/联系人等）与按钮逻辑仍由系统生成，不可在此改。"
        />

        <div
          v-for="meta in TEMPLATE_META"
          :key="meta.key"
          class="mb-6 rounded border border-gray-100 p-4"
        >
          <div class="mb-3 font-medium">{{ meta.label }}</div>
          <a-form-item label="标题">
            <a-input
              v-model:value="form.templates[meta.key].title"
              :maxlength="80"
              allow-clear
              show-count
            />
          </a-form-item>
          <a-form-item v-if="meta.showTitleTest" label="测试机构标题">
            <a-input
              v-model:value="form.templates[meta.key].titleTest"
              :maxlength="80"
              allow-clear
              show-count
            />
          </a-form-item>
          <a-form-item label="说明（自建应用）">
            <a-textarea
              v-model:value="form.templates[meta.key].detail"
              :maxlength="500"
              :rows="2"
              allow-clear
              show-count
            />
          </a-form-item>
          <a-form-item
            v-if="meta.showDetailWebhook"
            label="说明（Webhook 回退）"
          >
            <a-textarea
              v-model:value="form.templates[meta.key].detailWebhook"
              :maxlength="500"
              :rows="2"
              allow-clear
              show-count
            />
          </a-form-item>
        </div>

        <a-space wrap>
          <a-button type="primary" :loading="saving" @click="save">
            保存
          </a-button>
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
