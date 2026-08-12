import jwt, { SignOptions } from 'jsonwebtoken';
import env from '../config/env';
import { createId } from './id';

export enum AdminTokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
}

export interface AdminTokenPayload {
  adminUserId: string;
  role: 'ADMIN';
  tokenType: AdminTokenType;
  jti: string;
  sessionId: string;
  sessionVersion: number;
}

export interface AdminTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_EXPIRES_SECONDS = 7200;

export const generateAdminTokenPair = async (
  payload: Pick<AdminTokenPayload, 'adminUserId' | 'role'>,
  existingSession?: { id: string; sessionVersion: number },
): Promise<AdminTokenPair> => {
  const sessionId = existingSession?.id ?? createId();
  const sessionVersion = existingSession?.sessionVersion ?? 1;

  const accessPayload: AdminTokenPayload = {
    ...payload,
    tokenType: AdminTokenType.ACCESS,
    jti: createId(),
    sessionId,
    sessionVersion,
  };

  const refreshPayload: AdminTokenPayload = {
    ...payload,
    tokenType: AdminTokenType.REFRESH,
    jti: createId(),
    sessionId,
    sessionVersion,
  };

  const accessToken = jwt.sign(accessPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);
  const refreshToken = jwt.sign(refreshPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as SignOptions);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_SECONDS,
  };
};

export const verifyAdminToken = (token: string): AdminTokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as AdminTokenPayload;
};

export const verifyAdminAccessToken = (token: string): AdminTokenPayload => {
  const payload = verifyAdminToken(token);
  if (payload.tokenType !== AdminTokenType.ACCESS) {
    throw new jwt.JsonWebTokenError('Invalid admin access token type');
  }
  return payload;
};

export const verifyAdminRefreshToken = (token: string): AdminTokenPayload => {
  const payload = verifyAdminToken(token);
  if (payload.tokenType !== AdminTokenType.REFRESH) {
    throw new jwt.JsonWebTokenError('Invalid admin refresh token type');
  }
  return payload;
};
