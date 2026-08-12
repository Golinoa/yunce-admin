import { jest } from '@jest/globals';
import type { Request, Response, NextFunction } from 'express';

type RateLimitBucket = { count: number };

const mockPrisma = {
  rateLimitBucket: {
    upsert: jest.fn<() => Promise<RateLimitBucket>>(),
    deleteMany: jest.fn<() => Promise<{ count: number }>>(),
  },
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

import { rateLimit } from '../rate-limit';

describe('Rate Limit Middleware', () => {
  const originalRandom = Math.random;

  beforeEach(() => {
    jest.clearAllMocks();
    Math.random = jest.fn(() => 1);
  });

  afterAll(() => {
    Math.random = originalRandom;
  });

  it('should allow request when bucket count is within limit', async () => {
    const middleware = rateLimit({ maxRequests: 2, windowMs: 60_000, scope: 'test' });
    const req = { ip: '127.0.0.1' } as Request;
    const res = {} as Response;
    res.setHeader = jest.fn(() => res);
    res.json = jest.fn(() => res);
    res.status = jest.fn(() => res);
    const next = jest.fn() as NextFunction;

    mockPrisma.rateLimitBucket.upsert.mockResolvedValue({ count: 1 });

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should reject request when bucket count exceeds limit', async () => {
    const json = jest.fn();
    const middleware = rateLimit({ maxRequests: 2, windowMs: 60_000, scope: 'test' });
    const req = { ip: '127.0.0.1' } as Request;
    const res = {} as Response;
    res.setHeader = jest.fn(() => res);
    res.json = json as Response['json'];
    res.status = jest.fn(() => res);
    const next = jest.fn() as NextFunction;

    mockPrisma.rateLimitBucket.upsert.mockResolvedValue({ count: 3 });

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
