#!/bin/bash
# ============================================
# deploy-dashboard.sh - 运营后台镜像部署
# 由 yunce-admin GitHub Actions 通过 SSH 调用
#
# 职责：
# 1. 从 ACR 拉取 yunce-dashboard 镜像
# 2. 重启 dashboard 容器
# 3. 重载边缘 nginx（加载 dashboard.chancore.cn 路由）
# 4. 健康检查
#
# 参数：
#   $1 - 镜像 tag（如 1.0.0），默认 latest
# ============================================

set -euo pipefail

TAG="${1:-latest}"
TAG="${TAG#v}"
TAG="${TAG#dashboard-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# 只读需要的 KEY=value，禁止 source 整个 .env（密钥/多行值会炸 bash）
env_get() {
  local key="$1"
  local file="$2"
  local line raw
  line="$(grep -E "^${key}=" "${file}" | tail -n 1 || true)"
  [ -n "${line}" ] || return 1
  raw="${line#*=}"
  raw="${raw%$'\r'}"
  if [[ "${raw}" == \"*\" ]]; then
    raw="${raw:1:${#raw}-2}"
  elif [[ "${raw}" == \'*\' ]]; then
    raw="${raw:1:${#raw}-2}"
  fi
  printf '%s' "${raw}"
}

ENV_FILE="${DEPLOY_DIR}/.env"
if [ -f "${ENV_FILE}" ]; then
  REGISTRY="$(env_get REGISTRY "${ENV_FILE}" || true)"
  if [ -z "${REGISTRY}" ]; then
    REGISTRY="$(env_get ACR_REGISTRY "${ENV_FILE}" || true)"
  fi
  NAMESPACE="$(env_get NAMESPACE "${ENV_FILE}" || true)"
  if [ -z "${NAMESPACE}" ]; then
    NAMESPACE="$(env_get ACR_NAMESPACE "${ENV_FILE}" || true)"
  fi
  DASHBOARD_HEALTH_URL="$(env_get DASHBOARD_HEALTH_URL "${ENV_FILE}" || true)"
  ACR_REGISTRY_USERNAME="$(env_get ACR_REGISTRY_USERNAME "${ENV_FILE}" || true)"
  ACR_REGISTRY_PASSWORD="$(env_get ACR_REGISTRY_PASSWORD "${ENV_FILE}" || true)"
  export REGISTRY NAMESPACE DASHBOARD_HEALTH_URL ACR_REGISTRY_USERNAME ACR_REGISTRY_PASSWORD
fi

: "${REGISTRY:?REGISTRY 未设置}"
: "${NAMESPACE:?NAMESPACE 未设置}"
: "${DASHBOARD_HEALTH_URL:=https://dashboard.chancore.cn/health}"

DASHBOARD_IMAGE="${REGISTRY}/${NAMESPACE}/yunce-dashboard:${TAG}"

echo "============================================"
echo "==> 运营后台部署开始"
echo "==> 时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "==> 镜像: ${DASHBOARD_IMAGE}"
echo "============================================"

cd "${DEPLOY_DIR}"

if [ -n "${ACR_REGISTRY_USERNAME:-}" ] && [ -n "${ACR_REGISTRY_PASSWORD:-}" ]; then
  echo ""
  echo "==> 登录 ACR"
  echo "${ACR_REGISTRY_PASSWORD}" | docker login "${REGISTRY}" \
    --username "${ACR_REGISTRY_USERNAME}" \
    --password-stdin
fi

echo ""
echo "==> [1/4] 拉取 dashboard 镜像"
docker pull "${DASHBOARD_IMAGE}"

echo ""
echo "==> [2/4] 启动 dashboard 容器"
export DASHBOARD_TAG="${TAG}"
docker compose up -d dashboard

echo ""
echo "==> [3/4] 重载边缘 nginx"
docker compose up -d nginx
docker exec yunce-nginx nginx -t
docker exec yunce-nginx nginx -s reload

echo ""
echo "==> [4/4] 健康检查"
MAX_WAIT=60
WAITED=0
until curl -f -k -s -o /dev/null "${DASHBOARD_HEALTH_URL}"; do
  if [ "${WAITED}" -ge "${MAX_WAIT}" ]; then
    echo "❌ 健康检查超时（${MAX_WAIT}s）"
    docker compose logs --tail=50 dashboard
    exit 1
  fi
  sleep 5
  WAITED=$((WAITED + 5))
  echo "  等待中... ${WAITED}/${MAX_WAIT}s"
done

echo ""
docker compose ps dashboard nginx
echo ""
echo "✅ 运营后台部署成功: ${TAG}"
echo "   访问: https://dashboard.chancore.cn"
echo "   健康: ${DASHBOARD_HEALTH_URL}"
