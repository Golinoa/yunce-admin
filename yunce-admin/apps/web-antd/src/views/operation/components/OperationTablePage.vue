<script lang="ts" setup>
/**
 * 运营列表页公共壳：统一标题区 / 筛选区 / 表格区布局。
 * 业务页只填 slots，分页与请求状态由页面自行绑定。
 */
defineProps<{
  loading?: boolean;
  title: string;
}>();
</script>

<template>
  <div class="operation-table-page p-5">
    <a-space direction="vertical" class="w-full" size="middle">
      <a-card :title="title" :bordered="false">
        <div v-if="$slots.summary" class="mb-4">
          <slot name="summary"></slot>
        </div>
        <div v-if="$slots.filters" class="mb-4">
          <slot name="filters"></slot>
        </div>
        <div v-if="$slots.actions" class="mb-4 flex justify-end">
          <slot name="actions"></slot>
        </div>
        <a-spin :spinning="Boolean(loading)">
          <slot></slot>
        </a-spin>
        <div v-if="$slots.footer" class="mt-4">
          <slot name="footer"></slot>
        </div>
      </a-card>
    </a-space>
  </div>
</template>
