import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

/**
 * 运营后台增量业务路由（P2 第五节 / T03）：
 * - 门店入驻审核（列表 + 详情）
 * - 机构列表 / 版本与配额管理
 * - 机构版本配置
 *
 * 说明：当前 app.accessMode 为 backend（菜单来自后端 /menu/all），
 * 本模块在 mixed/frontend 模式下生效；backend 模式下需后端在菜单中
 * 同步注册对应入口（component 路径与 views 目录一致）。
 */
const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:store',
      order: 20,
      title: $t('page.organization.storeEntry'),
    },
    name: 'StoreEntryApplications',
    path: '/operation/store-entry',
    children: [
      {
        name: 'StoreEntryApplicationList',
        path: '/operation/store-entry',
        component: () => import('#/views/operation/store-entry/index.vue'),
        meta: {
          icon: 'lucide:list-checks',
          title: $t('page.organization.storeEntry'),
        },
      },
      {
        name: 'StoreEntryApplicationDetail',
        path: '/operation/store-entry/detail',
        component: () => import('#/views/operation/store-entry/detail.vue'),
        meta: {
          hideInMenu: true,
          title: $t('page.organization.storeEntryDetail'),
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:building-2',
      order: 21,
      title: $t('page.organization.organizations'),
    },
    name: 'Organizations',
    path: '/operation/organizations',
    children: [
      {
        name: 'OrganizationList',
        path: '/operation/organizations',
        component: () => import('#/views/operation/organizations/index.vue'),
        meta: {
          icon: 'lucide:building-2',
          title: $t('page.organization.organizations'),
        },
      },
    ],
  },
  {
    meta: {
      icon: 'lucide:settings-2',
      order: 22,
      title: $t('page.organization.versions'),
    },
    name: 'OrganizationVersions',
    path: '/operation/organization-versions',
    children: [
      {
        name: 'OrganizationVersionList',
        path: '/operation/organization-versions',
        component: () => import('#/views/operation/organization-versions/index.vue'),
        meta: {
          icon: 'lucide:settings-2',
          title: $t('page.organization.versions'),
        },
      },
    ],
  },
];

export default routes;
