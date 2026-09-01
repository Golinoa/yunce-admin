# 开发约定（Admin / web-antd）

对齐后端 `DEVELOPMENT-CONVENTIONS.md` 的产品侧版本。

## 命名与结构

- API：`src/api/core/<domain>.ts`
- 页面：`src/views/operation/<domain>/`
- 纯逻辑优先独立 `.ts`，页面只编排
- 测试：`*.test.ts`；`vue-tsc` 已排除测试文件

## 请求

- 只允许 `#/api` / `requestClient`
- 禁止页面内新建 axios / 裸 fetch

## 提交与门禁

- commit message：Conventional Commits（commitlint）
- 小改：`pnpm run verify:sop:fast`
- 发版前：`pnpm run verify:sop`
- 标签：`dashboard-ci-*` / `dashboard-v*`

## 密钥

- 仓库 `.env.production` 仅占位
- 生产密钥：`VITE_APP_STORE_SECURE_KEY` Secret / Docker build-arg

## 约定生长

重复踩坑写入本文件 + `AGENTS.md`，重大决策写 `docs/adr/`。
