import { LeaveStatus } from '@prisma/client';

export interface CreateLeaveRequestInput {
  studentId: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ApproveLeaveInput {
  status: 'APPROVED' | 'REJECTED';
}

export interface LeaveListQuery {
  page?: number;
  pageSize?: number;
  status?: LeaveStatus;
  studentId?: string;
}
