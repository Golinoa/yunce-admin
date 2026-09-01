import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * 产品面业务测试 + 覆盖率地板（ADR-0002）
 */
export default defineConfig({
  resolve: {
    alias: {
      '#': path.resolve(root, 'src'),
    },
  },
  test: {
    name: 'web-antd',
    environment: 'node',
    include: ['src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/api/core/admin.ts',
        'src/api/core/organization.ts',
        'src/views/dashboard/analytics/dashboard-format.ts',
        'src/views/operation/composables/**/*.ts',
      ],
      thresholds: {
        lines: 40,
        functions: 30,
        branches: 30,
        statements: 40,
      },
    },
  },
});
