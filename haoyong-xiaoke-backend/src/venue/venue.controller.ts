import { Response, NextFunction } from 'express';
import * as venueService from './venue.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
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

// ==================== Venue (场地) ====================

// 场地列表
export const listVenues = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = venueListQuerySchema.parse(req.query);
    const result = await venueService.listVenues(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 场地详情
export const getVenueDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await venueService.getVenueDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建场地
export const createVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createVenueSchema.parse(req.body);
    const result = await venueService.createVenue(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新场地
export const updateVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateVenueSchema.parse(req.body);
    const result = await venueService.updateVenue(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除场地
export const deleteVenue = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await venueService.deleteVenue(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== Room (教室) ====================

// 教室列表
export const listRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = roomListQuerySchema.parse(req.query);
    const result = await venueService.listRooms(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 教室详情
export const getRoomDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await venueService.getRoomDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建教室
export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createRoomSchema.parse(req.body);
    const result = await venueService.createRoom(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新教室
export const updateRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateRoomSchema.parse(req.body);
    const result = await venueService.updateRoom(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除教室
export const deleteRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await venueService.deleteRoom(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== VenueTimeSlot (时段) ====================

// 时段列表
export const listVenueSlots = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = venueSlotListQuerySchema.parse(req.query);
    const result = await venueService.listVenueSlots(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 创建时段
export const createVenueSlot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createVenueSlotSchema.parse(req.body);
    const result = await venueService.createVenueSlot(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 批量创建时段
export const batchCreateVenueSlots = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = batchCreateVenueSlotSchema.parse(req.body);
    const result = await venueService.batchCreateVenueSlots(input);
    created(res, result, '批量创建成功');
  } catch (error) {
    next(error);
  }
};

// 更新时段
export const updateVenueSlot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateVenueSlotSchema.parse(req.body);
    const result = await venueService.updateVenueSlot(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除时段
export const deleteVenueSlot = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await venueService.deleteVenueSlot(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// 获取可用时段
export const getAvailableSlots = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = venueSlotAvailableQuerySchema.parse(req.query);
    const result = await venueService.getAvailableSlots(query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// ==================== VenueBooking (场地预约) ====================

// 场地预约列表
export const listVenueBookings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = venueBookingListQuerySchema.parse(req.query);
    const result = await venueService.listVenueBookings(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 场地预约详情
export const getVenueBookingDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await venueService.getVenueBookingDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建场地预约
export const createVenueBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createVenueBookingSchema.parse(req.body);
    const result = await venueService.createVenueBooking(input, req.user!.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新场地预约
export const updateVenueBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateVenueBookingSchema.parse(req.body);
    const result = await venueService.updateVenueBooking(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 取消场地预约
export const cancelVenueBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await venueService.cancelVenueBooking(req.params.id);
    success(res, result, '预约已取消');
  } catch (error) {
    next(error);
  }
};

// 确认场地预约
export const confirmVenueBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await venueService.confirmVenueBooking(req.params.id);
    success(res, result, '预约已确认');
  } catch (error) {
    next(error);
  }
};

// 删除场地预约
export const deleteVenueBooking = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await venueService.deleteVenueBooking(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
