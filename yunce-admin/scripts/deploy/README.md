# 云策运营后台 Docker 部署

> 生产域名：**https://dashboard.chancore.cn**  
> 镜像名：`yunce-dashboard`  
> API：同源 `/api/admin/v1` → 容器内反代 `backend:3000`

## 架构

```
浏览器 → dashboard.chancore.cn (yunce-nginx:443)
              ↓
         yunce-dashboard:8080 (静态 SPA + /api 反代)
              ↓
         yunce-api:3000 (/api/admin/v1)
```

## 本地构建

```bash
cd yunce-back/yunce-admin
pnpm install
pnpm run build:antd          # 仅构建前端
./scripts/deploy/build-local-docker-image.sh latest
```

## 生产发布（CI/CD）

> 本地 git 根目录是 **`yunce-back/`**（对应 Gitee/GitHub 的 `yunce-admin` 仓）。  
> Workflow 在 **`.github/workflows/`**（仓库根），Docker context 为 `yunce-admin/`。  
> GitHub 仓：https://github.com/Golinoa/yunce-admin

1. 在 [GitHub Secrets](https://github.com/Golinoa/yunce-admin/settings/secrets/actions) 配置（与 backend 相同）：
   - `ACR_NAMESPACE`
   - `ACR_REGISTRY_USERNAME` / `ACR_REGISTRY_PASSWORD`
   - `SERVER_HOST` / `SERVER_USERNAME` / `SERVER_SSH_KEY`

2. 双远程推送 + 打 tag 发版：

```bash
cd yunce-back   # git 根目录

# 日常同步
git push origin master     # Gitee
git push github master     # GitHub（触发 CI）

# 发版运营后台
git tag dashboard-v1.0.0
git push github dashboard-v1.0.0   # 触发构建镜像 + 部署
```

3. 或手动触发 Actions → **Yunce Dashboard Release** → Run workflow

## 服务器首次启用

1. **DNS**：`dashboard.chancore.cn` A 记录 → 服务器 IP（通配符证书 `*.chancore.cn` 已覆盖）

2. **同步 deploy 配置**（含 `nginx/conf.d/dashboard.conf` 与 `docker-compose.yml` dashboard 服务）

3. **服务器 `.env`** 增加：

```env
DASHBOARD_TAG=latest
DASHBOARD_HEALTH_URL=https://dashboard.chancore.cn/health
CORS_ORIGINS=https://chancore.cn,https://www.chancore.cn,https://dashboard.chancore.cn
```

4. **首次部署**：

```bash
cd /opt/yunce/deploy
./scripts/deploy-dashboard.sh latest
```

5. **验收**：

```bash
curl -fsSk https://dashboard.chancore.cn/health
curl -fsSk -X POST https://dashboard.chancore.cn/api/admin/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"YOUR_ADMIN_INIT_PASSWORD"}'
```

## 环境变量（构建时）

| 变量 | 文件 | 说明 |
|------|------|------|
| `VITE_GLOB_API_URL` | `apps/web-antd/.env.production` | `/api/admin/v1` 同源 |
| `VITE_ROUTER_HISTORY` | 同上 | `hash` 模式 |
| `VITE_COMPRESS` | 同上 | `gzip` 构建压缩 |

## 与 backend 发布的关系

- **backend** tag `v*` → 只更新 API / nginx 镜像
- **dashboard** tag `dashboard-v*` → 只更新运营后台前端镜像
- 两者独立发版，共用同一台服务器 Docker Compose 网络
