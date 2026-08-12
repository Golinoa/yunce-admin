import { Prisma, Role, StudentStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, ConflictError } from '../utils/errors';
import {
  assertParentBoundToStudent,
  assertTeacherOwnsStudent,
  getBoundStudentIds,
} from '../utils/permission';
import type { CreateStudentInput, UpdateStudentInput, BindParentInput, StudentListQuery } from './student.validator';

const studentDetailArgs = Prisma.validator<Prisma.StudentDefaultArgs>()({
  include: {
    teacher: {
      include: {
        profile: { select: { nickname: true } },
      },
    },
    parents: {
      include: {
        profile: { select: { nickname: true, phone: true, avatar: true } },
      },
    },
    classStudents: {
      include: {
        class: { select: { id: true, name: true, subject: true, schedule: true } },
      },
    },
    coursePackages: {
      select: {
        id: true,
        name: true,
        totalHours: true,
        usedHours: true,
        status: true,
        validEnd: true,
      },
    },
    lessonRecords: {
      take: 5,
      orderBy: { lessonDate: 'desc' },
      select: {
        id: true,
        lessonDate: true,
        duration: true,
        content: true,
        status: true,
      },
    },
  },
});

const buildVisibleParentProfile = (
  role: Role,
  viewerProfileId: string | null,
  parentProfileId: string | null,
  profile: { nickname: string | null; phone: string | null; avatar: string | null } | null,
) => {
  if (!profile) {
    return null;
  }

  const isCurrentParent = role === Role.PARENT && parentProfileId === viewerProfileId;
  if (role === Role.TEACHER || isCurrentParent) {
    return {
      nickname: profile.nickname,
      phone: profile.phone,
      avatar: profile.avatar,
    };
  }

  return {
    nickname: profile.nickname,
    phone: null,
    avatar: null,
  };
};

// ==================== 学生列表 ====================

export const listStudents = async (
  userId: string,
  role: Role,
  profileId: string | null,
  query: StudentListQuery,
) => {
  const { page, pageSize, status, keyword, sortBy, sortOrder } = query;

  const where: Prisma.StudentWhereInput = {};

  // 角色过滤
  if (role === Role.TEACHER) {
    const teacher = await prisma.teacher.findUnique({ where: { id: userId } });
    if (!teacher) throw new NotFoundError('教师不存在');
    where.teacherId = teacher.id;
  } else {
    // PARENT：查绑定学生
    if (!profileId) {
      return { list: [], pagination: { page, pageSize, total: 0, totalPages: 0 } };
    }
    const studentIds = await getBoundStudentIds(profileId);
    where.id = { in: studentIds };
  }

  // 状态筛选
  if (status) {
    where.status = status;
  }

  // 关键词搜索
  if (keyword) {
    where.name = { contains: keyword };
  }

  // 排序
  const orderBy: Prisma.StudentOrderByWithRelationInput = {};
  if (sortBy === 'name') {
    orderBy.name = sortOrder;
  } else if (sortBy === 'status') {
    orderBy.status = sortOrder;
  } else {
    orderBy.createdAt = sortOrder;
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { parents: true, classStudents: true } },
        coursePackages: { select: { totalHours: true, usedHours: true } },
      },
    }),
    prisma.student.count({ where }),
  ]);

  const list = students.map((s) => {
    const totalHours = s.coursePackages.reduce((sum, p) => sum + p.totalHours, 0);
    const usedHours = s.coursePackages.reduce((sum, p) => sum + p.usedHours, 0);
    return {
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      gender: s.gender,
      birthday: s.birthday,
      phone: s.phone,
      remark: s.remark,
      status: s.status,
      parentCount: s._count.parents,
      classCount: s._count.classStudents,
      totalHours,
      usedHours,
      createdAt: s.createdAt,
    };
  });

  return {
    list,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

// ==================== 学生详情 ====================

export const getStudentDetail = async (
  studentId: string,
  userId: string,
  role: Role,
  profileId: string | null,
) => {
  // 权限校验
  if (role === Role.TEACHER) {
    await assertTeacherOwnsStudent(studentId, userId);
  } else {
    await assertParentBoundToStudent(profileId, studentId);
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    ...studentDetailArgs,
  });

  if (!student) throw new NotFoundError('学生不存在');

  const processedParents = student.parents.map((p) => {
    return {
      id: p.id,
      relation: p.relation,
      profile: buildVisibleParentProfile(role, profileId, p.profileId, p.profile),
      bindStatus: p.bindStatus,
    };
  });

  return {
    id: student.id,
    name: student.name,
    avatar: student.avatar,
    gender: student.gender,
    birthday: student.birthday,
    phone: student.phone,
    remark: student.remark,
    status: student.status,
    teacher: student.teacher
      ? {
          id: student.teacher.id,
          nickname: student.teacher.profile?.nickname,
          institution: student.teacher.institution,
        }
      : null,
    parents: processedParents,
    classes: student.classStudents.map((cs) => ({
      id: cs.class.id,
      name: cs.class.name,
      subject: cs.class.subject,
      schedule: cs.class.schedule,
    })),
    coursePackages: student.coursePackages,
    recentLessons: student.lessonRecords,
    createdAt: student.createdAt,
  };
};

// ==================== 创建学生 ====================

export const createStudent = async (teacherId: string, input: CreateStudentInput) => {
  const data: Prisma.StudentCreateInput = {
    name: input.name,
    avatar: input.avatar ?? null,
    gender: input.gender ?? undefined,
    birthday: input.birthday ? new Date(input.birthday) : null,
    phone: input.phone ?? null,
    remark: input.remark ?? null,
    teacher: { connect: { id: teacherId } },
  };

  const student = await prisma.student.create({ data });
  return student;
};

