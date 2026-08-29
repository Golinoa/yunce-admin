# ============================================
# 云策运营后台 (yunce-dashboard) 生产镜像
# 构建：apps/web-antd → nginx 静态托管 + /api 反代 backend
# ============================================

FROM node:24.20.0-slim AS builder

ARG DASHBOARD_VERSION=1.0.4
ENV VITE_DASHBOARD_VERSION=$DASHBOARD_VERSION

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS=--max-old-space-size=8192
ENV TZ=Asia/Shanghai
ENV CI=true

RUN npm i -g corepack

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY internal ./internal
COPY packages ./packages
COPY scripts ./scripts
COPY apps/web-antd ./apps/web-antd

RUN --mount=type=cache,id=yunce-admin-pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

RUN pnpm run build:antd

# ============================================
FROM nginx:1.25-alpine AS production

RUN echo "types { application/javascript js mjs; }" > /etc/nginx/conf.d/mjs.conf \
    && rm -rf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/apps/web-antd/dist /usr/share/nginx/html
COPY scripts/deploy/nginx.conf /etc/nginx/nginx.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
