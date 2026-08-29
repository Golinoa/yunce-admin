<script lang="ts" setup>
import { useRouter } from 'vue-router';

defineOptions({ name: 'ForgetPassword' });

const router = useRouter();
</script>

<template>
  <div class="w-full">
    <h2 class="mb-2 text-2xl font-semibold">忘记密码</h2>
    <p class="text-muted-foreground mb-8 text-sm leading-relaxed">
      运营后台不支持自助找回密码。请联系超级管理员重置，或登录后在个人中心修改密码。
    </p>
    <a-button block type="primary" @click="router.push('/auth/login')">
      返回登录
    </a-button>
  </div>
</template>
