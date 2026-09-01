import { defineConfig } from 'vitest/config';

/**
 * 产品面业务测试配置（Phase 1 起步）。
 * 覆盖率门槛在 Phase 2 升高；此处先保证门禁可跑。
 */
export default defineConfig({
  test: {
    name: 'web-antd',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    // coverage + threshold 在 Phase 2 启用（需 @vitest/coverage-v8）
  },
});
