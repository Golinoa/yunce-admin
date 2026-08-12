import { Prisma, LessonStatus } from '@prisma/client';
import { prisma } from '../config/database';

const lessonRecordListArgs = Prisma.validator<Prisma.LessonRecordDefaultArgs>()({
  include: {
    student: { select: { name: true, avatar: true } },
    package: { select: { name: true } },
    class: { select: { name: true } },
  },
});

const lessonRecordDetailArgs = Prisma.validator<Prisma.LessonRecordDefaultArgs>()({
  include: {
    student: { select: { id: true, name: true, avatar: true } },
    package: { select: { id: true, name: true, totalHours: true, usedHours: true } },
    class: { select: { id: true, name: true } },
    schedule: { select: { id: true, dayOfWeek: true, startTime: true, endTime: true } },
  },
});

const lessonRecordCalendarArgs = Prisma.validator<Prisma.LessonRecordDefaultArgs>()({
  include: {
    student: { select: { id: true, name: true, avatar: true } },
    package: { select: { id: true, name: true } },
    class: { select: { id: true, name: true } },
  },
});

export const findLessonRecordList = (
  where: Prisma.LessonRecordWhereInput,
  page: number,
  pageSize: number,
) => prisma.lessonRecord.findMany({
  where,
  orderBy: { lessonDate: 'desc' },
  skip: (page - 1) * pageSize,
  take: pageSize,
  ...lessonRecordListArgs,
});

export const countLessonRecords = (where: Prisma.LessonRecordWhereInput) => prisma.lessonRecord.count({ where });

export const findLessonRecordDetail = (recordId: string) => prisma.lessonRecord.findUnique({
  where: { id: recordId },
  ...lessonRecordDetailArgs,
});

export const findStudentMonthlyLessonRecords = (studentId: string, since: Date) => prisma.lessonRecord.findMany({
  where: {
    studentId,
    status: LessonStatus.NORMAL,
    lessonDate: { gte: since },
  },
  select: {
    lessonDate: true,
    duration: true,
  },
});

export const findLessonRecordsForCalendar = (where: Prisma.LessonRecordWhereInput) => prisma.lessonRecord.findMany({
  where,
  orderBy: { lessonDate: 'desc' },
  ...lessonRecordCalendarArgs,
});
