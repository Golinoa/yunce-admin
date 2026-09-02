<script setup lang="ts">
import { ref } from 'vue';

import { Profile } from '@vben/common-ui';
import { useUserStore } from '@vben/stores';

import ProfilePasswordSetting from './password-setting.vue';

const userStore = useUserStore();

const tabsValue = ref<string>('password');

/** 仅保留改密：基本/安全/通知页为 Vben 模板假数据，不上线 */
const tabs = ref([
  {
    label: '修改密码',
    value: 'password',
  },
]);
</script>
<template>
  <Profile
    v-model:model-value="tabsValue"
    title="个人中心"
    :user-info="userStore.userInfo"
    :tabs="tabs"
  >
    <template #content>
      <ProfilePasswordSetting />
    </template>
  </Profile>
</template>
