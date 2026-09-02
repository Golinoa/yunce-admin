# 运营端历史阻塞项收口（对照 2026-09-01 画布）

> 画布：`ops-product-blockers.canvas.tsx`（产品视角快照，非活 backlog）  
> 收口日期：2026-09-03

| 原项 | 原级 | 现状 | 证据 |
|------|------|------|------|
| SUPPORT 菜单/API 未按角色过滤 | P0 | **已关** | `c74ec2e` hide SUPPORT-only UI；后端 RBAC 报告同期落地 |
| 生产 `VITE_APP_STORE_SECURE_KEY` 占位 | P0 | **工程闸已关**；Secret 仍需仓库配置一次 | Docker `assert-store-secure-key`；release 拒空/占位/过短；本地脚本强制 env；运行时 `initStores` 再拦 |
| refresh token 关闭 | P1 | **已关** | `6294517` P1 ops hardening |
| `/workspace` 死页 | P1 | **已关** | ADR-0005 + 路由移除 |
| 高危写二次确认不全 | P1 | **已关** | confirmAction 批次 + OPC 包 |
| organization-packages API 无 FE | P1 | **已关/无消费者** | web-antd 无引用；不建页 |

## 你还需要手动做的一件事

在 **yunce-back 对应 GitHub 仓库** 配置 Actions Secret：

1. Settings → Secrets and variables → Actions  
2. Name: `VITE_APP_STORE_SECURE_KEY`  
3. Value: 随机串 ≥16（**不要**用 `please-replace-me-with-your-own-key`）

未配置时打 `dashboard-v*` 会失败——这是预期，避免带病发版。
