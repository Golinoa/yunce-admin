#!/bin/bash
# ============================================
# 本地构建 yunce-dashboard Docker 镜像
# 用法：./scripts/deploy/build-local-docker-image.sh [tag]
# 示例：./scripts/deploy/build-local-docker-image.sh latest
# ============================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
IMAGE_NAME="yunce-dashboard"
TAG="${1:-local}"

cd "${ROOT_DIR}"

echo "==> 构建 ${IMAGE_NAME}:${TAG}"
docker build \
  -f scripts/deploy/Dockerfile \
  -t "${IMAGE_NAME}:${TAG}" \
  .

echo ""
echo "✅ 构建成功"
echo "   本地运行（需与 backend 同 Docker 网络）："
echo "   docker run -d -p 18080:8080 --network deploy_backend-network --name yunce-dashboard ${IMAGE_NAME}:${TAG}"
echo "   访问：http://127.0.0.1:18080/"
