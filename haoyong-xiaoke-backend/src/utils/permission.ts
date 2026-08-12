import { Prisma, PrismaClient } from '@prisma/client';
import { prisma } from '../config/database';
import { ForbiddenError, NotFoundError } from './errors';

type PermissionDbClient = PrismaClient | Prisma.TransactionClient;

const getDb = (db?: PermissionDbClient): PermissionDbClient => db ?? prisma;

export const getBoundStudentIds = async (profileId: string, db?: PermissionDbClient): Promise<string[]> => {
  const bindings = await getDb(db).studentParent.findMany({
    where: {
      profileId,
      bindStatus: 'BOUND',
      studentId: { not: null },
    },
    select: { studentId: true },
  });

  return bindings
    .map((binding) => binding.studentId)
    .filter((studentId): studentId is string => studentId !== null);
};

export const resolveParentAuthorizedStudentIds = async (
  profileId: string | null | undefined,
  requestedStudentId?: string,
  options?: {
    db?: PermissionDbClient;
    missingProfileMessage?: string;
    forbiddenMessage?: string;
  },
): Promise<string[]> => {
  const {
    db,
    missingProfileMessage = '无权查看该学生的记录',
    forbiddenMessage = '无权查看该学生的记录',
  } = options ?? {};

  if (!profileId) {
    throw new ForbiddenError(missingProfileMessage);
  }

  const allowedStudentIds = await getBoundStudentIds(profileId, db);

  if (requestedStudentId) {
    if (!allowedStudentIds.includes(requestedStudentId)) {
      throw new ForbiddenError(forbiddenMessage);
    }

    return [requestedStudentId];
  }

  return allowedStudentIds;
};

export const assertParentBoundToStudent = async (
  profileId: string | null | undefined,
  studentId: string,
  options?: {
    db?: PermissionDbClient;
    missingProfileMessage?: string;
    forbiddenMessage?: string;
  },
) => {
  const {
    db,
    missingProfileMessage = '无权查看该学生',
    forbiddenMessage = '无权查看该学生',
  } = options ?? {};

  if (!profileId) {
    throw new ForbiddenError(missingProfileMessage);
  }

  const binding = await getDb(db).studentParent.findFirst({
    where: { profileId, studentId, bindStatus: 'BOUND' },
  });

  if (!binding) {
    throw new ForbiddenError(forbiddenMessage);
  }

  return binding;
};

export const assertTeacherOwnsStudent = async (
  studentId: string,
  teacherId: string,
  options?: {
    db?: PermissionDbClient;
    notFoundMessage?: string;
    forbiddenMessage?: string;
  },
) => {
  const {
    db,
    notFoundMessage = '学生不存在',
    forbiddenMessage = '无权操作该学生',
  } = options ?? {};

  const student = await getDb(db).student.findUnique({ where: { id: studentId } });
  if (!student) {
    throw new NotFoundError(notFoundMessage);
  }
  if (student.teacherId !== teacherId) {
    throw new ForbiddenError(forbiddenMessage);
  }

  return student;
};

export const assertTeacherOwnsClass = async (
  classId: string,
  teacherId: string,
  options?: {
    db?: PermissionDbClient;
    notFoundMessage?: string;
    forbiddenMessage?: string;
  },
) => {
  const {
    db,
    notFoundMessage = '班级不存在',
    forbiddenMessage = '无权操作该班级',
  } = options ?? {};

  const cls = await getDb(db).class.findUnique({ where: { id: classId } });
  if (!cls) {
    throw new NotFoundError(notFoundMessage);
  }
  if (cls.teacherId !== teacherId) {
    throw new ForbiddenError(forbiddenMessage);
  }

  return cls;
};
