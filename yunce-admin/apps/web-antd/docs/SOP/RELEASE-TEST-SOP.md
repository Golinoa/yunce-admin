# 发版与测试 SOP（Admin）

## 标签约定

| 标签 | 作用 | 部署 |
|------|------|------|
| 普通 push `main` | 默认不跑 Actions | 否 |
| `ci-*`（兼容旧名 `dashboard-ci-*`） | 质量门禁 = `pnpm run verify:sop` + Docker build 试构建 | **否** |
| `vX.Y.Z`（兼容旧名 `dashboard-v*`） | Release：quality → ACR → SSH 部署 → health | **是** |

> 推荐一律用 **`v1.0.12` 这种 v 前缀语义化版本**。  
> 本仓 `v*` 只发运营后台；后端 API 的 `v*` 在 **独立 backend 仓库**，互不冲突。

## 本地发版前（= 模拟 CI）

```bash
cd yunce-admin
pnpm run verify:sop
```

这条命令与云端 `verify:sop（发版前）` **同一串步骤**，打 `v*` 前必须本地绿：

`check:type:antd` → `lint:antd` → `check:env` → `test:ci:antd` → `build:antd` → `check:compat` → `audit:ci`

### 对齐过的坑（以后应能本地跑出来）

| 坑 | 以前 | 现在 |
|----|------|------|
| ESLint（如 `define-macros-order`） | 只跑 `test`/`vue-tsc` 会漏 | 已在 `lint:antd`；**务必跑完整 verify:sop** |
| `audit:ci` + npmmirror 无 audit 端点 | 本地 WARN 跳过、CI 硬红 | 强制 `registry.npmjs.org`，本地默认也红；勿设 `AUDIT_ALLOW_SKIP=1` 发版 |

云端多出来的只有：Docker 构建 + Secret 注入 + 部署（本地 `verify:sop` 不覆盖）。

## 云端只验

```bash
git tag ci-YYYYMMDDHHMM
git push github ci-YYYYMMDDHHMM
```

## 正式发版

1. 确认 CI 绿或本地 `verify:sop` 绿
2. 确认 GitHub Secret 已配置 `VITE_APP_STORE_SECURE_KEY`（**非** `please-replace-me-with-your-own-key`，长度 ≥16）
   - 路径：仓库 Settings → Secrets and variables → Actions → New repository secret
   - 名称必须精确为 `VITE_APP_STORE_SECURE_KEY`
   - 未配置或占位值时，`v*` 流水线会在「校验 store 加密密钥」步骤失败
3. 打标签并推送到 GitHub（触发发版）：

```bash
cd yunce-back   # git 根目录
git tag -a v1.0.12 -m "release dashboard v1.0.12"
git push github main
git push github v1.0.12
```

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
7. `audit:ci`（强制 `registry.npmjs.org`；只拦 web-antd 运行时 high/critical；与 CI 同失败）

日常推送可用更快的 `pnpm run verify:sop:fast`（不含 build/audit）。
