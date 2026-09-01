# Admin 工程化 — Phase 1 完成清单

- [x] `verify:sop` / `verify:sop:post` 脚本
- [x] `check:compat` / `check:env` / `audit:ci` / health / headers
- [x] `test:ci:antd` + 产品路由边界冒烟测试（1 passed）
- [x] `dashboard-ci.yml` / `dashboard-release.yml` 调同一门禁；pnpm 11
- [x] lefthook：pre-commit/pre-push 收窄到 web-antd
- [x] AGENTS.md + PRE-PUSH + RELEASE SOP
- [ ] coverage threshold：延至 Phase 2（避免本阶段强依赖 `@vitest/coverage-v8` 安装）

本地已跑通：`check:type:antd` + `check:env` + `check:compat` + `test:ci:antd`

下一阶段：Phase 2（业务测试 / 目录约定 / 看板拆分 / ADR / coverage）
