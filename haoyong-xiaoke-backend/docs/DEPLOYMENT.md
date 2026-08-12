# 小鹅通后端 - 自动化部署指南

## 📋 概述

本项目配置了完整的 **CI/CD 自动化运维体系**，实现：
- 🏷️ **Tag 触发部署**：打版本标签自动发布
- 🔄 **自动部署**：代码自动同步到服务器
- 🔒 **自动续期**：SSL 证书自动续期
- 📊 **健康检查**：部署后自动验证服务状态

---

## 🏗️ 技术架构

```
Gitee (代码仓库)
     ↓
  Tag v1.0.0
     ↓
Gitee Go (CI/CD 流水线)
     ↓
腾讯云服务器 (106.54.59.191)
     ├── PM2 (进程管理)
     ├── Nginx (反向代理)
     ├── acme.sh (SSL 证书)
     └── 宝塔面板 (可视化运维)
```

---

## 🚀 部署流程

### 第一阶段：本地准备

#### 1. 创建 Gitee 仓库

```bash
# 初始化 Git 仓库（如果还没有）
cd haoyong-xiaoke-backend
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库
git remote add origin https://gitee.com/你的用户名/haoyong-xiaoke-backend.git

# 推送代码
git push -u origin master
```

#### 2. 配置 SSH 密钥

```bash
# 生成部署密钥
ssh-keygen -t ed25519 -C "xiaoke-deploy@chancore.cn" -f ~/.ssh/id_ed25519_deploy

# 查看公钥
cat ~/.ssh/id_ed25519_deploy.pub

# 添加到 Gitee
# 访问：https://gitee.com/profile/ssh_keys
```

#### 3. 配置 Gitee 私有变量

仓库 → 设置 → 流水线 → 变量管理

| 变量名 | 值 |
|--------|-----|
| `SSH_PRIVATE_KEY` | 私钥内容（id_ed25519_deploy 的内容） |

---

### 第二阶段：服务器配置

#### 1. SSH 连接到服务器

```bash
ssh root@106.54.59.191
```

#### 2. 安装必要软件

```bash
# 更新系统
yum update -y

# 安装 Node.js 20
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
yum install -y nodejs

# 安装 PM2
npm install -g pm2

# 安装 acme.sh
curl https://get.acme.sh | sh -s email=你的邮箱@chancore.cn

# 安装 rsync（用于文件同步）
yum install -y rsync
```

#### 3. 创建应用目录

```bash
mkdir -p /www/wwwroot/xiaoke-backend
```

#### 4. 首次手动部署

```bash
cd /www/wwwroot/xiaoke-backend

# 从 Gitee 拉取代码
git clone https://gitee.com/你的用户名/haoyong-xiaoke-backend.git .

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 构建
npm run build

# 创建 .env 文件
nano .env
```

#### 5. 配置 .env 文件

```env
NODE_ENV=production
PORT=3000
SERVER_PUBLIC_ORIGIN=https://api.chancore.cn
DATABASE_URL=mysql://root:你的MySQL密码@localhost:3306/xiaoke
JWT_SECRET=chancore_production_jwt_secret_change_this_32chars
JWT_EXPIRES_IN=2h
JWT_REFRESH_EXPIRES_IN=7d
ENABLE_API_DOCS=false
SSL_ENABLED=true
SSL_CERT_PATH=/www/server/nginx/ssl
SSL_DOMAIN=api.chancore.cn
CORS_ORIGINS=https://chancore.cn,https://www.chancore.cn
LOG_LEVEL=info
```

#### 6. 申请 SSL 证书

```bash
cd /www/wwwroot/xiaoke-backend

# 申请证书
~/.acme.sh/acme.sh --issue -d api.chancore.cn --webroot /www/wwwroot/xiaoke-backend --force

# 安装证书
mkdir -p /www/server/nginx/ssl
~/.acme.sh/acme.sh --install-cert -d api.chancore.cn \
  --key-file /www/server/nginx/ssl/api.chancore.cn.key \
  --fullchain-file /www/server/nginx/ssl/api.chancore.cn.crt \
  --reloadcmd "chmod 644 /www/server/nginx/ssl/api.chancore.cn.* && /etc/init.d/nginx reload"
```

#### 7. 配置宝塔 Nginx

