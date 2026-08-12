import { Router } from 'express';
import * as venueController from './venue.controller';
import { validate } from '../middleware/validate';
import {
  venueListQuerySchema,
  createVenueSchema,
  updateVenueSchema,
  roomListQuerySchema,
  createRoomSchema,
  updateRoomSchema,
  venueSlotListQuerySchema,
  createVenueSlotSchema,
  batchCreateVenueSlotSchema,
  updateVenueSlotSchema,
  venueSlotAvailableQuerySchema,
  venueBookingListQuerySchema,
  createVenueBookingSchema,
  updateVenueBookingSchema,
} from './venue.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==================== Venue (场地) ====================

// 场地列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: venueListQuerySchema }),
  venueController.listVenues,
);

// 场地详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  venueController.getVenueDetail,
);

// 创建场地
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createVenueSchema }),
  venueController.createVenue,
);

// 更新场地
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateVenueSchema }),
  venueController.updateVenue,
);

// 删除场地
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  venueController.deleteVenue,
);

// ==================== Room (教室) ====================

// 教室列表
router.get(
  '/rooms/list',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: roomListQuerySchema }),
  venueController.listRooms,
);

// 教室详情
router.get(
  '/rooms/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  venueController.getRoomDetail,
);

// 创建教室
router.post(
  '/rooms',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createRoomSchema }),
  venueController.createRoom,
);

// 更新教室
router.put(
  '/rooms/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateRoomSchema }),
  venueController.updateRoom,
);

// 删除教室
router.delete(
  '/rooms/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  venueController.deleteRoom,
);

// ==================== VenueTimeSlot (时段) ====================

// 时段列表
router.get(
  '/slots/list',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: venueSlotListQuerySchema }),
  venueController.listVenueSlots,
);

// 创建时段
router.post(
  '/slots',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createVenueSlotSchema }),
  venueController.createVenueSlot,
);

// 批量创建时段
router.post(
  '/slots/batch',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: batchCreateVenueSlotSchema }),
  venueController.batchCreateVenueSlots,
);

// 更新时段
router.put(
  '/slots/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateVenueSlotSchema }),
  venueController.updateVenueSlot,
);

// 删除时段
router.delete(
  '/slots/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  venueController.deleteVenueSlot,
);

// 获取可用时段
router.get(
  '/slots/available',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: venueSlotAvailableQuerySchema }),
  venueController.getAvailableSlots,
);

// ==================== VenueBooking (场地预约) ====================

// 场地预约列表
router.get(
  '/bookings/list',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: venueBookingListQuerySchema }),
  venueController.listVenueBookings,
);

// 场地预约详情
router.get(
  '/bookings/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  venueController.getVenueBookingDetail,
);

// 创建场地预约
router.post(
  '/bookings',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: createVenueBookingSchema }),
  venueController.createVenueBooking,
);

// 更新场地预约
router.put(
  '/bookings/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateVenueBookingSchema }),
  venueController.updateVenueBooking,
);

// 取消场地预约
router.post(
  '/bookings/:id/cancel',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  venueController.cancelVenueBooking,
);

// 确认场地预约
router.post(
  '/bookings/:id/confirm',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  venueController.confirmVenueBooking,
);

// 删除场地预约
router.delete(
  '/bookings/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  venueController.deleteVenueBooking,
);

export default router;
