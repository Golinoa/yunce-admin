# ADR-0003：运营页目录与测试同置

- Status: implemented
- Date: 2026-09-01
- Class: architecture

## Context

operation 页多为大 SFC，逻辑难测。需向后端「领域模块 + 同置测试」靠拢。

## Decision

推荐结构：

```text
views/operation/<domain>/
  index.vue
  components/
  composables/
  __tests__/   # 或抽到 src/__tests__ 对纯模块

views/dashboard/analytics/
  index.vue
  dashboard-format.ts   # 纯函数优先拆出
  components/           # 后续区块
```

硬规则：单文件建议 ≤400 行；超限拆 composable/components。

## Consequences

- 看板已先拆 `dashboard-format.ts` 作范例。
- 组织 CRUD 公共壳后续按此目录演进。
