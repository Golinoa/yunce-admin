import { Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { runWithLogContext } from '../utils/logger';
import { createId } from '../utils/id';
import type { AuthRequest } from './auth';

/**
 * 请求日志中间件
 * - 为每个请求生成 traceId
 * - 记录请求方法、路径、状态码、耗时
 * - 自动注入 traceId 和 userId 到日志上下文
 */
export const requestLogger = (req: AuthRequest, res: Response, next: NextFunction) => {
  const traceIdHeader = req.headers['x-trace-id'];
  const traceId = typeof traceIdHeader === 'string' && traceIdHeader.length > 0
    ? traceIdHeader
    : createId();
  const userId = req.user?.id;

  // 将 traceId 写入响应头，方便前端排查问题
  res.setHeader('X-Trace-Id', traceId);

  const start = Date.now();

  // 在日志上下文中运行后续中间件和路由处理
  runWithLogContext(traceId, userId, () => {
    res.on('finish', () => {
      const duration = Date.now() - start;
      const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

      logger.log(level, 'HTTP Request', {
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
    });

    next();
  });
};
