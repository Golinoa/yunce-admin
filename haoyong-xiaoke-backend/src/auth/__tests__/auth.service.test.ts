import { jest } from '@jest/globals';
import { Role } from '@prisma/client';
import { ConflictError, UnauthorizedError } from '../../utils/errors';

type MockFn = any;

const mockGenerateTokenPair = jest.fn() as MockFn;
const mockVerifyRefreshToken = jest.fn() as MockFn;

const mockPrisma = {
  profile: {
    findUnique: jest.fn() as MockFn,
    findFirst: jest.fn() as MockFn,
    create: jest.fn() as MockFn,
  },
  teacher: {
    create: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
  },
  student: {
    count: jest.fn() as MockFn,
  },
  class: {
    count: jest.fn() as MockFn,
  },
  studentParent: {
    create: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
  },
  authSession: {
    create: jest.fn() as MockFn,
    update: jest.fn() as MockFn,
    updateMany: jest.fn() as MockFn,
  },
  smsVerificationCode: {
    upsert: jest.fn() as MockFn,
    findUnique: jest.fn() as MockFn,
    updateMany: jest.fn() as MockFn,
  },
  $transaction: jest.fn() as MockFn,
};

jest.mock('../../config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../utils/jwt', () => ({
  generateTokens: jest.fn(),
  generateTokenPair: mockGenerateTokenPair,
  verifyRefreshToken: mockVerifyRefreshToken,
}));

import * as authService from '../auth.service';

const fullProfile = {
  id: 'profile-1',
  openId: 'mock_openid_test',
  unionId: 'mock_unionid_test',
  role: Role.TEACHER,
  nickname: '测试教师',
  phone: null,
  avatar: null,
  teacher: { id: 'teacher-1', profileId: 'profile-1', inviteCode: 'invite-1', institution: null },
  parent: null,
};

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (mockPrisma.$transaction as MockFn).mockImplementation(async (callback: (tx: typeof mockPrisma) => unknown) => callback(mockPrisma));
    (mockPrisma.authSession.create as MockFn).mockResolvedValue({ id: 'session-1', sessionVersion: 1 });
    (mockPrisma.authSession.update as MockFn).mockResolvedValue({ id: 'session-1' });
    (mockPrisma.authSession.updateMany as MockFn).mockResolvedValue({ count: 1 });
    (mockGenerateTokenPair as MockFn).mockResolvedValue({
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh',
      expiresIn: 7200,
    });
    (mockVerifyRefreshToken as MockFn).mockReturnValue({
      jti: 'refresh-jti',
      sessionId: 'session-1',
      sessionVersion: 1,
      profileId: 'profile-1',
      userId: 'teacher-1',
      role: Role.TEACHER,
      tokenType: 'refresh',
    });
    (mockPrisma.student.count as MockFn).mockResolvedValue(3);
    (mockPrisma.class.count as MockFn).mockResolvedValue(2);
    (mockPrisma.smsVerificationCode.upsert as MockFn).mockResolvedValue({ id: 'sms-1' });
    (mockPrisma.smsVerificationCode.findUnique as MockFn).mockResolvedValue({
      id: 'sms-1',
      phone: '13800138000',
      codeHash: 'invalid',
      expiresAt: new Date(Date.now() + 60_000),
      consumedAt: null,
      failedAttempts: 0,
    });
    (mockPrisma.smsVerificationCode.updateMany as MockFn).mockResolvedValue({ count: 0 });
  });

  describe('wechatLogin', () => {
    it('should create new user when not exists', async () => {
      (mockPrisma.profile.findUnique as MockFn)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(fullProfile);
      (mockPrisma.profile.create as MockFn).mockResolvedValue({
        id: 'profile-1',
        openId: 'mock_openid_test',
        unionId: 'mock_unionid_test',
        role: Role.TEACHER,
        teacher: null,
        parent: null,
      });
      (mockPrisma.teacher.create as MockFn).mockResolvedValue({ id: 'teacher-1', profileId: 'profile-1' });

      const result = await authService.wechatLogin({ code: 'test', role: Role.TEACHER });

      expect(result.isNewUser).toBe(true);
      expect(result.token).toBe('mock-token');
      expect(result.refreshToken).toBe('mock-refresh');
      expect(mockPrisma.authSession.create).toHaveBeenCalled();
      expect(result.user.role).toBe(Role.TEACHER);
    });

    it('should return existing user', async () => {
      (mockPrisma.profile.findUnique as MockFn)
        .mockResolvedValueOnce({
          id: 'profile-1',
          openId: 'mock_openid_test',
          unionId: 'mock_unionid_test',
          role: Role.TEACHER,
          teacher: { id: 'teacher-1' },
          parent: null,
        })
        .mockResolvedValueOnce(fullProfile);

      const result = await authService.wechatLogin({ code: 'test', role: Role.TEACHER });

      expect(result.isNewUser).toBeFalsy();
      expect(result.user.role).toBe(Role.TEACHER);
    });
  });

  describe('phoneRegister', () => {
    it('should throw ConflictError when phone exists', async () => {
      (mockPrisma.profile.findUnique as MockFn).mockResolvedValue({ id: 'existing' });

      await expect(
        authService.phoneRegister({
          phone: '13800138000',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(ConflictError);

      expect(mockPrisma.authSession.create).not.toHaveBeenCalled();
    });
  });

  describe('sms code', () => {
    it('should persist sms code to database', async () => {
      const result = await authService.sendSmsCode('13800138000');

      expect(result.sent).toBe(true);
      expect(mockPrisma.smsVerificationCode.upsert).toHaveBeenCalled();
    });

    it('should reject phone login when sms code is invalid', async () => {
      await expect(
        authService.phoneLogin({
          phone: '13800138000',
          code: '123456',
          role: Role.TEACHER,
        }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('refreshTokens', () => {
    it('should reject refresh token when session revoke fails', async () => {
      (mockVerifyRefreshToken as MockFn).mockReturnValue({
        jti: 'refresh-jti',
        sessionId: 'session-1',
        sessionVersion: 1,
        profileId: 'profile-1',
        userId: 'teacher-1',
        role: Role.TEACHER,
        tokenType: 'refresh',
      });
      (mockPrisma.authSession.updateMany as MockFn).mockResolvedValue({ count: 0 });

      await expect(authService.refreshTokens('refresh-token')).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('revokeSessionByRefreshToken', () => {
    it('should revoke session when refresh token is valid', async () => {
      (mockVerifyRefreshToken as MockFn).mockReturnValue({
        jti: 'refresh-jti',
        sessionId: 'session-1',
        sessionVersion: 1,
        profileId: 'profile-1',
        userId: 'teacher-1',
        role: Role.TEACHER,
        tokenType: 'refresh',
      });

      await authService.revokeSessionByRefreshToken('refresh-token');

      expect(mockPrisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it('should reject invalid refresh token when revoking session', async () => {
      (mockVerifyRefreshToken as MockFn).mockImplementation(() => {
        throw new Error('invalid');
      });

      await expect(authService.revokeSessionByRefreshToken('invalid-refresh-token')).rejects.toThrow(UnauthorizedError);
    });
  });
});
