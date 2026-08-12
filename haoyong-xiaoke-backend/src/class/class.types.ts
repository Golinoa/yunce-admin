import { ClassStatus } from '@prisma/client';

export interface CreateClassInput {
  name: string;
  subject?: string;
  grade?: string;
  schedule?: string;
  location?: string;
}

export type UpdateClassInput = CreateClassInput;

export interface ClassListQuery {
  page?: number;
  pageSize?: number;
  status?: ClassStatus;
  keyword?: string;
}

export interface AddStudentInput {
  studentId: string;
}

export interface CheckinInput {
  date: string;
  studentIds: string[];
  packageId?: string;
  content?: string;
  homework?: string;
}
