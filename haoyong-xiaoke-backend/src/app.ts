import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import adminRoutes from './admin/admin.routes';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { apiRateLimit } from './middleware/rate-limit';
import { xssSanitizer } from './middleware/xssSanitizer';
import { setupSwagger } from './config/swagger';
import env from './config/env';
import { leadPublicRoutes } from './lead';
import sslCertRoutes from './config/ssl-cert.routes';

const app = express();

// 安全中间件
app.use(helmet());

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || env.CORS_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  credentials: true,
}));

// 请求日志
app.use(morgan('dev'));
app.use(requestLogger);

// 解析请求体
app.use(express.json({ limit: '10mb' }));

// XSS 防护 - 转义请求体中的 HTML 特殊字符
app.use(xssSanitizer);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件（上传的图片）
app.use('/uploads', express.static(env.UPLOAD_DIR));

// Swagger / OpenAPI 文档
if (env.ENABLE_API_DOCS) {
  setupSwagger(app);
}

// API 路由（全局限流）
// 小程序端显式走 app 口径，保留旧版 /api/v1 作为兼容入口。
app.use('/api/app/v1', apiRateLimit, routes);
app.use('/api/v1', apiRateLimit, routes);
app.use('/api/admin/v1', apiRateLimit, adminRoutes);

// 公开的试听线索落地页路由（无需认证）
app.use('/api/app/v1/leads', leadPublicRoutes);

// SSL 证书管理路由
app.use('/api/app/v1/ssl-cert', sslCertRoutes);

// 健康检查
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    data: null,
    message: `接口不存在：${req.method} ${req.path}`,
  });
});

// 全局错误处理
app.use(errorHandler);

const PORT = env.PORT;
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`📊 环境：${env.NODE_ENV}`);
  if (env.ENABLE_API_DOCS) {
    console.log(`📚 API 文档入口：${env.SERVER_PUBLIC_ORIGIN}/api-docs`);
    console.log(`📚 小程序文档：${env.SERVER_PUBLIC_ORIGIN}/api-docs/app`);
    console.log(`📚 后台文档：${env.SERVER_PUBLIC_ORIGIN}/api-docs/admin`);
  }
});

export default app;
