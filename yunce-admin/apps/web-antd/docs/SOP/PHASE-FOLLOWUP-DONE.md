# Admin 工程化 — 遗留项收口（覆盖率 + OperationTablePage）

- [x] `@vitest/coverage-v8` 已安装；`test:ci` 启用 `--coverage`
- [x] 覆盖率地板：api/core + dashboard-format + operation composables → lines/statements ≥40
- [x] `OperationTablePage` 公共壳落地；`audit-logs` 已接入示范
- [x] 单测覆盖壳存在性契约

命令：`pnpm run test:ci:antd` / `pnpm run verify:sop:fast`
