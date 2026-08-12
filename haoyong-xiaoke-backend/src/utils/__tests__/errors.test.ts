import { AppError, BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '../errors';

describe('Error Classes', () => {
  it('AppError should have correct properties', () => {
    const err = new AppError('test error', 400, 400);
    expect(err.message).toBe('test error');
    expect(err.code).toBe(400);
    expect(err.statusCode).toBe(400);
    expect(err.name).toBe('AppError');
  });

  it('BadRequestError should default to 400', () => {
    const err = new BadRequestError('bad request');
    expect(err.code).toBe(400);
    expect(err.statusCode).toBe(400);
  });

  it('UnauthorizedError should default to 401', () => {
    const err = new UnauthorizedError('unauthorized');
    expect(err.code).toBe(401);
    expect(err.statusCode).toBe(401);
  });

  it('ForbiddenError should default to 403', () => {
    const err = new ForbiddenError('forbidden');
    expect(err.code).toBe(403);
    expect(err.statusCode).toBe(403);
  });

  it('NotFoundError should default to 404', () => {
    const err = new NotFoundError('not found');
    expect(err.code).toBe(404);
    expect(err.statusCode).toBe(404);
  });

  it('ConflictError should default to 409', () => {
    const err = new ConflictError('conflict');
    expect(err.code).toBe(409);
    expect(err.statusCode).toBe(409);
  });
});
