# 松果排课运营后台（apps/web-antd）— AI / 工程硬性约定

> 对齐 `yunce-backend/AGENTS.md` 精神；产品工程化权威入口见 `docs/SOP/README.md`。

## 产品边界

1. **唯一产品 app**：`apps/web-antd`。其它 UI 变体不进 `dashboard-ci-*` / `dashboard-v*`。
2. **禁止注册 demos / 上游 vben 演示路由**到生产菜单（见 `src/router/routes/index.ts`）。
3. **品牌**：文案统一「松果排课」；`VITE_APP_NAMESPACE=songguo-admin`。

## 数据与 API

1. 页面只通过 `#/api`（`src/api/core/*`）发请求，禁止在 `.vue` 内直接 `fetch` / 新建 axios。
2. 新增 operation 能力：先 API → 再 composable → 再页面。
3. 新增/变更 API 或关键 composable **必须带测试**（`*.test.ts` 同目录或 `__tests__`）。

## 页面与体量

1. 运营列表页优先使用 `views/operation/components/OperationTablePage`（筛选 / 操作 / 表格 slots）。
2. 单文件建议 ≤400 行；超限拆 `components/` / `composables/`。
3. 约定详见工程化演进 Phase 2 / ADR-0003；未用 UI 变体见 ADR-0004。

## 质量门禁

| 场景 | 命令 |
|------|------|
| 日常推送前（改动 web-antd） | `pnpm run check:type:antd` |
| 大改 / 发版前 | `pnpm run verify:sop` |
| 发版后 | `pnpm run verify:sop:post` |

证据必须是可回放命令输出；禁止为过门禁而删改测试断言。

## 密钥

- 仓库 `.env.production` 仅允许占位密钥。
- 生产密钥经 Docker `build-arg` / GitHub Secret `VITE_APP_STORE_SECURE_KEY` 注入。
