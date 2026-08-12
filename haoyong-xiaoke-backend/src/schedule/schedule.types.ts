export interface CreateScheduleInput {
  classId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  startDate?: string;
  endDate?: string;
}

export type UpdateScheduleInput = CreateScheduleInput;

export interface ScheduleListQuery {
  page?: number;
  pageSize?: number;
  classId?: string;
  dayOfWeek?: number;
}
