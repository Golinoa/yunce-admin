# ADR-0001：产品主应用仅 web-antd + 标签分流发版

- Status: implemented
- Date: 2026-09-01
- Class: process

## Context

yunce-admin 为 Vben monorepo，含多个 UI 变体。运营后台实际只交付 `apps/web-antd`，发版用 `ci-*` / `vX.Y.Z`（兼容旧 `dashboard-*` 前缀）。

## Decision

1. 产品面唯一入口：`apps/web-antd`。
2. CI/CD 只构建 web-antd；其它 apps 不进产品门禁。
3. 演示路由 demos/vben 不注册到生产动态路由。

## Consequences

- 降低认知与构建成本；变体源码可保留但非产品面。
- 文档 / AGENTS / CODE_WIKI 必须以 web-antd 为准。
