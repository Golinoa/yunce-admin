import { PackageStatus } from '@prisma/client';

export interface CreatePackageInput {
  studentId: string;
  name: string;
  totalHours: number;
  validStart?: string;
  validEnd?: string;
}

export interface UpdatePackageInput {
  name?: string;
  totalHours?: number;
  validEnd?: string;
}

export interface PackageListQuery {
  page?: number;
  pageSize?: number;
  studentId?: string;
  status?: PackageStatus;
}
