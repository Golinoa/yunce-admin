import { jest } from '@jest/globals';
import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../../middleware/auth';

type MockFn = any;

const mockSuccess = jest.fn() as MockFn;
const mockAddToBlacklist = jest.fn() as MockFn;
const mockCleanupBlacklist = jest.fn() as MockFn;
const mockVerifyAccessToken = jest.fn() as MockFn;
const mockRevokeSession = jest.fn() as MockFn;
const mockRevokeSessionByRefreshToken = jest.fn() as MockFn;

jest.mock('../../utils/response', () => ({
  success: mockSuccess,
}));

jest.mock('../../middleware/auth', () => ({
  addToBlacklist: mockAddToBlacklist,
  cleanupBlacklist: mockCleanupBlacklist,
}));

jest.mock('../../utils/jwt', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

jest.mock('../auth.service', () => ({
  revokeSession: mockRevokeSession,
  revokeSessionByRefreshToken: mockRevokeSessionByRefreshToken,
}));

import { logout } from '../auth.controller';
import { UnauthorizedError } from '../../utils/errors';

describe('auth.controller logout', () => {
  let next: NextFunction;
  let res: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    next = jest.fn();
    res = {};
  });

  it('revokes session from access token when authorization header exists', async () => {
    const req = {
      headers: { authorization: 'Bearer access-token' },
      body: {},
    } as AuthRequest;

    (mockVerifyAccessToken as MockFn).mockReturnValue({ sessionId: 'session-1' });
    (mockRevokeSession as MockFn).mockResolvedValue(undefined);

    await logout(req, res as Response, next);

    expect(mockAddToBlacklist).toHaveBeenCalledWith('access-token');
    expect(mockCleanupBlacklist).toHaveBeenCalled();
    expect(mockVerifyAccessToken).toHaveBeenCalledWith('access-token');
    expect(mockRevokeSession).toHaveBeenCalledWith('session-1');
    expect(mockRevokeSessionByRefreshToken).not.toHaveBeenCalled();
    expect(mockSuccess).toHaveBeenCalledWith(res, null, '退出成功');
    expect(next).not.toHaveBeenCalled();
  });

  it('revokes session from refresh token when access token is absent', async () => {
    const req = {
      headers: {},
      body: { refreshToken: 'refresh-token' },
    } as AuthRequest;

    (mockRevokeSessionByRefreshToken as MockFn).mockResolvedValue(undefined);

    await logout(req, res as Response, next);

    expect(mockAddToBlacklist).not.toHaveBeenCalled();
    expect(mockVerifyAccessToken).not.toHaveBeenCalled();
    expect(mockRevokeSession).not.toHaveBeenCalled();
    expect(mockRevokeSessionByRefreshToken).toHaveBeenCalledWith('refresh-token');
    expect(mockSuccess).toHaveBeenCalledWith(res, null, '退出成功');
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards unauthorized error when neither access token nor refresh token exists', async () => {
    const req = {
      headers: {},
      body: {},
    } as AuthRequest;

    await logout(req, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
