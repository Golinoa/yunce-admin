# 推送前检查（Admin / web-antd）

对齐后端 `PRE-PUSH-CHECKS.md`：按改动范围跑**最小证据**，大改再跑全量 `verify:sop`。

## 范围 → 命令

| 改动范围 | 最小证据 |
|----------|----------|
| 仅文档 `docs/SOP` / `AGENTS.md` | 无强制；建议读一遍链接是否有效 |
| 仅 `apps/web-antd/src/**` | `pnpm run check:type:antd` + `test:ci:antd` |
| 路由 / 环境 / Dockerfile / CI | `pnpm run check:compat` + `check:env` + `check:type:antd` |
| 不确定范围 | `pnpm run verify:scope` 打印建议，再执行 |
| 发版候选 / 跨模块大改 | `pnpm run verify:sop` |

## 推送前报告模板

```text
范围: <source|tests|docs|config>
命令: <实际执行的命令>
结果: PASS / FAIL
备注:
```

## 标签提醒

- 只验门禁：`ci-*`（兼容 `dashboard-ci-*`）
- 正式发版：`vX.Y.Z`（兼容 `dashboard-v*`；见 RELEASE-TEST-SOP.md）
