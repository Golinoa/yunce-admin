<script lang="ts" setup>
import type { SesEmailConfig, SesEmailPurpose } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getSesEmailConfigApi,
  testSesEmailApi,
  updateSesEmailConfigApi,
} from '#/api';
import { confirmAction } from '#/utils/confirm-action';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const activeTab = ref('templates');
const config = ref<null | SesEmailConfig>(null);

const PURPOSE_META: Array<{
  hint: string;
  key: SesEmailPurpose;
  label: string;
}> = [
  {
    key: 'register',
    label: '注册验证码',
    hint: '对应小程序注册发码（purpose=REGISTER）',
  },
  {
    key: 'login',
    label: '登录验证码',
    hint: '对应邮箱验证码登录发码（purpose=LOGIN；常规密码登录不发此信）',
  },
  {
    key: 'reset',
    label: '找回密码验证码',
    hint: '对应找回密码发码（purpose=RESET）',
  },
  {
    key: 'bind',
    label: '绑定邮箱验证码',
    hint: '对应资料页/教师资料绑定邮箱（purpose=BIND）',
  },
  {
    key: 'openReminder',
    label: '开通提醒',
    hint: '开通/续费：优先微信订阅；订阅失败才 SES 兜底',
  },
  {
    key: 'expiryReminder',
    label: '到期提醒',
    hint: '到期前 7/3/1 天：优先微信订阅；失败才 SES 兜底',
  },
];

const form = reactive({
  secretId: '',
  secretKey: '',
  clearSecretKey: false,
  region: '',
  fromAddress: '',
  replyTo: '',
  codeKey: '',
  testEmail: '',
  testPurpose: 'register' as SesEmailPurpose,
  templates: {
    register: { templateId: '', subject: '', codeKey: '' },
    login: { templateId: '', subject: '', codeKey: '' },
    reset: { templateId: '', subject: '', codeKey: '' },
    bind: { templateId: '', subject: '', codeKey: '' },
    openReminder: { templateId: '', subject: '', codeKey: '' },
    expiryReminder: { templateId: '', subject: '', codeKey: '' },
  } as Record<
    SesEmailPurpose,
    { codeKey: string; subject: string; templateId: string }
  >,
});

function applyConfig(data: SesEmailConfig) {
  config.value = data;
  form.secretId = data.secretId || '';
  form.secretKey = '';
  form.clearSecretKey = false;
  form.region = data.region || '';
  form.fromAddress = data.fromAddress || '';
  form.replyTo = data.replyTo || '';
  form.codeKey = data.codeKey || '';
  for (const meta of PURPOSE_META) {
    const t = data.templates?.[meta.key] ?? {};
    form.templates[meta.key] = {
      templateId: t.templateId || '',
      subject: t.subject || '',
      codeKey: t.codeKey || '',
    };
  }
}

async function load() {
  loading.value = true;
  try {
    applyConfig(await getSesEmailConfigApi());
  } finally {
    loading.value = false;
  }
}

function templateFields(key: SesEmailPurpose) {
  return form.templates[key];
}

function effectiveTemplateId(key: SesEmailPurpose) {
  return config.value?.templates?.[key]?.effectiveTemplateId;
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
      content: '将写入腾讯云 SES 凭证与邮件模板配置，确认保存？',
      okType: 'danger',
      title: '确认保存 SES 配置',
    });
    if (!ok) return false;
  }
  saving.value = true;
  try {
    const templates: Record<
      string,
      { codeKey?: string; subject?: string; templateId?: string }
    > = {};
    for (const meta of PURPOSE_META) {
      const t = form.templates[meta.key];
      templates[meta.key] = {
        templateId: t.templateId.trim() || undefined,
        subject: t.subject.trim() || undefined,
        codeKey: t.codeKey.trim() || undefined,
      };
    }
    const data = await updateSesEmailConfigApi({
      secretId: form.secretId.trim() || null,
      secretKey: secretPayload(form.secretKey, form.clearSecretKey),
      region: form.region.trim() || null,
      fromAddress: form.fromAddress.trim() || null,
      replyTo: form.replyTo.trim() || null,
      codeKey: form.codeKey.trim() || null,
      templates,
    });
    applyConfig(data);
    message.success('已保存');
    return true;
  } finally {
    saving.value = false;
  }
}

