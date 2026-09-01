import type { RouteRecordRaw } from 'vue-router';

import { mergeRouteModules, traverseTreeValues } from '@vben/utils';

import { coreRoutes, fallbackNotFoundRoute } from './core';
import dashboardRoutes from './modules/dashboard';
import organizationRoutes from './modules/organization';

/**
 * 产品面仅注册业务路由模块。
 * demos / vben 上游演示路由刻意不导入（Phase 0 产品边界）。
 */
const dynamicRouteFiles = {
  './modules/dashboard.ts': { default: dashboardRoutes },
  './modules/organization.ts': { default: organizationRoutes },
};

/** 动态路由 */
const dynamicRoutes: RouteRecordRaw[] = mergeRouteModules(dynamicRouteFiles);

const staticRoutes: RouteRecordRaw[] = [];
const externalRoutes: RouteRecordRaw[] = [];

/** 路由列表，由基本路由、外部路由和404兜底路由组成
 *  无需走权限验证（会一直显示在菜单中） */
const routes: RouteRecordRaw[] = [
  ...coreRoutes,
  ...externalRoutes,
  fallbackNotFoundRoute,
];

/** 基本路由列表，这些路由不需要进入权限拦截 */
const coreRouteNames = traverseTreeValues(coreRoutes, (route) => route.name);

/** 有权限校验的路由列表，包含动态路由和静态路由 */
const accessRoutes = [...dynamicRoutes, ...staticRoutes];
export { accessRoutes, coreRouteNames, routes };
