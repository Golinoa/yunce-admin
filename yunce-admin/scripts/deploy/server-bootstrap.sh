#!/bin/bash
# ============================================
# 服务器侧：首次启用 / 更新 dashboard.chancore.cn
# 由 GitHub Actions 上传到 /tmp 后执行，或人工：
#   bash /tmp/yunce-dashboard-bootstrap.sh
# ============================================
set -euo pipefail

DEPLOY_DIR="${DEPLOY_DIR:-/opt/yunce/deploy}"
TAG="${1:-latest}"
TAG="${TAG#v}"
TAG="${TAG#dashboard-}"

cd "${DEPLOY_DIR}"

echo "==> [bootstrap] deploy dir: ${DEPLOY_DIR}"
echo "==> [bootstrap] DASHBOARD_TAG=${TAG}"

# --- 1. nginx vhost ---
mkdir -p nginx/conf.d
cat > nginx/conf.d/dashboard.conf <<'EOF'
# ============================================
# 运营后台 dashboard.chancore.cn
# 边缘 Nginx 终止 SSL，反代至 yunce-dashboard 容器
# ============================================

map $host $ssl_domain_name {
    default chancore.cn;
    "~^(?:[^.]+\.)?([^.]+\.[a-z]+)$" $1;
}

server {
    listen 443 ssl http2;
    server_name dashboard.chancore.cn;

    ssl_certificate /etc/nginx/ssl/$ssl_domain_name/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/$ssl_domain_name/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;

    location / {
        proxy_pass http://dashboard;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/dashboard_access.log main;
    error_log /var/log/nginx/dashboard_error.log;
}
EOF
echo "==> [bootstrap] wrote nginx/conf.d/dashboard.conf"

# --- 2. nginx upstream dashboard ---
if ! grep -q 'upstream dashboard' nginx/nginx.conf; then
  python3 - <<'PY'
from pathlib import Path
p = Path("nginx/nginx.conf")
text = p.read_text(encoding="utf-8")
needle = "upstream backend {"
insert = """upstream backend {
        server backend:3000;
        keepalive 32;
    }

    upstream dashboard {
        server dashboard:8080;
        keepalive 16;
    }
"""
# replace first upstream backend block header+body through closing brace — simpler: inject after backend upstream
import re
m = re.search(r"upstream backend \{.*?\n    \}", text, re.S)
if not m:
    raise SystemExit("upstream backend not found in nginx.conf")
replacement = m.group(0) + """

    upstream dashboard {
        server dashboard:8080;
        keepalive 16;
    }"""
text2 = text[:m.start()] + replacement + text[m.end():]
p.write_text(text2, encoding="utf-8")
print("injected upstream dashboard")
PY
else
  echo "==> [bootstrap] upstream dashboard already present"
fi

# --- 3. docker-compose dashboard service ---
if ! grep -q 'container_name: yunce-dashboard' docker-compose.yml; then
  python3 - <<'PY'
from pathlib import Path
p = Path("docker-compose.yml")
text = p.read_text(encoding="utf-8")
block = '''
  # ============================================
  # 运营后台前端 (yunce-dashboard)
  # 域名：dashboard.chancore.cn（由边缘 nginx 反代）
  # ============================================
  dashboard:
    image: ${ACR_REGISTRY:-crpi-82tx5wbfqndabcwb.cn-shanghai.personal.cr.aliyuncs.com}/${ACR_NAMESPACE:-yunce_sg}/yunce-dashboard:${DASHBOARD_TAG:-latest}
    container_name: yunce-dashboard
    restart: unless-stopped
    networks:
      - backend-network
    depends_on:
      backend:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:8080/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    deploy:
      resources:
        limits:
          memory: 64M
        reservations:
          memory: 32M
    logging:
      driver: json-file
      options:
        max-size: "20m"
        max-file: "3"
        compress: "true"

'''
marker = "  # ============================================\n  # Nginx 反向代理服务"
if marker not in text:
    raise SystemExit("nginx service marker not found in docker-compose.yml")
text = text.replace(marker, block + marker, 1)
# ensure nginx depends_on dashboard
old = """    depends_on:
      backend:
        condition: service_healthy
    # 资源限制
    deploy:
      resources:
        limits:
          memory: 128M"""
new = """    depends_on:
      backend:
        condition: service_healthy
      dashboard:
        condition: service_healthy
    # 资源限制
    deploy:
      resources:
        limits:
          memory: 128M"""
if "dashboard:\n        condition: service_healthy" not in text:
    if old not in text:
        raise SystemExit("nginx depends_on block not found for patch")
    text = text.replace(old, new, 1)
p.write_text(text, encoding="utf-8")
print("injected dashboard service into docker-compose.yml")
PY
else
  echo "==> [bootstrap] dashboard service already in compose"
fi

# --- 4. .env（只写 DASHBOARD_* / REGISTRY 别名；禁止改写 CORS 等可能含引号的行） ---
touch .env
if grep -q '^DASHBOARD_TAG=' .env; then
  sed -i "s/^DASHBOARD_TAG=.*/DASHBOARD_TAG=${TAG}/" .env
else
  echo "DASHBOARD_TAG=${TAG}" >> .env
fi
if ! grep -q '^DASHBOARD_HEALTH_URL=' .env; then
  echo "DASHBOARD_HEALTH_URL=https://dashboard.chancore.cn/health" >> .env
fi
# REGISTRY/NAMESPACE aliases for scripts
if ! grep -q '^REGISTRY=' .env && grep -q '^ACR_REGISTRY=' .env; then
  echo "REGISTRY=$(grep '^ACR_REGISTRY=' .env | cut -d= -f2- | tr -d '\r')" >> .env
fi
if ! grep -q '^NAMESPACE=' .env && grep -q '^ACR_NAMESPACE=' .env; then
  echo "NAMESPACE=$(grep '^ACR_NAMESPACE=' .env | cut -d= -f2- | tr -d '\r')" >> .env
fi
echo "==> [bootstrap] .env updated"

# --- 5. deploy-dashboard.sh ---
if [ -f /tmp/deploy-dashboard.sh ]; then
  cp /tmp/deploy-dashboard.sh scripts/deploy-dashboard.sh
  chmod +x scripts/deploy-dashboard.sh
  # normalize CRLF if any
  sed -i 's/\r$//' scripts/deploy-dashboard.sh || true
  echo "==> [bootstrap] installed scripts/deploy-dashboard.sh"
fi

echo "==> [bootstrap] done"
