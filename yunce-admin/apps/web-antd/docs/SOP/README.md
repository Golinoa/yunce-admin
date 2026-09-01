# 管理端工程化总览（对齐后端 SOP）

> 产品入口：`apps/web-antd`（运营后台）。  
> 权威对标：`yunce-backend/docs/SOP/README.md` + `verify:sop`。  
> 演进细则：[ENGINEERING-EVOLUTION.md](./ENGINEERING-EVOLUTION.md)

## 目标状态（与后端同构）

```text
1. 本地开发
   pnpm -C yunce-admin run dev:antd  →  proxy /api/admin/v1 → backend

2. 推送前质量
   小改：按 PRE-PUSH-CHECKS 最小证据
   大改 / 发版前：pnpm run verify:sop

3. 云端只验门禁、不部署
   git tag dashboard-ci-YYYYMMDDHHMM && git push <remote> dashboard-ci-*

4. 正式发版
   dashboard-v* → quality → 镜像 → SSH 部署 → /health

5. 发版后冒烟
   verify:sop:post（health + headers）
```

| 标签 | 流水线 | 部署 |
|------|--------|------|
| 普通 push `main` | 不跑 Actions（可后续加 PR 门禁） | 否 |
| `dashboard-ci-*` | 仅质量 | **否** |
| `dashboard-v*` | Release | **是** |

## 现状差距（相对后端）

| 能力 | 后端 | Admin 现状 |
|------|------|------------|
| 命名 verify 链 | `verify:sop` | 无，散落 typecheck/lint/build |
| 业务测试 + 覆盖率地板 | Jest + threshold | 业务 0；仅有 Vben 包测 |
| SOP / ADR / AGENTS | 齐备 | 缺（README 仍是上游 Vben） |
| 范围化 pre-push | `verify:scope` | lefthook 全量 `check:type` |
| 产品面收敛 | 单服务 | 多 UI 变体 + demos 残留 |
| 发版后冒烟 | `verify:sop:post` | Release 仅 `/health` |

## 文档清单（规划）

| 文档 | 状态 |
|------|------|
| [README.md](./README.md) | 本入口 |
| [ENGINEERING-EVOLUTION.md](./ENGINEERING-EVOLUTION.md) | 分期演进方案（现行） |
| PRE-PUSH-CHECKS.md | Phase 1 补齐 |
| RELEASE-TEST-SOP.md | Phase 1 补齐 |
| DEVELOPMENT-CONVENTIONS.md | Phase 2 补齐 |
| AGENTS.md（web-antd 根） | Phase 1 补齐 |
| docs/adr/ | Phase 2 起建 |
