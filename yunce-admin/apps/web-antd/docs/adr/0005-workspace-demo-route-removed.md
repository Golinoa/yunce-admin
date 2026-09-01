# ADR-0005：移除 Vben Workspace 演示路由

- Status: implemented
- Date: 2026-09-01
- Class: product / simplification

## Context

`accessMode: backend` 下后端菜单不含 `/workspace`，但前端仍注册该路由，形成死页；页面内容为 Vben 示例数据，不适合运营产品。

## Decision

从 `router/routes/modules/dashboard.ts` 移除 Workspace 子路由；演示组件源码可暂留，不进菜单、不进产品导航。

## Consequences

运营端仅保留 Analytics 看板入口；若未来需要工作台，另做产品页并挂后端菜单。
