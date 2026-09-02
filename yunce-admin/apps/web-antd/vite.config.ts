import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      optimizeDeps: {
        include: ['xe-utils', '@vxe-ui/core', 'dom-zindex'],
      },
      server: {
        proxy: {
          '/api/admin/v1': {
            changeOrigin: true,
            rewrite: (path) =>
              path.replace(/^\/api\/admin\/v1/, '/api/admin/v1'),
            target: 'http://localhost:3000',
            ws: true,
          },
        },
      },
    },
  };
});
