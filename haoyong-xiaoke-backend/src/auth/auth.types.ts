import { Role } from '@prisma/client';

export interface LoginInput {
  code: string;
  role: Role;
}

export interface WechatLoginInput {
  code: string;
  role: Role;
}

export interface PhoneLoginInput {
  phone: string;
  code: string;
  role: Role;
}

export interface SendSmsCodeInput {
  phone: string;
}

export interface RegisterInput {
  phone: string;
  role: Role;
  nickname?: string;
  avatar?: string;
  institution?: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface LogoutInput {
  refreshToken?: string;
}

export interface TokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TeacherInfo {
  id: string;
  inviteCode: string;
  institution: string | null;
  studentCount?: number;
  classCount?: number;
}

export interface ParentInfo {
  id: string;
  relation: string | null;
  bindStatus: string;
  student: {
    id: string;
    name: string;
  } | null;
}

export interface PrincipalInfo {
  id: string;
  institution: string | null;
  teacherCount?: number;
  studentCount?: number;
}

export interface UserInfo {
  id: string;
  profileId: string;
  nickname: string | null;
  role: Role;
  avatar: string | null;
  phone: string | null;
  teacher?: TeacherInfo;
  parent?: ParentInfo;
  principal?: PrincipalInfo;
}

export interface LoginResponse extends TokenResponse {
  isNewUser?: boolean;
  user: UserInfo;
}

export type RefreshResponse = TokenResponse;
