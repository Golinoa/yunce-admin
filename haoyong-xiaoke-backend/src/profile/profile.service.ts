import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ConflictError } from '../utils/errors';
import type { UpdateProfileInput } from './profile.validator';

// ==================== 获取个人资料 ====================

const profileDetailArgs = Prisma.validator<Prisma.ProfileDefaultArgs>()({
  include: {
    teacher: {
      include: {
        _count: { select: { students: true, classes: true } },
      },
    },
    parent: {
      include: {
        student: { select: { id: true, name: true } },
      },
    },
  },
});

type ProfileDetailPayload = Prisma.ProfileGetPayload<typeof profileDetailArgs>;

export const getProfile = async (userId: string, role: string) => {
  const profile = await prisma.profile.findUnique({ where: { id: userId }, ...profileDetailArgs });

  if (!profile) return null;

  const typedProfile: ProfileDetailPayload = profile;

  const base = {
    id: typedProfile.id,
    profileId: typedProfile.id,
    nickname: typedProfile.nickname,
    avatar: typedProfile.avatar,
    phone: typedProfile.phone,
    email: typedProfile.email,
    role: typedProfile.role,
    createdAt: typedProfile.createdAt,
  };

  if (role === 'TEACHER' && typedProfile.teacher) {
    return {
      ...base,
      teacher: {
        id: typedProfile.teacher.id,
        inviteCode: typedProfile.teacher.inviteCode,
        institution: typedProfile.teacher.institution,
        studentCount: typedProfile.teacher._count.students,
        classCount: typedProfile.teacher._count.classes,
      },
    };
  }

  if (role === 'PARENT' && typedProfile.parent) {
    return {
      ...base,
      parent: {
        id: typedProfile.parent.id,
        studentId: typedProfile.parent.studentId,
        studentName: typedProfile.parent.student?.name ?? null,
        relation: typedProfile.parent.relation,
        bindStatus: typedProfile.parent.bindStatus,
      },
    };
  }

  return base;
};

// ==================== 更新个人资料 ====================

export const updateProfile = async (userId: string, role: string, input: UpdateProfileInput) => {
  // phone 唯一校验
  if (input.phone) {
    const existing = await prisma.profile.findFirst({
      where: { phone: input.phone, id: { not: userId } },
    });
    if (existing) throw new ConflictError('该手机号已被使用');
  }

  // email 唯一校验
  if (input.email) {
    const existing = await prisma.profile.findFirst({
      where: { email: input.email, id: { not: userId } },
    });
    if (existing) throw new ConflictError('该邮箱已被使用');
  }

  // 更新 Profile
  const profileData: Prisma.ProfileUpdateInput = {};
  if (input.nickname !== undefined) profileData.nickname = input.nickname;
  if (input.avatar !== undefined) profileData.avatar = input.avatar;
  if (input.phone !== undefined) profileData.phone = input.phone;
  if (input.email !== undefined) profileData.email = input.email;

  await prisma.profile.update({
    where: { id: userId },
    data: profileData,
  });

  // institution 仅 TEACHER 有效
  if (input.institution !== undefined && role === 'TEACHER') {
    await prisma.teacher.update({
      where: { profileId: userId },
      data: { institution: input.institution },
    });
  }

  // 返回更新后的资料
  return getProfile(userId, role);
};
