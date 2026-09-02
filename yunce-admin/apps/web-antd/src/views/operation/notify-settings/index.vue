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
  getMembershipPlansApi,
  getOpsNotifyConfigApi,
  testOpsNotifyWebhookApi,
  updateOpsNotifyConfigApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';
import { toTrialPlanSelectOptions } from '#/utils/growth-summary';

const loading = ref(false);
const saving = ref(false);
const testingReview = ref(false);
const testingApproved = ref(false);
const debugging = ref(false);
const activeTab = ref('channel');
/** 仅开发构建展示「模拟推送」；生产由后端二次拦截 */
const showDebugSimulate = import.meta.env.DEV;
const config = ref<null | OpsNotifyConfig>(null);
const trialPlanOptions = ref<Array<{ label: string; value: string }>>([]);

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
    const [notifyConfig, plans] = await Promise.all([
      getOpsNotifyConfigApi(),
      getMembershipPlansApi().catch(() => []),
    ]);
    applyConfig(notifyConfig);
    trialPlanOptions.value = toTrialPlanSelectOptions(
      Array.isArray(plans) ? plans : [],
    );
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

async function save(options?: { skipConfirm?: boolean }) {
  if (!options?.skipConfirm) {
    const ok = await confirmAction({
      content: '将写入飞书应用密钥、Webhook 与通知开关，确认保存？',
      okType: 'danger',
      title: '确认保存飞书通知配置',
    });
    if (!ok) return false;
  }
  saving.value = true;
  try {
    const data = await updateOpsNotifyConfigApi({
      enabled: form.enabled,
      webhookUrl: form.webhookUrl.trim() || null,
      webhookUrlApproved: form.webhookUrlApproved.trim() || null,
      reviewChatId: form.reviewChatId.trim() || null,
      approvedChatId: form.approvedChatId.trim() || null,
      defaultTrialPlanId: (form.defaultTrialPlanId || '').trim() || null,
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
    return true;
  } finally {
    saving.value = false;
  }
}

async function testSend(target: 'approved' | 'review') {
  const ok = await confirmAction({
    content: '将先保存当前配置再发送测试消息，确认继续？',
    title: '确认试发飞书通知',
  });
  if (!ok) return;

  const testing = target === 'approved' ? testingApproved : testingReview;
  testing.value = true;
  try {
    const saved = await save({ skipConfirm: true });
    if (!saved) return;
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
  const ok = await confirmAction({
    content: '开发环境模拟推送将先保存配置，确认继续？',
    title: '确认模拟推送',
  });
  if (!ok) return;

  debugging.value = true;
  try {
    const saved = await save({ skipConfirm: true });
    if (!saved) return;
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
    <a-card :bordered="false" :loading="loading">
      <template #title>
        <div class="flex flex-wrap items-center gap-3">
          <span>飞书运营通知</span>
          <a-switch
            v-model:checked="form.enabled"
            checked-children="已启用"
            un-checked-children="已关闭"
          />
        </div>
      </template>
      <template #extra>
        <a-space wrap>
          <a-button type="primary" :loading="saving" @click="save()">
            保存全部
          </a-button>
          <a-button :loading="testingReview" @click="testSend('review')">
            测审核通道
          </a-button>
          <a-button :loading="testingApproved" @click="testSend('approved')">
            测履约通道
          </a-button>
        </a-space>
      </template>

      <a-alert
        class="mb-4"
        type="info"
        show-icon
        :message="
          config?.feishuAppConfigured
            ? '已配置自建应用：卡片按钮走真回调。按左侧分类维护，不必在一页里滚到底。'
            : '未配置自建应用凭证时回退 Webhook。先配「推送通道」，密钥放在「应用凭证」。'
        "
      />

      <a-tabs v-model:active-key="activeTab" tab-position="left">
        <a-tab-pane key="channel" tab="推送通道">
          <a-form layout="vertical" class="max-w-3xl">
            <div
              class="mb-4 text-[13px] text-[var(--ant-color-text-secondary)]"
            >
              优先填自建应用群聊 ID；Webhook 仅作回退。
            </div>
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
                <a-form-item label="审核群 chat_id">
                  <a-input
                    v-model:value="form.reviewChatId"
                    placeholder="oc_xxx"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
              <a-col :xs="24" :md="12">
                <a-form-item label="履约群 chat_id（空=同审核群）">
                  <a-input
                    v-model:value="form.approvedChatId"
                    placeholder="oc_xxx"
                    allow-clear
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <div
              v-if="config?.callbackUrl"
              class="mb-4 flex flex-wrap items-center gap-2 text-xs text-[var(--ant-color-text-secondary)]"
            >
              <span>回调地址：</span>
              <code class="break-all">{{ config.callbackUrl }}</code>
              <a-button size="small" type="link" @click="copyCallbackUrl">
                复制
              </a-button>
            </div>

            <a-divider orientation="left" plain>Webhook 回退</a-divider>
            <a-form-item label="审核群 Webhook">
              <a-input
                v-model:value="form.webhookUrl"
                placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxxx"
                allow-clear
              />
              <div class="mt-1 text-xs text-[var(--ant-color-text-secondary)]">
                脱敏：{{ config?.webhookMasked || '未配置' }}
              </div>
            </a-form-item>
            <a-form-item label="履约群 Webhook">
              <a-input
                v-model:value="form.webhookUrlApproved"
                placeholder="可留空 = 与审核群相同"
                allow-clear
              />
              <div class="mt-1 text-xs text-[var(--ant-color-text-secondary)]">
                脱敏：{{ config?.webhookApprovedMasked || '未配置' }}
              </div>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="credentials" tab="应用凭证">
          <a-form layout="vertical" class="max-w-3xl">
            <div
              class="mb-4 text-[13px] text-[var(--ant-color-text-secondary)]"
            >
              后台配置优先于环境变量；密码类留空表示不修改。
            </div>
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
              <a-checkbox
                v-model:checked="form.clearFeishuAppSecret"
                class="mt-1"
              >
                清除已保存的 Secret
              </a-checkbox>
            </a-form-item>
            <a-row :gutter="16">
              <a-col :xs="24" :md="12">
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
              </a-col>
              <a-col :xs="24" :md="12">
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
                  <a-checkbox
                    v-model:checked="form.clearFeishuEncryptKey"
                    class="mt-1"
                  >
                    清除
                  </a-checkbox>
                </a-form-item>
              </a-col>
            </a-row>
            <a-form-item label="Webhook 签名密钥（Action HMAC）">
              <a-input-password
                v-model:value="form.actionHmacSecret"
                :placeholder="
                  config?.hasActionHmacSecret
                    ? '已配置（留空不改）'
                    : 'Webhook 模式一键链接签名用'
                "
                allow-clear
              />
              <div class="mt-1 text-xs text-[var(--ant-color-text-secondary)]">
                仅 Webhook 回退需要；自建应用真回调可不填。
              </div>
              <a-checkbox
                v-model:checked="form.clearActionHmacSecret"
                class="mt-1"
              >
                清除
              </a-checkbox>
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="switches" tab="事件开关">
          <a-form layout="vertical" class="max-w-xl">
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
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="templates" tab="消息文案">
          <a-form layout="vertical" class="max-w-3xl">
            <a-alert
              class="mb-4"
              type="info"
              show-icon
              message="留空用系统默认。字段标签与按钮逻辑仍由系统生成。"
            />
            <a-collapse accordion>
              <a-collapse-panel
                v-for="meta in TEMPLATE_META"
                :key="meta.key"
                :header="meta.label"
              >
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
              </a-collapse-panel>
            </a-collapse>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="trial" tab="默认试用">
          <a-form layout="vertical" class="max-w-xl">
            <a-form-item label="默认试用套餐">
              <a-select
                v-model:value="form.defaultTrialPlanId"
                allow-clear
                show-search
                option-filter-prop="label"
                :options="trialPlanOptions"
                placeholder="从会员套餐中选择，可空"
              />
            </a-form-item>
            <a-form-item label="无套餐时按天数">
              <a-input-number
                v-model:value="form.defaultTrialDays"
                :min="1"
                :max="3650"
              />
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane v-if="showDebugSimulate" key="debug" tab="调试">
          <a-alert
            class="mb-3"
            type="warning"
            show-icon
            message="样例卡片假 UUID；点同意/发放会因申请不存在失败，仅验通道。"
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
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>
