import jwt from 'jsonwebtoken';
import { generateTokens, verifyAccessToken, verifyRefreshToken, verifyToken, TokenType } from '../jwt';
import env from '../../config/env';

describe('JWT Utils', () => {
  const payload = {
    profileId: 'profile-1',
    userId: 'user-1',
    role: 'TEACHER' as const,
  };

  it('generateTokens should return token and refreshToken', () => {
    const result = generateTokens(payload);
    expect(result.token).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    const decoded = jwt.verify(result.token, env.JWT_SECRET) as jwt.JwtPayload;
    expect(decoded.profileId).toBe(payload.profileId);
    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.role).toBe(payload.role);
    expect(decoded.tokenType).toBe(TokenType.ACCESS);
  });

  it('verifyToken should decode valid token', () => {
    const token = jwt.sign(
      {
        ...payload,
        tokenType: TokenType.ACCESS,
        jti: 'test-jti',
        sessionId: 'test-session',
        sessionVersion: 1
      },
      env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const decoded = verifyToken(token);
    expect(decoded.profileId).toBe(payload.profileId);
  });

  it('verifyToken should throw on invalid token', () => {
    expect(() => verifyToken('invalid-token')).toThrow();
  });

  it('verifyRefreshToken should reject access token', () => {
    const result = generateTokens(payload);

    expect(() => verifyRefreshToken(result.token)).toThrow('Invalid token type');
  });

  it('verifyAccessToken should reject refresh token', () => {
    const result = generateTokens(payload);

    expect(() => verifyAccessToken(result.refreshToken)).toThrow('Invalid token type');
  });
});
