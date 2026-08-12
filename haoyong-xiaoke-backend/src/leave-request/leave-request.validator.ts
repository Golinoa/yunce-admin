import { z } from 'zod';

export const createLeaveRequestSchema = z.object({
  studentId: z.string().uuid('学生 ID 格式不正确'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式应为 YYYY-MM-DD'),
  reason: z.string().min(1, '请假原因不能为空').max(500, '请假原因不能超过 500 字符'),
}).refine((data) => data.startDate <= data.endDate, {
  message: '结束日期必须大于等于开始日期',
  path: ['endDate'],
});

export const approveLeaveSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { required_error: '请选择审批结果' }),
});

export const leaveListQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  studentId: z.string().uuid('学生 ID 格式不正确').optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type LeaveListQuery = z.infer<typeof leaveListQuerySchema>;