async function testSend() {
  const ok = await confirmAction({
    content: '将先保存当前配置再向目标邮箱试发，确认继续？',
    title: '确认试发邮件',
  });
  if (!ok) return;

  testing.value = true;
  try {
    const saved = await save({ skipConfirm: true });
    if (!saved) return;
    const result = await testSesEmailApi({
      purpose: form.testPurpose,
      toEmail: form.testEmail.trim(),
    });
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
    <a-card :bordered="false" :loading="loading" title="腾讯云 SES 邮件模板">
      <template #extra>
        <a-button type="primary" :loading="saving" @click="save()">
          保存全部
        </a-button>
      </template>

      <a-alert
        class="mb-4"
        type="info"
        show-icon
        :message="
          config?.configured
            ? `发信已就绪（凭证来源：${config.credentialSource}）。模板 ID 改完立即生效。`
            : '尚未配齐：请在「发信凭证」填 Secret，在「模板 ID」填注册模板，或依赖 TENCENT_SES_* 回退。'
        "
        :description="config?.envFallbackNote"
      />

      <a-tabs v-model:active-key="activeTab" tab-position="left">
        <a-tab-pane key="templates" tab="模板 ID">
          <a-form layout="vertical" class="max-w-3xl">
            <a-form-item label="默认模板变量名" class="max-w-sm">
              <a-input
                v-model:value="form.codeKey"
                placeholder="默认 code（模板写 {{code}}）"
                allow-clear
              />
            </a-form-item>
            <a-table
              :columns="[
                { title: '用途', dataIndex: 'label', width: 160 },
                { title: '模板 ID', key: 'templateId' },
                { title: '邮件标题', key: 'subject' },
                { title: '变量名', key: 'codeKey', width: 140 },
              ]"
              :data-source="PURPOSE_META"
              :pagination="false"
              row-key="key"
              size="middle"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'label'">
                  <div>{{ record.label }}</div>
                  <div
                    class="text-xs text-[var(--ant-color-text-secondary)]"
                  >
                    {{ record.hint }}
                  </div>
                </template>
                <template v-else-if="column.key === 'templateId'">
                  <a-input
                    v-model:value="templateFields(record.key).templateId"
                    :placeholder="
                      effectiveTemplateId(record.key)
                        ? `生效：${effectiveTemplateId(record.key)}`
                        : '腾讯云模板数字 ID'
                    "
                    allow-clear
                  />
                </template>
                <template v-else-if="column.key === 'subject'">
                  <a-input
                    v-model:value="templateFields(record.key).subject"
                    placeholder="可省略【松果排课】前缀"
                    allow-clear
                  />
                </template>
                <template v-else-if="column.key === 'codeKey'">
                  <a-input
                    v-model:value="templateFields(record.key).codeKey"
                    placeholder="空=默认"
                    allow-clear
                  />
                </template>
              </template>
            </a-table>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="credentials" tab="发信凭证">
          <a-form layout="vertical" class="max-w-xl">
            <a-form-item label="SecretId">
              <a-input
                v-model:value="form.secretId"
                placeholder="留空则用 TENCENT_SES_SECRET_ID"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="SecretKey">
              <a-input-password
                v-model:value="form.secretKey"
                :placeholder="
                  config?.hasSecretKey
                    ? '已配置（留空不改）'
                    : '未配置，粘贴后保存'
                "
                allow-clear
              />
              <a-checkbox v-model:checked="form.clearSecretKey" class="mt-1">
                清除已保存的 SecretKey（回退 env）
              </a-checkbox>
            </a-form-item>
            <a-form-item label="地域 Region">
              <a-input
                v-model:value="form.region"
                placeholder="默认 ap-guangzhou"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="发件人 From">
              <a-input
                v-model:value="form.fromAddress"
                placeholder="松果排课 <noreply@mail.example.com>"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="回复地址 Reply-To（可选）">
              <a-input v-model:value="form.replyTo" allow-clear />
            </a-form-item>
          </a-form>
        </a-tab-pane>

        <a-tab-pane key="test" tab="试发">
          <a-form layout="vertical" class="max-w-md">
            <a-form-item label="收件邮箱">
              <a-input
                v-model:value="form.testEmail"
                placeholder="your@example.com"
                allow-clear
              />
            </a-form-item>
            <a-form-item label="用途">
              <a-select v-model:value="form.testPurpose" class="w-full">
                <a-select-option
                  v-for="meta in PURPOSE_META"
                  :key="meta.key"
                  :value="meta.key"
                >
                  {{ meta.label }}
                </a-select-option>
              </a-select>
            </a-form-item>
            <a-button type="default" :loading="testing" @click="testSend">
              先保存再试发
            </a-button>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-card>
  </div>
</template>