在宝塔面板中：
1. 网站 → 添加站点
2. 域名：`api.chancore.cn`
3. 根目录：`/www/wwwroot/xiaoke-backend`
4. PHP版本：选择「纯静态」或「Node」
5. 配置 SSL（使用 acme.sh 生成的证书）
6. 设置反向代理：
   - 目标URL：`http://127.0.0.1:3000`
   - 发送域名：`$host`

#### 8. 启动服务

```bash
cd /www/wwwroot/xiaoke-backend

# 数据库迁移
npx prisma migrate deploy

# 启动 PM2
pm2 delete xiaoke-api 2>/dev/null || true
pm2 start dist/app.js --name xiaoke-api --max-memory-restart 500M --env production

# 保存并设置开机自启
pm2 save
pm2 startup

# 检查状态
pm2 status
```

#### 9. 配置自动续期（可选）

```bash
# 方法1：使用宝塔计划任务
# 宝塔面板 → 计划任务
# 添加 Shell 脚本任务：
/home/www/.acme.sh/acme.sh --cron --home /home/www/.acme.sh

# 方法2：使用系统 crontab
crontab -e
# 添加：
0 3 * * * /root/.acme.sh/acme.sh --cron --home /root/.acme.sh >> /var/log/ssl-renew.log 2>&1
```

---

### 第三阶段：启用 Gitee Go CI/CD

#### 1. 启用 Gitee Go

仓库 →流水线 → Gitee Go → 开启

#### 2. 上传工作流配置

确保 `.gitee/workflows/deploy.yml` 已推送到仓库

#### 3. 测试部署

```bash
# 本地打标签
git tag v1.0.0
git push origin v1.0.0

# 查看流水线
# 访问：https://gitee.com/你的用户名/haoyong-xiaoke-backend/pipelines
```

---

## 🔄 日常使用

### 发布新版本

```bash
# 1. 开发完成，提交代码
git add .
git commit -m "feat: 新功能"

# 2. 推送到 Gitee
git push origin master

# 3. 打标签发布
git tag v1.0.1
git push origin v1.0.1

# 流水线自动触发构建和部署
```

### 查看部署状态

```bash
# 服务器上
pm2 status

# 查看日志
pm2 logs xiaoke-api

# 健康检查
curl https://api.chancore.cn/health
```

### 手动部署

```bash
# SSH 到服务器
ssh root@106.54.59.191

# 执行部署脚本
cd /www/wwwroot/xiaoke-backend
./scripts/deploy.sh
```

### 回滚版本

```bash
# 服务器上
cd /www/wwwroot/xiaoke-backend
./scripts/deploy.sh rollback
```

---

## 📁 目录结构

```
haoyong-xiaoke-backend/
├── .gitee/
│   └── workflows/
│       └── deploy.yml          # CI/CD 流水线配置
├── scripts/
│   ├── deploy.sh               # 服务器部署脚本
│   └── ssl-manage.sh           # SSL 证书管理脚本
├── docs/
│   └── SSH_SETUP.md            # SSH 配置指南
├── dist/                        # 构建输出
├── prisma/
│   └── schema.prisma
├── src/
│   └── ...
├── .env.example
└── package.json
```

---

## ⚠️ 注意事项

1. **首次部署需要手动配置**，之后才能享受自动化
2. **SSL 证书续期是自动的**，但需要确保 80 端口可用
3. **数据库迁移**在新版本首次部署时可能需要手动确认
4. **保持 .env 安全**，不要将实际密码推送到 Git

---

## 🆘 故障排除

### 部署失败

```bash
# 查看 Gitee 流水线日志

# 服务器上手动检查
cd /www/wwwroot/xiaoke-backend
pm2 logs xiaoke-api
npm run build  # 手动构建测试
```

### SSL 证书问题

```bash
# 查看证书状态
~/.acme.sh/acme.sh --list

# 手动续期
~/.acme.sh/acme.sh --renew -d api.chancore.cn --force

# 检查 Nginx 配置
nginx -t
```

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3000

# 检查日志
pm2 logs xiaoke-api --err

# 重启服务
pm2 restart xiaoke-api
```

---

## 📞 支持

如有问题，请检查：
1. Gitee 流水线日志
2. 服务器 PM2 日志
3. Nginx 错误日志
