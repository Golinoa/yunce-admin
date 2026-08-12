# [OPEN] debug-admin-unreachable

## Background
- Symptom: 后台打不开
- Scope: `haoyong-xiaoke-admin`
- StartedAt: 2026-06-23

## Hypotheses
1. 前端开发服务器未启动，`http://localhost:5666/` 无监听。
2. 前端开发服务器启动失败，`pnpm`/`vite` 执行链路异常。
3. 前端页面可访问，但接口代理目标 `http://localhost:3000` 不可用导致初始化失败。
4. 前端存在运行时错误，导致页面白屏或无法进入后台。

## Evidence Log
- `http://127.0.0.1:5666/` initially unreachable: "无法连接到远程服务器"
- Local port `5666` had no listener
- `http://127.0.0.1:3000/api-docs` returned `200`
- Local port `3000` was listening
- Restarted frontend with `corepack pnpm exec vite --mode development --host 0.0.0.0 --port 5666`
- After restart, `http://127.0.0.1:5666/` returned `200`
- User requested fixed port `10086`
- Updated `apps/web-antd/.env.development`: `VITE_PORT=10086`
- Restarted frontend on `http://127.0.0.1:10086/`
- Verified `http://127.0.0.1:10086/` returned `200`

## Actions
- Confirmed issue was frontend dev server not running
- Restarted admin frontend server
- Switched admin frontend dev port to fixed `10086`
- Left debug session open pending user verification

## Conclusion
- Current root cause: admin frontend service was not running; backend remained healthy on `3000`. Dev port is now fixed to `10086`
