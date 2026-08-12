# 服务器部署指南

本文档详细说明如何在腾讯云服务器上部署后端服务。

## 目录

1. [服务器环境准备](#1-服务器环境准备)
2. [安装 SSL 证书](#2-安装-ssl-证书)
3. [配置 Nginx](#3-配置-nginx)
4. [部署后端代码](#4-部署后端代码)
5. [配置七牛云](#5-配置七牛云)
6. [运维命令](#6-运维命令)

---

## 1. 服务器环境准备

### 1.1 SSH 登录服务器

```bash
ssh root@你的服务器IP
```

### 1.2 更新系统

```bash
apt update && apt upgrade -y
```

### 1.3 安装基础软件

```bash
# 安装 Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs

# 安装 MySQL
apt install -y mysql-server

# 安装 Git
apt install -y git

# 安装 Nginx
apt install -y nginx

# 安装 PM2（Node.js 进程管理器）
npm install -g pm2
```

### 1.4 配置 MySQL

```bash
# 启动 MySQL
systemctl start mysql
systemctl enable mysql

# 安全配置
mysql_secure_installation
# 按提示操作：设置 root 密码、移除匿名用户等

# 创建数据库
mysql -u root -p
```

在 MySQL 中执行：

```sql
CREATE DATABASE xiaoke CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'xiaoke'@'localhost' IDENTIFIED BY '你的强密码';
GRANT ALL PRIVILEGES ON xiaoke.* TO 'xiaoke'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 1.5 开放端口

在腾讯云控制台安全组中开放：
- **80** (HTTP) - 用于 Let's Encrypt 验证
- **443** (HTTPS) - API 访问
- **22** (SSH) - 已开放

---

## 2. 安装 SSL 证书

### 2.1 安装 acme.sh

```bash
# 使用你的真实邮箱
curl https://get.acme.sh | sh -s email=your@email.com

# 重新加载环境
source ~/.bashrc

# 验证安装
acme.sh --version
```

### 2.2 申请 SSL 证书

> ⚠️ 重要：执行此命令前，请确保你的域名已经解析到服务器 IP

```bash
# 创建网站目录（用于 HTTP 验证）
mkdir -p /var/www/html

# 申请证书（替换为你的真实域名）
acme.sh --issue -d api.youche.com -d www.api.youche.com --webroot /var/www/html
```

如果域名解析尚未生效，可以使用 DNS API 方式：

```bash
# 阿里云 DNS
export Ali_Key="你的阿里云Key"
export Ali_Secret="你的阿里云Secret"

acme.sh --issue --dns dns_ali -d api.youche.com

# 腾讯云 DNSPod
export DP_Key="你的腾讯云Key"
export DP_Secret="你的腾讯云Secret"

acme.sh --issue --dns dns_dp -d api.youche.com
```

### 2.3 安装证书

```bash
# 创建证书目录
mkdir -p /etc/nginx/ssl

# 安装证书
acme.sh --install-cert -d api.youche.com \
  --key-file /etc/nginx/ssl/api.youche.com.key \
  --fullchain-file /etc/nginx/ssl/api.youche.com.crt \
  --reloadcmd "service nginx force-reload"
```

### 2.4 证书自动续期

acme.sh 会自动在证书到期前 30 天续期，无需手动操作。

查看已安装的证书：

```bash
acme.sh --list
```

---

## 3. 配置 Nginx

### 3.1 创建 Nginx 配置

```bash
nano /etc/nginx/sites-available/xiaoke-api
```

粘贴以下内容（替换 `api.youche.com` 为你的域名）：

```nginx
server {
    listen 80;
    server_name api.youche.com;

    # 自动跳转 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.youche.com;

    # SSL 证书
    ssl_certificate /etc/nginx/ssl/api.youche.com.crt;
    ssl_certificate_key /etc/nginx/ssl/api.youche.com.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 日志
    access_log /var/log/nginx/xiaoke-api.access.log;
    error_log /var/log/nginx/xiaoke-api.error.log;

    # API 代理
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    # 上传文件目录
    location /uploads {
        alias /var/www/xiaoke/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 3.2 启用配置

```bash
# 启用站点
ln -s /etc/nginx/sites-available/xiaoke-api /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重载 Nginx
systemctl reload nginx
```

### 3.3 创建上传目录

```bash
mkdir -p /var/www/xiaoke/uploads
chown -R www-data:www-data /var/www/xiaoke
```

---

## 4. 部署后端代码

### 4.1 上传代码到服务器

**方式一：使用 Git**

```bash
# 创建目录
mkdir -p /var/www/xiaoke-backend
cd /var/www/xiaoke-backend

# 如果已有代码，直接复制到服务器
# 或使用 rsync 从本地同步
rsync -avz --exclude='node_modules' --exclude='.git' ./ user@server:/var/www/xiaoke-backend/
```

**方式二：使用 scp**

```bash
# 在本地执行
scp -r ./dist user@server:/var/www/xiaoke-backend/
scp .env user@server:/var/www/xiaoke-backend/
```

### 4.2 安装依赖并构建

```bash
cd /var/www/xiaoke-backend

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 构建
npm run build
```

### 4.3 配置环境变量

```bash
nano /var/www/xiaoke-backend/.env
```

关键配置项：

```env
NODE_ENV=production
PORT=3000
SERVER_PUBLIC_ORIGIN=https://api.youche.com
DATABASE_URL=mysql://xiaoke:你的密码@localhost:3306/xiaoke
JWT_SECRET=生产环境请使用强随机密钥至少32位
SSL_ENABLED=true
SSL_CERT_PATH=/etc/nginx/ssl
SSL_DOMAIN=api.youche.com
```

### 4.4 数据库迁移

```bash
cd /var/www/xiaoke-backend
npx prisma migrate deploy
```

### 4.5 启动服务

```bash
cd /var/www/xiaoke-backend

# 使用 PM2 启动
pm2 delete xiaoke-api 2>/dev/null || true

pm2 start dist/app.js \
  --name xiaoke-api \
  --max-memory-restart 500M \
  --env production

# 保存 PM2 配置
pm2 save

# 设置开机自启
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $(eval echo ~$USER)
```

### 4.6 验证服务

```bash
# 检查服务状态
pm2 status

# 查看日志
pm2 logs xiaoke-api

# 测试 API
curl https://api.youche.com/health
```

---

## 5. 配置七牛云

### 5.1 在七牛云控制台配置自定义域名

1. 登录七牛云控制台
2. 进入「对象存储」-> 选择存储桶 -> 「域名管理」
3. 点击「添加自定义域名」
4. 输入你的 CDN 域名（如 `cdn.youche.com`）
5. 选择「HTTPS」证书来源：
   - 选择「上传证书」
   - 或选择「上传证书」并粘贴证书内容

### 5.2 下载证书文件

在服务器上找到证书文件：

```bash
# 证书内容
cat /etc/nginx/ssl/api.youche.com.crt

# 私钥内容
cat /etc/nginx/ssl/api.youche.com.key
```

### 5.3 上传证书到七牛云

在七牛云控制台的证书上传页面：
- 证书内容：粘贴 `.crt` 文件的完整内容
- 私钥内容：粘贴 `.key` 文件的完整内容

### 5.4 配置 CNAME

在 DNS 服务商处添加 CNAME 记录：
- 记录名：`cdn`（或你自定义的子域名）
- 类型：`CNAME`
- 值：七牛云提供的 CNAME 地址

---

## 6. 运维命令

### 6.1 PM2 常用命令

```bash
# 查看服务状态
pm2 status

# 查看日志
pm2 logs xiaoke-api

# 重启服务
pm2 restart xiaoke-api

# 停止服务
pm2 stop xiaoke-api

# 删除服务
pm2 delete xiaoke-api

# 监控资源使用
pm2 monit
```

### 6.2 Nginx 常用命令

```bash
# 测试配置
nginx -t

# 重载配置
systemctl reload nginx

# 重启 Nginx
systemctl restart nginx

# 查看错误日志
tail -f /var/log/nginx/xiaoke-api.error.log
```

### 6.3 SSL 证书管理

```bash
# 查看证书列表
acme.sh --list

# 手动续期
acme.sh --renew -d api.youche.com --force

# 查看证书详情
acme.sh --info -d api.youche.com

# 通过 API 查看证书状态
curl https://api.youche.com/api/app/v1/ssl-cert/status
```

### 6.4 日志查看

```bash
# 应用日志（PM2）
pm2 logs xiaoke-api --lines 200

# Nginx 访问日志
tail -f /var/log/nginx/xiaoke-api.access.log

# Nginx 错误日志
tail -f /var/log/nginx/xiaoke-api.error.log
```

---

## 常见问题

### Q1: acme.sh HTTP 验证失败？

确保：
1. 域名已正确解析到服务器 IP
2. 端口 80 已开放
3. `/var/www/html` 目录存在且有权限

### Q2: 证书续期后 Nginx 没有重载？

检查 acme.sh 的 `--reloadcmd` 命令，确保有 sudo 权限：

```bash
# 编辑 crontab
crontab -e

# 添加：
0 0 * * * "/root/.acme.sh"/acme.sh --cron --home "/root/.acme.sh" >> /var/log/acme.sh.log 2>&1
```

### Q3: PM2 启动失败？

```bash
# 检查 Node.js 版本
node -v

# 重新构建
npm run build

# 查看详细错误
pm2 start dist/app.js --name xiaoke-api --v
```

### Q4: 数据库连接失败？

1. 检查 MySQL 服务状态：`systemctl status mysql`
2. 验证数据库连接：`mysql -u xiaoke -p -h localhost`
3. 检查 `.env` 中的 `DATABASE_URL` 配置
