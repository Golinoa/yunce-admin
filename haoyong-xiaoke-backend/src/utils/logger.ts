import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { AsyncLocalStorage } from 'async_hooks';
import env from '../config/env';

const { combine, timestamp, json, errors, printf } = winston.format;

// ==================== traceId 链路追踪 ====================

// 使用 AsyncLocalStorage 在请求生命周期内传递 traceId
const asyncLocalStorage = new AsyncLocalStorage<Map<string, string>>();

/**
 * 获取当前请求的 traceId
 */
export const getTraceId = (): string | undefined => {
  const store = asyncLocalStorage.getStore();
  return store?.get('traceId');
};

/**
 * 获取当前请求的 userId
 */
export const getLogUserId = (): string | undefined => {
  const store = asyncLocalStorage.getStore();
  return store?.get('userId');
};

/**
 * 在请求上下文中运行，自动注入 traceId 和 userId
 */
export const runWithLogContext = <T>(
  traceId: string,
  userId: string | undefined,
  fn: () => T,
): T => {
  const store = new Map<string, string>();
  store.set('traceId', traceId);
  if (userId) store.set('userId', userId);
  return asyncLocalStorage.run(store, fn);
};

// ==================== 日志格式 ====================

// 注入 traceId 和 userId 到日志元数据
const injectContext = winston.format((info) => {
  const traceId = getTraceId();
  const userId = getLogUserId();
  if (traceId) info.traceId = traceId;
  if (userId) info.userId = userId;
  return info;
});

// 开发环境可读格式
const devFormat = printf(({ level, message, timestamp, traceId, userId, ...metadata }) => {
  const prefix = traceId ? `[${traceId}] ` : '';
  const userPrefix = userId ? `[${userId}] ` : '';
  const meta = Object.keys(metadata).length ? ` ${JSON.stringify(metadata, null, 2)}` : '';
  return `[${timestamp}] ${level}: ${prefix}${userPrefix}${message}${meta}`;
});

// ==================== 日志轮转配置 ====================

const dailyRotateOptions = {
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
};

// ==================== 创建 Logger ====================

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'haoyong-xiaoke-api' },
  format: combine(
    injectContext(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: combine(
        winston.format.colorize(),
        devFormat,
      ),
    }),
    // 错误日志（按天轮转，保留 30 天）
    new DailyRotateFile({
      filename: './logs/error-%DATE%.log',
      level: 'error',
      format: json(),
      ...dailyRotateOptions,
    }),
    // 全量日志（按天轮转，保留 30 天）
    new DailyRotateFile({
      filename: './logs/combined-%DATE%.log',
      format: json(),
      ...dailyRotateOptions,
    }),
  ],
});

export default logger;
