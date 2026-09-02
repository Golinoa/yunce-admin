# 发版与测试 SOP（Admin）

## 标签约定

| 标签 | 作用 | 部署 |
|------|------|------|
| 普通 push `main` | 默认不跑 Actions | 否 |
| `dashboard-ci-*` | 质量门禁 = `pnpm run verify:sop` + Docker build 试构建 | **否** |
| `dashboard-v*` | Release：quality → ACR → SSH 部署 → health | **是** |

## 本地发版前

```bash
cd yunce-admin
pnpm run verify:sop
```

## 云端只验

```bash
git tag dashboard-ci-YYYYMMDDHHMM
git push <remote> dashboard-ci-YYYYMMDDHHMM
```

## 正式发版

1. 确认 CI 绿或本地 `verify:sop` 绿
2. 确认 GitHub Secret 已配置 `VITE_APP_STORE_SECURE_KEY`（**非** `please-replace-me-with-your-own-key`，长度 ≥16）
   - 路径：仓库 Settings → Secrets and variables → Actions → New repository secret
   - 名称必须精确为 `VITE_APP_STORE_SECURE_KEY`
   - 未配置或占位值时，`dashboard-v*` 流水线会在「校验 store 加密密钥」步骤失败
3. `git tag dashboard-vX.Y.Z && git push <remote> dashboard-vX.Y.Z`
4. 发版后：`pnpm run verify:sop:post`

本地试打镜像同样强制密钥：

```bash
export VITE_APP_STORE_SECURE_KEY='your-real-key-at-least-16'
./scripts/deploy/build-local-docker-image.sh local
```

Docker 构建期会跑 `scripts/assert-store-secure-key.mjs`；占位/空密钥直接失败。

## 门禁内容（verify:sop）

1. `check:type:antd`
2. `lint:antd`（产品面 eslint；全仓 `pnpm lint` 仍可用）
3. `check:env`
4. `test:ci:antd`（业务 Vitest）
5. `build:antd`
6. `check:compat`
7. `audit:ci`

日常推送可用更快的 `pnpm run verify:sop:fast`（不含 build/audit）。
