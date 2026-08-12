import { jest } from '@jest/globals';
import { Response, NextFunction } from 'express';

type MockFn = any;

const mockPrisma = {
  authSession: {
    findUnique: jest.fn() as MockFn,
  },
  profile: {
    findUnique: jest.fn() as MockFn,
  },
};

const mockVerifyAccessToken = jest.fn() as MockFn;

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../utils/jwt', () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

import { requireAuth, requireRole, addToBlacklist, isBlacklisted, cleanupBlacklist } from '../auth';
import { AuthRequest } from '../auth';

describe('Auth Middleware', () => {
  describe('requireRole', () => {
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

    it('should allow access for authorized role', () => {
      const mockReq = {
        user: { id: '1', profileId: 'p1', role: 'TEACHER' as const, sessionId: 's1', sessionVersion: 1 },
      } as AuthRequest;

      const middleware = requireRole(['TEACHER', 'PRINCIPAL']);
      middleware(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockStatus).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      const mockReq = {
        user: { id: '1', profileId: 'p1', role: 'PARENT' as const, sessionId: 's1', sessionVersion: 1 },
      } as AuthRequest;

      const middleware = requireRole(['TEACHER', 'PRINCIPAL']);
      middleware(mockReq, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 when no user', () => {
      const mockReq = {} as AuthRequest;

      const middleware = requireRole(['TEACHER']);
      middleware(mockReq, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
    });
  });

  describe('Token Blacklist', () => {
    it('should add token to blacklist', () => {
      // 使用一个模拟的 JWT（格式：header.payload.signature）
      const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake';
      addToBlacklist(fakeToken);
      expect(isBlacklisted(fakeToken)).toBe(true);
    });

    it('should return false for non-blacklisted token', () => {
      expect(isBlacklisted('non-existent-token')).toBe(false);
    });

    it('should cleanup expired tokens', () => {
      // 手动添加一个已过期的 token
      const fakeToken = 'eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.fake';
      addToBlacklist(fakeToken);
      // exp=1 表示 1970-01-01，已过期
      cleanupBlacklist();
      expect(isBlacklisted(fakeToken)).toBe(false);
    });
  });

  describe('requireAuth', () => {
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

    it('should reject revoked session token', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer valid-token' },
      } as AuthRequest;

      (mockVerifyAccessToken as MockFn).mockReturnValue({
        profileId: 'profile-1',
        userId: 'teacher-1',
        role: 'TEACHER',
        sessionId: 'session-1',
        sessionVersion: 1,
      });
      (mockPrisma.authSession.findUnique as MockFn).mockResolvedValue({
        id: 'session-1',
        profileId: 'profile-1',
        sessionVersion: 1,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 1000),
      });

      await requireAuth(mockReq, mockRes as Response, mockNext);

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow active session token', async () => {
      const mockReq = {
        headers: { authorization: 'Bearer valid-token' },
      } as AuthRequest;

      (mockVerifyAccessToken as MockFn).mockReturnValue({
        profileId: 'profile-1',
        userId: 'teacher-1',
        role: 'TEACHER',
        sessionId: 'session-1',
        sessionVersion: 1,
      });
      (mockPrisma.authSession.findUnique as MockFn).mockResolvedValue({
        id: 'session-1',
        profileId: 'profile-1',
        sessionVersion: 1,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000),
      });
      (mockPrisma.profile.findUnique as MockFn).mockResolvedValue({
        id: 'profile-1',
        role: 'TEACHER',
      });

      await requireAuth(mockReq, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user?.sessionId).toBe('session-1');
    });
  });
});
