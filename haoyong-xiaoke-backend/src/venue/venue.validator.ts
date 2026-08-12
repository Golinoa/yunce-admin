import { z } from 'zod';

// ==================== Venue (场地) ====================

// 创建场地
export const createVenueSchema = z.object({
  campusId: z.string().min(1, '校区ID不能为空'),
  name: z.string().min(1, '场地名称不能为空').max(50, '场地名称不能超过50字符'),
  address: z.string().optional(),
});

// 更新场地
export const updateVenueSchema = z.object({
  name: z.string().min(1, '场地名称不能为空').max(50, '场地名称不能超过50字符').optional(),
  address: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 场地列表查询
export const venueListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  campusId: z.string().optional(),
  keyword: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ==================== Room (教室) ====================

// 创建教室
export const createRoomSchema = z.object({
  venueId: z.string().min(1, '场地ID不能为空'),
  name: z.string().min(1, '教室名称不能为空').max(50, '教室名称不能超过50字符'),
  capacity: z.number().int().min(1).max(1000).default(20),
});

// 更新教室
export const updateRoomSchema = z.object({
  name: z.string().min(1, '教室名称不能为空').max(50, '教室名称不能超过50字符').optional(),
  capacity: z.number().int().min(1).max(1000).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 教室列表查询
export const roomListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  venueId: z.string().optional(),
  keyword: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// ==================== VenueTimeSlot (时段) ====================

// 创建时段
export const createVenueSlotSchema = z.object({
  venueId: z.string().min(1, '场地ID不能为空'),
  dayOfWeek: z.number().int().min(1).max(7, '星期范围1-7'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误，示例: 09:00'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误，示例: 12:00'),
});

// 批量创建时段
export const batchCreateVenueSlotSchema = z.object({
  venueId: z.string().min(1, '场地ID不能为空'),
  slots: z.array(z.object({
    dayOfWeek: z.number().int().min(1).max(7),
    startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误'),
  })).min(1, '至少需要一个时段'),
});

// 更新时段
export const updateVenueSlotSchema = z.object({
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 时段列表查询
export const venueSlotListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  venueId: z.string().optional(),
  dayOfWeek: z.coerce.number().int().min(1).max(7).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
});

// 可用时段查询
export const venueSlotAvailableQuerySchema = z.object({
  venueId: z.string().min(1, '场地ID不能为空'),
  roomId: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误，示例: 2026-08-12'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
});

// ==================== VenueBooking (场地预约) ====================

// 创建场地预约
export const createVenueBookingSchema = z.object({
  venueId: z.string().min(1, '场地ID不能为空'),
  roomId: z.string().min(1, '教室ID不能为空'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误，示例: 2026-08-12'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误'),
  purpose: z.string().max(200).optional(),
  remark: z.string().max(500).optional(),
});

// 更新场地预约
export const updateVenueBookingSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, '时间格式错误').optional(),
  purpose: z.string().max(200).optional(),
  remark: z.string().max(500).optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
});

// 场地预约列表查询
export const venueBookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  venueId: z.string().optional(),
  roomId: z.string().optional(),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']).optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式错误').optional(),
});

// 类型导出
export type CreateVenueInput = z.infer<typeof createVenueSchema>;
export type UpdateVenueInput = z.infer<typeof updateVenueSchema>;
export type VenueListQuery = z.infer<typeof venueListQuerySchema>;

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type RoomListQuery = z.infer<typeof roomListQuerySchema>;

export type CreateVenueSlotInput = z.infer<typeof createVenueSlotSchema>;
export type BatchCreateVenueSlotInput = z.infer<typeof batchCreateVenueSlotSchema>;
export type UpdateVenueSlotInput = z.infer<typeof updateVenueSlotSchema>;
export type VenueSlotListQuery = z.infer<typeof venueSlotListQuerySchema>;
export type VenueSlotAvailableQuery = z.infer<typeof venueSlotAvailableQuerySchema>;

export type CreateVenueBookingInput = z.infer<typeof createVenueBookingSchema>;
export type UpdateVenueBookingInput = z.infer<typeof updateVenueBookingSchema>;
export type VenueBookingListQuery = z.infer<typeof venueBookingListQuerySchema>;
