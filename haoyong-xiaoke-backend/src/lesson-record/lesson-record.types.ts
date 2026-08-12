import { LessonStatus } from '@prisma/client';

export interface CreateLessonRecordInput {
  studentId: string;
  packageId?: string;
  classId?: string;
  scheduleId?: string;
  lessonDate: string;
  duration: number;
  content?: string;
  homework?: string;
}

export interface UpdateLessonRecordInput {
  content?: string;
  homework?: string;
  status?: LessonStatus;
}

export interface LessonRecordListQuery {
  page?: number;
  pageSize?: number;
  studentId?: string;
  classId?: string;
  startDate?: string;
  endDate?: string;
  status?: LessonStatus;
}
