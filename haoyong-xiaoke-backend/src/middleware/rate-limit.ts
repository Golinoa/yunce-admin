import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

interface RateLimitOptions {
  windowMs?: number;   // 时间窗口（毫秒），默认 60000
  maxRequests?: number; // 窗口内最大请求数，默认 100
  keyGenerator?: (req: Request) => string;
  scope?: string;
}

const buildWindowStart = (now: Date, windowMs: number): Date => {
  const timestamp = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(timestamp);
};

const maybeCleanupExpiredBuckets = (): void => {
  if (Math.random() > 0.01) {
    return;
  }

  void prisma.rateLimitBucket.deleteMany({
    where: {
      expiresAt: { lte: new Date() },
    },
  }).catch(() => undefined);
};

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = 60000,
    maxRequests = 100,
    keyGenerator = (req: Request) => req.ip || 'unknown',
    scope = 'default',
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      maybeCleanupExpiredBuckets();

      const key = keyGenerator(req);
      const now = new Date();
      const windowStart = buildWindowStart(now, windowMs);
      const expiresAt = new Date(windowStart.getTime() + windowMs);

      const bucket = await prisma.rateLimitBucket.upsert({
        where: {
          scope_key_windowStart: {
            scope,
            key,
            windowStart,
          },
        },
        update: {
          count: { increment: 1 },
          expiresAt,
        },
        create: {
          scope,
          key,
          windowStart,
          expiresAt,
          count: 1,
        },
      });

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(maxRequests - bucket.count, 0));
      res.setHeader('X-RateLimit-Reset', expiresAt.toISOString());

      if (bucket.count > maxRequests) {
        res.status(429).json({
          code: 429,
          data: null,
          message: '请求过于频繁，请稍后再试',
        });
        return;
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// 预设：严格限流（登录/注册等敏感接口）
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  maxRequests: 10,
  scope: 'strict',
  keyGenerator: (req) => `strict:${req.ip}:${req.path}`,
});

// 预设：普通限流（一般 API）
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 100,
  scope: 'api',
});

// 预设：写操作限流（POST/PUT/DELETE）
export const writeRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 30,
  scope: 'write',
  keyGenerator: (req) => `write:${req.ip}`,
});

// 预设：导出限流（耗资源操作）
export const exportRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 5,
  scope: 'export',
  keyGenerator: (req) => `export:${req.ip}`,
});

// 预设：上传限流
export const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  maxRequests: 10,
  scope: 'upload',
  keyGenerator: (req) => `upload:${req.ip}`,
});
