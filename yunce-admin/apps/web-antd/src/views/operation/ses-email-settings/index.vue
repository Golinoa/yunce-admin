<script lang="ts" setup>
import type { SesEmailConfig, SesEmailPurpose } from '#/api';

import { onMounted, reactive, ref } from 'vue';

import { message } from 'ant-design-vue';

import {
  getSesEmailConfigApi,
  testSesEmailApi,
  updateSesEmailConfigApi,
} from '#/api';

const loading = ref(false);
const saving = ref(false);
const testing = ref(false);
const config = ref<null | SesEmailConfig>(null);

const PURPOSE_META: Array<{
  hint: string;
  key: SesEmailPurpose;
  label: string;
}> = [
  {
    key: 'register',
    label: '注册 / 登录验证码',
    hint: '对应小程序登录、注册发码（purpose=LOGIN）',
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
    hint: '开通/续费：优先微信订阅；订阅失败（无额度/无 openid 等）才 SES 兜底；站内仍会通知',
  },
  {
    key: 'expiryReminder',
    label: '到期提醒',
    hint: '到期前 7/3/1 天：优先微信订阅；失败才 SES 兜底；站内仍会通知',
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
  } finally {
    saving.value = false;
  }
}

async function testSend() {
  testing.value = true;
  try {
    await save();
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
    <a-card title="腾讯云 SES 邮件模板" :loading="loading">
      <a-alert
        class="mb-4"
        type="info"
        show-icon
        :message="
          config?.configured
            ? `发信已就绪（凭证来源：${config.credentialSource}）。改模板 ID 后立即生效，无需发版。`
            : '尚未配齐发信条件：请填写 Secret、发件人与「注册」模板 ID，或依赖服务器 TENCENT_SES_* 环境变量回退。'
        "
        :description="config?.envFallbackNote"
      />

      <a-form layout="vertical" class="max-w-3xl">
        <a-divider>发信凭证（后台优先，env 回退）</a-divider>

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
              config?.hasSecretKey ? '已配置（留空不改）' : '未配置，粘贴后保存'
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
        <a-form-item label="默认模板变量名">
          <a-input
            v-model:value="form.codeKey"
            placeholder="默认 code（模板写 {{code}}）"
            allow-clear
          />
        </a-form-item>

        <a-divider>各用途模板</a-divider>

        <div
          v-for="meta in PURPOSE_META"
          :key="meta.key"
          class="mb-6 rounded border border-gray-100 p-4"
        >
          <div class="mb-2 font-medium">{{ meta.label }}</div>
          <div class="mb-3 text-xs text-gray-500">{{ meta.hint }}</div>
          <a-form-item label="模板 ID">
            <a-input
              v-model:value="form.templates[meta.key].templateId"
              :placeholder="
                config?.templates?.[meta.key]?.effectiveTemplateId
                  ? `当前生效：${config.templates[meta.key].effectiveTemplateId}`
                  : '填写腾讯云控制台模板数字 ID'
              "
              allow-clear
            />
          </a-form-item>
          <a-form-item label="邮件标题">
            <a-input
              v-model:value="form.templates[meta.key].subject"
              placeholder="可省略【松果排课】前缀，发送时自动补全"
              allow-clear
            />
          </a-form-item>
          <a-form-item label="变量名（可选，覆盖默认）">
            <a-input
              v-model:value="form.templates[meta.key].codeKey"
              placeholder="空则用上方默认变量名"
              allow-clear
            />
          </a-form-item>
        </div>

        <a-space>
          <a-button type="primary" :loading="saving" @click="save">
            保存
          </a-button>
        </a-space>

        <a-divider>试发</a-divider>
        <a-form-item label="收件邮箱">
          <a-input
            v-model:value="form.testEmail"
            placeholder="your@example.com"
            allow-clear
          />
        </a-form-item>
        <a-form-item label="用途">
          <a-select v-model:value="form.testPurpose" style="width: 280px">
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
    </a-card>
  </div>
</template>
