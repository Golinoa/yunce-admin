import { Prisma, PackageStatus, LessonStatus } from '@prisma/client';
import { BusinessError } from './errors';

export const LESSON_MINUTES_PER_HOUR = 45;

export const calculateHoursUsed = (duration: number): number => {
  return Math.max(1, Math.round(duration / LESSON_MINUTES_PER_HOUR));
};

export const normalizeLessonHoursUsed = (lesson: {
  duration: number;
  hoursUsed?: number | null;
}): number => {
  if (typeof lesson.hoursUsed === 'number' && lesson.hoursUsed > 0) {
    return lesson.hoursUsed;
  }

  return calculateHoursUsed(lesson.duration);
};

export const computePackageStatus = (
  currentStatus: PackageStatus,
  usedHours: number,
  totalHours: number,
): PackageStatus => {
  if (currentStatus === PackageStatus.EXPIRED) {
    return PackageStatus.EXPIRED;
  }

  return usedHours >= totalHours ? PackageStatus.DEPLETED : PackageStatus.ACTIVE;
};

export const applyPackageHoursDelta = (
  pkg: {
    name: string;
    usedHours: number;
    totalHours: number;
    status: PackageStatus;
  },
  delta: number,
): { newUsedHours: number; newStatus: PackageStatus } => {
  const nextUsedHours = pkg.usedHours + delta;

  if (nextUsedHours < 0) {
    throw new BusinessError(`课时回滚异常：套餐"${pkg.name}"已用课时不足`, 409);
  }

  if (nextUsedHours > pkg.totalHours) {
    throw new BusinessError(`课时不足：套餐"${pkg.name}"剩余课时不足`, 422);
  }

  return {
    newUsedHours: nextUsedHours,
    newStatus: computePackageStatus(pkg.status, nextUsedHours, pkg.totalHours),
  };
};

export type LockedCoursePackageRow = {
  id: string;
  studentId: string;
  name: string;
  usedHours: number;
  totalHours: number;
  status: PackageStatus;
};

export type LockedLessonRecordRow = {
  id: string;
  status: LessonStatus;
  packageId: string | null;
  studentId: string;
  duration: number;
  hoursUsed: number | null;
};

export const lockCoursePackageForUpdate = async (
  tx: Prisma.TransactionClient,
  packageId: string,
): Promise<LockedCoursePackageRow | null> => {
  const [pkg] = await tx.$queryRaw<LockedCoursePackageRow[]>`
    SELECT id, studentId, name, usedHours, totalHours, status
    FROM CoursePackage
    WHERE id = ${packageId}
    FOR UPDATE
  `;

  return pkg ?? null;
};

export const lockLessonRecordForUpdate = async (
  tx: Prisma.TransactionClient,
  recordId: string,
): Promise<LockedLessonRecordRow | null> => {
  const [record] = await tx.$queryRaw<LockedLessonRecordRow[]>`
    SELECT id, status, packageId, studentId, duration, hoursUsed
    FROM LessonRecord
    WHERE id = ${recordId}
    FOR UPDATE
  `;

  return record ?? null;
};
