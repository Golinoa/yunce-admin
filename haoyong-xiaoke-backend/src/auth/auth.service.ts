import { Role } from '@prisma/client';
import { createHash } from 'crypto';
import { prisma } from '../config/database';
import { verifyRefreshToken, generateTokenPair } from '../utils/jwt';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import type {
  LoginInput,
  RegisterInput,
  LoginResponse,
  RefreshResponse,
  UserInfo,
  TeacherInfo,
  ParentInfo,
  PrincipalInfo,
  PhoneLoginInput,
} from './auth.types';

const SMS_CODE_EXPIRES_MS = 5 * 60 * 1000;
const MAX_SMS_VERIFY_ATTEMPTS = 5;

// 生成 6 位随机验证码
const generateSmsCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashSmsCode = (phone: string, code: string): string => {
  return createHash('sha256').update(`${phone}:${code}`).digest('hex');
};

// 发送短信验证码（Mock 实现）
export const sendSmsCode = async (phone: string): Promise<{ sent: boolean }> => {
  const code = generateSmsCode();
  const expiresAt = new Date(Date.now() + SMS_CODE_EXPIRES_MS);

  await prisma.smsVerificationCode.upsert({
    where: { phone },
    update: {
      codeHash: hashSmsCode(phone, code),
      expiresAt,
      consumedAt: null,
      failedAttempts: 0,
    },
    create: {
      phone,
      codeHash: hashSmsCode(phone, code),
      expiresAt,
    },
  });

  // Mock：实际应调用短信服务商 API，这里避免记录明文验证码
  const maskedPhone = `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  console.log(`[Mock SMS] 已向 ${maskedPhone} 发送验证码`);

  return { sent: true };
};

// 校验验证码
const verifySmsCode = async (phone: string, code: string): Promise<boolean> => {
  const stored = await prisma.smsVerificationCode.findUnique({
    where: { phone },
  });

  if (!stored || stored.consumedAt || stored.expiresAt <= new Date()) {
    return false;
  }

  if (stored.failedAttempts >= MAX_SMS_VERIFY_ATTEMPTS) {
    return false;
  }

  const codeHash = hashSmsCode(phone, code);
  if (stored.codeHash !== codeHash) {
    await prisma.smsVerificationCode.updateMany({
      where: {
        phone,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        failedAttempts: { increment: 1 },
      },
    });
    return false;
  }

  const consumeResult = await prisma.smsVerificationCode.updateMany({
    where: {
      phone,
      codeHash,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: {
      consumedAt: new Date(),
    },
  });

  return consumeResult.count === 1;
};

// ==================== Mock 微信登录 ====================

const mockWechatLogin = (code: string): { openId: string; unionId: string } => {
  return {
    openId: `mock_openid_${code}`,
    unionId: `mock_unionid_${code}`,
  };
};

// ==================== 统一的用户初始化事务方法 ====================

async function initializeUserWithTransaction(
  profileData: { openId?: string | null; unionId?: string | null; phone?: string | null; role: Role; nickname?: string | null; avatar?: string | null },
  role: Role,
  institution?: string | null,
  options?: {
    allowExisting?: boolean;
  },
): Promise<{
  profile: any;
  userId: string;
  isNewUser: boolean;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  return prisma.$transaction(async (tx) => {
    const allowExisting = options?.allowExisting ?? true;

    // 查找或创建 Profile
    let profile;
    let isNewUser = false;

    if (profileData.phone) {
      profile = await tx.profile.findUnique({
        where: { phone: profileData.phone },
        include: { teacher: true, parent: true },
      });
    } else if (profileData.openId) {
      profile = await tx.profile.findUnique({
        where: { openId: profileData.openId },
        include: { teacher: true, parent: true },
      });
    }

    if (!profile) {
      // 创建新用户
      profile = await tx.profile.create({
        data: profileData,
        include: { teacher: true, parent: true },
      });
      isNewUser = true;

      // 根据角色创建业务记录
      if (role === Role.TEACHER) {
        const teacher = await tx.teacher.create({
          data: {
            profileId: profile.id,
            institution: institution ?? null,
          },
        });
        profile.teacher = teacher;
      } else if (role === Role.PARENT) {
        const parent = await tx.studentParent.create({
          data: {
            profileId: profile.id,
          },
        });
        profile.parent = parent;
      }
    } else if (!allowExisting) {
      throw new ConflictError('手机号已注册');
    } else if (profile.role !== role) {
      // 已有用户但角色不匹配，禁止切换角色
      const roleTextMap: Record<string, string> = {
        TEACHER: '教师',
        PARENT: '家长',
        PRINCIPAL: '校长',
      };
      throw new ConflictError(`该账号已注册为${roleTextMap[profile.role] || profile.role}，无法切换角色`);
    }

    // 获取业务 ID
    let userId: string;
    if (profile.role === Role.TEACHER) {
      // 如果 teacher 不存在但角色是 TEACHER，说明是旧数据，需要创建
      if (!profile.teacher) {
        const teacher = await tx.teacher.create({
          data: {
            profileId: profile.id,
            institution: institution ?? null,
          },
        });
        profile.teacher = teacher;
      }
      userId = profile.teacher.id;
    } else if (profile.role === Role.PARENT) {
      // 如果 parent 不存在但角色是 PARENT，说明是旧数据，需要创建
      if (!profile.parent) {
        const parent = await tx.studentParent.create({
          data: {
            profileId: profile.id,
          },
        });
        profile.parent = parent;
      }
      userId = profile.parent.id;
    } else {
      userId = profile.id; // PRINCIPAL 直接使用 profileId
    }

    // 创建会话
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const session = await tx.authSession.create({
      data: {
        profileId: profile.id,
        refreshTokenJti: '',
        expiresAt
      }
    });

    // 生成 token 对
    const pair = await generateTokenPair(
      {
        profileId: profile.id,
        userId,
        role: profile.role as 'TEACHER' | 'PARENT' | 'PRINCIPAL'
      },
      { id: session.id, sessionVersion: session.sessionVersion }
    );

    // 更新会话的 refreshTokenJti
    const newPayload = verifyRefreshToken(pair.refreshToken);
    await tx.authSession.update({
      where: { id: session.id },
      data: { refreshTokenJti: newPayload.jti }
    });

    return {
      profile,
      userId,
      isNewUser,
      ...pair
    };
  });
}

// ==================== 构建用户信息 ====================

const buildUserInfo = async (profileId: string): Promise<UserInfo> => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      teacher: true,
      parent: true,
    },
  });

  if (!profile) {
    throw new UnauthorizedError('用户不存在');
  }

  const baseInfo: UserInfo = {
    id: profile.id,
    profileId: profile.id,
    nickname: profile.nickname,
    role: profile.role,
    avatar: profile.avatar,
    phone: profile.phone,
  };

  if (profile.role === Role.PRINCIPAL) {
    // PRINCIPAL 角色统计：该机构下教师数和学生数
    const [teacherCount, studentCount] = await Promise.all([
      prisma.teacher.count({ where: { status: 'active' } }),
      prisma.student.count({ where: { status: 'ACTIVE' } }),
    ]);

    const principalInfo: PrincipalInfo = {
      id: profile.id,
      institution: null,
      teacherCount,
      studentCount,
    };

    return { ...baseInfo, principal: principalInfo };
  }

  if (profile.role === Role.TEACHER && profile.teacher) {
    const studentCount = await prisma.student.count({
      where: { teacherId: profile.teacher.id },
    });
    const classCount = await prisma.class.count({
      where: { teacherId: profile.teacher.id },
    });

    const teacherInfo: TeacherInfo = {
      id: profile.teacher.id,
      inviteCode: profile.teacher.inviteCode,
      institution: profile.teacher.institution,
      studentCount,
      classCount,
    };

    return { ...baseInfo, id: profile.teacher.id, teacher: teacherInfo };
  }

  if (profile.role === Role.PARENT && profile.parent) {
    const parentWithStudent = await prisma.studentParent.findUnique({
      where: { id: profile.parent.id },
      include: {
        student: {
          select: { id: true, name: true },
        },
      },
    });

    const parentInfo: ParentInfo = {
      id: profile.parent.id,
      relation: profile.parent.relation,
      bindStatus: profile.parent.bindStatus,
      student: parentWithStudent?.student ?? null,
    };

    return { ...baseInfo, id: profile.parent.id, parent: parentInfo };
  }

  return baseInfo;
};

// ==================== 微信登录 ====================

export const wechatLogin = async (input: LoginInput): Promise<LoginResponse> => {
  const { code, role } = input;

  // Mock 微信登录
  const { openId, unionId } = mockWechatLogin(code);

  // 使用统一的用户初始化事务
  const { profile, userId, isNewUser, accessToken, refreshToken, expiresIn } = await initializeUserWithTransaction(
    { openId, unionId, role },
    role
  );

  const user = await buildUserInfo(profile.id);

  return {
    token: accessToken,
    refreshToken,
    expiresIn,
    ...(isNewUser && { isNewUser }),
    user,
  };
};

// ==================== 手机号注册 ====================

export const phoneRegister = async (input: RegisterInput): Promise<LoginResponse> => {
  const { phone, role, nickname, avatar, institution } = input;

  // 使用统一的用户初始化事务
  const { profile, userId, accessToken, refreshToken, expiresIn } = await initializeUserWithTransaction(
    { phone, role, nickname: nickname ?? null, avatar: avatar ?? null },
    role,
    institution,
    { allowExisting: false },
  );

  const user = await buildUserInfo(profile.id);

  return {
    token: accessToken,
    refreshToken,
    expiresIn,
    user,
  };
};

// ==================== 获取当前用户 ====================

export const getCurrentUser = async (profileId: string): Promise<UserInfo> => {
  return buildUserInfo(profileId);
};

// ==================== 刷新 Token ====================

export const refreshTokens = async (refreshTokenString: string): Promise<RefreshResponse> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshTokenString);
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('刷新令牌已过期，请重新登录');
    }
    throw new UnauthorizedError('刷新令牌无效');
  }

  const result = await prisma.$transaction(async (tx) => {
    const revokeResult = await tx.authSession.updateMany({
      where: {
        id: payload.sessionId,
        profileId: payload.profileId,
        refreshTokenJti: payload.jti,
        sessionVersion: payload.sessionVersion,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });

    if (revokeResult.count !== 1) {
      throw new UnauthorizedError('刷新令牌无效');
    }

    const profile = await tx.profile.findUnique({
      where: { id: payload.profileId },
      include: { teacher: true, parent: true },
    });

    if (!profile) {
      throw new UnauthorizedError('用户不存在或已被删除');
    }

    let userId: string;
    if (profile.role === Role.TEACHER) {
      userId = profile.teacher?.id ?? profile.id;
    } else if (profile.role === Role.PARENT) {
      userId = profile.parent?.id ?? profile.id;
    } else {
      userId = profile.id;
    }

    // 创建新会话
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7); // 7 天
    const newSession = await tx.authSession.create({
      data: {
        profileId: profile.id,
        refreshTokenJti: '', // 后面会更新
        sessionVersion: payload.sessionVersion + 1,
        expiresAt: newExpiresAt
      }
    });

    // 生成新 token 对
    const pair = await generateTokenPair(
      {
        profileId: profile.id,
        userId,
        role: profile.role as 'TEACHER' | 'PARENT' | 'PRINCIPAL'
      },
      { id: newSession.id, sessionVersion: newSession.sessionVersion }
    );

    // 更新新会话的 refreshTokenJti
    const newPayload = verifyRefreshToken(pair.refreshToken);
    await tx.authSession.update({
      where: { id: newSession.id },
      data: { refreshTokenJti: newPayload.jti }
    });

    return pair;
  });

  return {
    token: result.accessToken,
    refreshToken: result.refreshToken,
    expiresIn: result.expiresIn,
  };
};

// ==================== 手机号验证码登录 ====================

export const phoneLogin = async (input: PhoneLoginInput): Promise<LoginResponse> => {
  const { phone, code, role } = input;

  // 校验验证码
  if (!(await verifySmsCode(phone, code))) {
    throw new UnauthorizedError('验证码错误或已过期');
  }

  // 使用统一的用户初始化事务
  const { profile, userId, isNewUser, accessToken, refreshToken, expiresIn } = await initializeUserWithTransaction(
    { phone, role },
    role
  );

  const user = await buildUserInfo(profile.id);

  return {
    token: accessToken,
    refreshToken,
    expiresIn,
    ...(isNewUser && { isNewUser }),
    user,
  };
};

// ==================== 验证邀请码 ====================

export const revokeSession = async (sessionId: string): Promise<void> => {
  await prisma.authSession.updateMany({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
};

export const revokeSessionByRefreshToken = async (refreshTokenString: string): Promise<void> => {
  let payload;

  try {
    payload = verifyRefreshToken(refreshTokenString);
  } catch (error) {
    if (error instanceof Error && error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('刷新令牌已过期，请重新登录');
    }
    throw new UnauthorizedError('刷新令牌无效');
  }

  await revokeSession(payload.sessionId);
};

export const validateInviteCode = async (inviteCode: string): Promise<{ valid: boolean; student?: { id: string; name: string } }> => {
  // 先查教师邀请码
  const teacher = await prisma.teacher.findUnique({
    where: { inviteCode },
    select: { id: true, profile: { select: { nickname: true } } },
  });

  if (teacher) {
    return {
      valid: true,
      student: {
        id: teacher.id,
        name: teacher.profile?.nickname ?? '教师',
      },
    };
  }

  // 再查学生邀请码
  const student = await prisma.student.findUnique({
    where: { inviteCode },
    select: { id: true, name: true },
  });

  if (student) {
    return {
      valid: true,
      student: {
        id: student.id,
        name: student.name,
      },
    };
  }

  return { valid: false };
};
