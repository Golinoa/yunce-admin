import jwt, { SignOptions } from 'jsonwebtoken';
import env from '../config/env';
import { createId } from './id';

export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh'
}

export interface TokenPayload {
  profileId: string;
  userId: string;
  role: 'PRINCIPAL' | 'TEACHER' | 'PARENT';
  tokenType: TokenType;
  jti: string;
  sessionId: string;
  sessionVersion: number;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const ACCESS_TOKEN_EXPIRES_IN = '2h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';
const ACCESS_EXPIRES_SECONDS = 7200;

export const generateTokenPair = async (
  payload: Omit<TokenPayload, 'tokenType' | 'jti' | 'sessionId' | 'sessionVersion'>,
  existingSession?: { id: string; sessionVersion: number }
): Promise<TokenPair> => {
  const sessionId = existingSession?.id || createId();
  const sessionVersion = existingSession?.sessionVersion ?? 1;
  const accessJti = createId();
  const refreshJti = createId();

  const accessTokenPayload: TokenPayload = {
    ...payload,
    tokenType: TokenType.ACCESS,
    jti: accessJti,
    sessionId,
    sessionVersion
  };

  const refreshTokenPayload: TokenPayload = {
    ...payload,
    tokenType: TokenType.REFRESH,
    jti: refreshJti,
    sessionId,
    sessionVersion
  };

  const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions);
  const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions);

  return {
    accessToken,
    refreshToken,
    expiresIn: ACCESS_EXPIRES_SECONDS
  };
};

export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const verifyAccessToken = (token: string): TokenPayload => {
  const payload = verifyToken(token);
  if (payload.tokenType !== TokenType.ACCESS) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return payload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  const payload = verifyToken(token);
  if (payload.tokenType !== TokenType.REFRESH) {
    throw new jwt.JsonWebTokenError('Invalid token type');
  }
  return payload;
};

// 兼容旧代码
export const generateTokens = (payload: Omit<TokenPayload, 'tokenType' | 'jti' | 'sessionId' | 'sessionVersion'>): { token: string; refreshToken: string } => {
  const pair = generateTokenPairSync(payload);
  return {
    token: pair.accessToken,
    refreshToken: pair.refreshToken
  };
};

// 同步版本用于兼容性
const generateTokenPairSync = (
  payload: Omit<TokenPayload, 'tokenType' | 'jti' | 'sessionId' | 'sessionVersion'>
): { accessToken: string; refreshToken: string } => {
  const sessionId = createId();
  const accessJti = createId();
  const refreshJti = createId();

  const accessTokenPayload: TokenPayload = {
    ...payload,
    tokenType: TokenType.ACCESS,
    jti: accessJti,
    sessionId,
    sessionVersion: 1
  };

  const refreshTokenPayload: TokenPayload = {
    ...payload,
    tokenType: TokenType.REFRESH,
    jti: refreshJti,
    sessionId,
    sessionVersion: 1
  };

  const accessToken = jwt.sign(accessTokenPayload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN } as SignOptions);
  const refreshToken = jwt.sign(refreshTokenPayload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN } as SignOptions);

  return {
    accessToken,
    refreshToken
  };
};
