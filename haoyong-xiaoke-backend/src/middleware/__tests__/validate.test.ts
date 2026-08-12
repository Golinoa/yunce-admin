import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { validate } from '../validate';
import { z } from 'zod';

describe('Validate Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let mockStatus: jest.Mock;
  let mockJson: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockJson = jest.fn();
    mockStatus = jest.fn(() => ({ json: mockJson }));
    mockRes = { status: mockStatus } as Partial<Response>;
    mockNext = jest.fn();
  });

  it('should pass validation with valid body', () => {
    const bodySchema = z.object({ name: z.string(), age: z.number() });
    mockReq = { body: { name: 'test', age: 20 } } as Partial<Request>;

    const middleware = validate({ body: bodySchema });
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockStatus).not.toHaveBeenCalled();
  });

  it('should return 400 with invalid body', () => {
    const bodySchema = z.object({ name: z.string(), age: z.number() });
    mockReq = { body: { name: 123, age: 'not-a-number' } } as Partial<Request>;

    const middleware = validate({ body: bodySchema });
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should validate query params', () => {
    const querySchema = z.object({ page: z.coerce.number().min(1) });
    mockReq = { query: { page: '2' } } as Partial<Request>;

    const middleware = validate({ query: querySchema });
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockReq.query).toEqual({ page: 2 });
  });

  it('should validate path params', () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    mockReq = { params: { id: '550e8400-e29b-41d4-a716-446655440000' } } as Partial<Request>;

    const middleware = validate({ params: paramsSchema });
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should return 400 with invalid path params', () => {
    const paramsSchema = z.object({ id: z.string().uuid() });
    mockReq = { params: { id: 'not-a-uuid' } } as Partial<Request>;

    const middleware = validate({ params: paramsSchema });
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockStatus).toHaveBeenCalledWith(400);
  });

  it('should skip validation when no schema provided', () => {
    mockReq = { body: {}, query: {}, params: {} } as Partial<Request>;

    const middleware = validate({});
    middleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
