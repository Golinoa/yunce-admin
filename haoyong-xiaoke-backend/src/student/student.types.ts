import { Gender, StudentStatus } from '@prisma/client';

export interface CreateStudentInput {
  name: string;
  avatar?: string;
  gender?: Gender;
  birthday?: string;
  phone?: string;
  remark?: string;
}

export type UpdateStudentInput = CreateStudentInput;

export interface BindParentInput {
  relation: string;
  phone: string;
}

export interface StudentListQuery {
  page?: number;
  pageSize?: number;
  status?: StudentStatus;
  keyword?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StudentListItem {
  id: string;
  name: string;
  avatar: string | null;
  gender: Gender | null;
  birthday: Date | null;
  phone: string | null;
  remark: string | null;
  status: StudentStatus;
  parentCount: number;
  classCount: number;
  totalHours: number;
  usedHours: number;
  createdAt: Date;
}
