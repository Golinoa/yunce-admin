import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import env from './env';

const createOptions = (
  title: string,
  description: string,
  serverPath: '/api/admin/v1' | '/api/app/v1' | '/api/v1',
  apis: string[],
): swaggerJsdoc.Options => ({
  definition: {
    openapi: '3.0.0',
    info: {
      title,
      version: '1.0.0',
      description,
    },
    servers: [
      {
        url: `${env.SERVER_PUBLIC_ORIGIN}${serverPath}`,
        description: '默认 API 服务器',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis,
});

const appSpecs = swaggerJsdoc(
  createOptions(
    '好用消课小程序 API',
    '小程序端 API 文档',
    '/api/app/v1',
    ['src/**/*.routes.ts', 'src/**/*.controller.ts', '!src/admin/**/*.ts'],
  ),
);

const adminSpecs = swaggerJsdoc(
  createOptions(
    '好用消课管理后台 API',
    '管理后台 API 文档',
    '/api/admin/v1',
    ['src/admin/**/*.routes.ts', 'src/admin/**/*.controller.ts'],
  ),
);

export const setupSwagger = (app: Express) => {
  app.get('/api-docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <title>好用消课接口文档</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #1f2329; }
      h1 { margin-bottom: 12px; }
      p { color: #4e5969; }
      ul { padding-left: 20px; }
      li { margin: 12px 0; }
      a { color: #1677ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <h1>好用消课接口文档</h1>
    <p>已按业务口径拆分为两组文档，请按需要选择查看。</p>
    <ul>
      <li><a href="/api-docs/app">小程序接口文档</a></li>
      <li><a href="/api-docs/admin">管理后台接口文档</a></li>
    </ul>
  </body>
</html>`);
  });

  app.use('/api-docs/app', swaggerUi.serveFiles(appSpecs), swaggerUi.setup(appSpecs));
  app.use('/api-docs/admin', swaggerUi.serveFiles(adminSpecs), swaggerUi.setup(adminSpecs));

  app.get('/api-docs/app.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(appSpecs);
  });

  app.get('/api-docs/admin.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(adminSpecs);
  });
};

export default setupSwagger;
