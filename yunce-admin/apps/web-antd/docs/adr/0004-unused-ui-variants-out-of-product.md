# ADR-0004：未用 UI 变体不进产品面（保留源码、不进门禁）

- Status: implemented
- Date: 2026-09-01
- Class: process / simplification

## Context

`yunce-admin` 继承 Vben monorepo，含 `web-ele` / `web-naive` / `web-tdesign` / `web-antdv-next` / `playground` 等。产品只交付 `web-antd`。物理删除变体风险高（workspace / turbo 引用），短期不必炸删。

## Decision

1. **产品主端唯一**：`apps/web-antd`（延续 ADR-0001）。
2. **门禁 / CI / Docker** 只构建 web-antd；禁止把其它 UI app 加回 `dashboard-ci-*` / `dashboard-v*`。
3. **变体源码暂留**仓库，标注为上游骨架，不作为产品需求入口。
4. **物理移除**另开 ADR + 独立 PR（需验证 turbo/pnpm workspace 无残留引用）。

## Consequences

- 仓库体积仍偏大，但发版面清晰。
- 新人只读 `apps/web-antd/docs/SOP` 与本 ADR，避免改错 app。
