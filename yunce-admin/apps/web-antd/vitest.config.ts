import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));

/**
 * 产品面业务测试配置。
 * coverage 在本机装好 @vitest/coverage-v8 后可用 `test:ci --coverage` 打开。
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
  },
});
