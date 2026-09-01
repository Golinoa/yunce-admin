# Admin 工程化 — 列表壳批量接入 + ADR-0004

- [x] 单卡列表页接入 `OperationTablePage`：users / feedbacks / activation-codes / store-entry / system-versions / organizations（+ 既有 audit-logs）
- [x] ADR-0004：未用 UI 变体不进产品面（源码暂留、不进 CI）
- [ ] 多卡页（memberships / invites / contents / organization-versions）后续按区块渐进接入
- [ ] 表单设置页（notify / ses）不适用本壳

验证：`pnpm run check:type:antd` + `pnpm run test:ci:antd` + `pnpm run verify:sop:fast`