// ==================== 更新学生 ====================

export const updateStudent = async (
  studentId: string,
  teacherId: string,
  input: UpdateStudentInput,
) => {
  await assertTeacherOwnsStudent(studentId, teacherId);

  const data: Prisma.StudentUpdateInput = {
    name: input.name,
    avatar: input.avatar ?? null,
    gender: input.gender ?? undefined,
    birthday: input.birthday ? new Date(input.birthday) : null,
    phone: input.phone ?? null,
    remark: input.remark ?? null,
  };

  const student = await prisma.student.update({
    where: { id: studentId },
    data,
  });

  return student;
};

// ==================== 删除学生（软删除） ====================

export const deleteStudent = async (studentId: string, teacherId: string) => {
  await assertTeacherOwnsStudent(studentId, teacherId);

  await prisma.student.update({
    where: { id: studentId },
    data: { status: StudentStatus.INACTIVE },
  });
};

// ==================== 绑定家长 ====================

export const bindParent = async (studentId: string, teacherId: string, input: BindParentInput) => {
  await assertTeacherOwnsStudent(studentId, teacherId);

  // 查找家长 Profile
  const parentProfile = await prisma.profile.findUnique({
    where: { phone: input.phone },
  });

  // 检查是否已绑定
  if (parentProfile) {
    if (parentProfile.role !== Role.PARENT) {
      throw new ConflictError('该手机号对应的用户不是家长角色');
    }
    const existing = await prisma.studentParent.findFirst({
      where: {
        studentId,
        profileId: parentProfile.id,
      },
    });
    if (existing) {
      throw new ConflictError('该家长已绑定该学生');
    }
  }

  // 创建绑定记录
  const data: Prisma.StudentParentCreateInput = {
    student: { connect: { id: studentId } },
    relation: input.relation,
    bindStatus: 'PENDING',
  };

  if (parentProfile) {
    data.profile = { connect: { id: parentProfile.id } };
  }

  const binding = await prisma.studentParent.create({ data });

  return {
    bindId: binding.id,
    status: binding.bindStatus,
    inviteMessage: `请家长使用手机号 ${input.phone} 注册并输入邀请码`,
  };
};

// ==================== 家长列表 ====================

export const listParents = async (
  studentId: string,
  userId: string,
  role: Role,
  profileId: string | null,
) => {
  // 权限校验
  if (role === Role.TEACHER) {
    await assertTeacherOwnsStudent(studentId, userId);
  } else {
    await assertParentBoundToStudent(profileId, studentId);
  }

  const parents = await prisma.studentParent.findMany({
    where: { studentId },
    include: {
      profile: { select: { nickname: true, phone: true, avatar: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return parents.map((p) => {
    return {
      id: p.id,
      relation: p.relation,
      profile: buildVisibleParentProfile(role, profileId, p.profileId, p.profile),
      bindStatus: p.bindStatus,
      createdAt: p.createdAt,
    };
  });
};

// ==================== 重名检测 ====================

export const checkDuplicate = async (
  teacherId: string,
  name: string,
  excludeId?: string,
) => {
  const where: Prisma.StudentWhereInput = {
    teacherId,
    name,
    status: { not: StudentStatus.INACTIVE },
  };

  if (excludeId) {
    where.id = { not: excludeId };
  }

  const count = await prisma.student.count({ where });

  return {
    isDuplicate: count > 0,
    count,
  };
};

// ==================== 通过邀请码查找学员 ====================

export const findByInviteCode = async (inviteCode: string) => {
  const student = await prisma.student.findUnique({
    where: { inviteCode },
    include: {
      teacher: {
        include: {
          profile: { select: { nickname: true, avatar: true } },
        },
      },
    },
  });

  if (!student) throw new NotFoundError('邀请码无效');

  return {
    id: student.id,
    name: student.name,
    avatar: student.avatar,
    nickname: student.nickname,
    teacher: {
      id: student.teacher.id,
      nickname: student.teacher.profile?.nickname,
      avatar: student.teacher.profile?.avatar,
      institution: student.teacher.institution,
    },
  };
};

// ==================== 解绑家长 ====================

export const unbindParent = async (
  studentId: string,
  bindingId: string,
  teacherId: string,
) => {
  await assertTeacherOwnsStudent(studentId, teacherId);

  const binding = await prisma.studentParent.findUnique({
    where: { id: bindingId },
  });

  if (!binding) throw new NotFoundError('绑定记录不存在');
  if (binding.studentId !== studentId) throw new ForbiddenError('绑定记录与学员不匹配');

  await prisma.studentParent.delete({
    where: { id: bindingId },
  });
};

// ==================== 学生统计 ====================

export const getStudentStats = async (teacherId: string) => {
  const [total, active, inactive, byGender] = await Promise.all([
    prisma.student.count({ where: { teacherId } }),
    prisma.student.count({ where: { teacherId, status: StudentStatus.ACTIVE } }),
    prisma.student.count({ where: { teacherId, status: StudentStatus.INACTIVE } }),
    prisma.student.groupBy({
      by: ['gender'],
      where: { teacherId, status: StudentStatus.ACTIVE },
      _count: { id: true },
    }),
  ]);

  return {
    total,
    active,
    inactive,
    byGender: byGender.map((g) => ({
      gender: g.gender || '未设置',
      count: g._count.id,
    })),
  };
};
