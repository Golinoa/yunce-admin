# ADR-0002：业务 Vitest 与覆盖率地板

- Status: implemented
- Date: 2026-09-01
- Class: testing

## Context

产品面曾无业务测试。后端用 Jest coverage floors；Admin 采用 Vitest。

## Decision

1. 业务测试放在 `apps/web-antd`：`src/**/*.{test,spec}.ts`。
2. 门禁命令：`pnpm run test:ci:antd`（纳入 `verify:sop`）。
3. 覆盖率：先保证契约/纯函数测试可跑；`@vitest/coverage-v8` 就绪后对 `src/api/core/**` 设 lines≥40，禁止静默下调。
4. 新增 API / 关键 composable 必须带测试。

## Consequences

- CI 与本地共享同一测试入口。
- 覆盖率升高需另开 ADR 修订数字。
