import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError, ConflictError } from '../utils/errors';
import type {
  CreateVenueInput,
  UpdateVenueInput,
  VenueListQuery,
  CreateRoomInput,
  UpdateRoomInput,
  RoomListQuery,
  CreateVenueSlotInput,
  BatchCreateVenueSlotInput,
  UpdateVenueSlotInput,
  VenueSlotListQuery,
  VenueSlotAvailableQuery,
  CreateVenueBookingInput,
  UpdateVenueBookingInput,
  VenueBookingListQuery,
} from './venue.validator';

// ==================== Venue (场地) ====================

// 场地列表
export const listVenues = async (query: VenueListQuery) => {
  const { page, pageSize, campusId, keyword, status } = query;

  const where: Prisma.VenueWhereInput = {};
  if (campusId) where.campusId = campusId;
  if (status) where.status = status;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { address: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      include: {
        rooms: {
          where: { status: 'ACTIVE' },
          select: { id: true, name: true, capacity: true },
        },
        _count: { select: { rooms: true, bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venue.count({ where }),
  ]);

  return {
    list: list.map((v) => ({
      id: v.id,
      campusId: v.campusId,
      name: v.name,
      address: v.address,
      status: v.status,
      roomCount: v._count.rooms,
      roomList: v.rooms,
      bookingCount: v._count.bookings,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 场地详情
export const getVenueDetail = async (id: string) => {
  const venue = await prisma.venue.findUnique({
    where: { id },
    include: {
      rooms: { where: { status: 'ACTIVE' } },
      slots: { where: { status: 'ACTIVE' } },
    },
  });
  if (!venue) throw new NotFoundError('场地不存在');
  return venue;
};

// 创建场地
export const createVenue = async (input: CreateVenueInput) => {
  const venue = await prisma.venue.create({
    data: {
      campusId: input.campusId,
      name: input.name,
      address: input.address,
    },
  });
  return venue;
};

// 更新场地
export const updateVenue = async (id: string, input: UpdateVenueInput) => {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new NotFoundError('场地不存在');

  const updated = await prisma.venue.update({
    where: { id },
    data: input,
  });
  return updated;
};

// 删除场地
export const deleteVenue = async (id: string) => {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new NotFoundError('场地不存在');

  await prisma.venue.delete({ where: { id } });
};

// ==================== Room (教室) ====================

// 教室列表
export const listRooms = async (query: RoomListQuery) => {
  const { page, pageSize, venueId, keyword, status } = query;

  const where: Prisma.RoomWhereInput = {};
  if (venueId) where.venueId = venueId;
  if (status) where.status = status;
  if (keyword) {
    where.name = { contains: keyword };
  }

  const [list, total] = await Promise.all([
    prisma.room.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true } },
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.room.count({ where }),
  ]);

  return {
    list: list.map((r) => ({
      id: r.id,
      venueId: r.venueId,
      venueName: r.venue.name,
      name: r.name,
      capacity: r.capacity,
      status: r.status,
      bookingCount: r._count.bookings,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 教室详情
export const getRoomDetail = async (id: string) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      venue: true,
    },
  });
  if (!room) throw new NotFoundError('教室不存在');
  return {
    ...room,
    venueName: room.venue.name,
  };
};

// 创建教室
export const createRoom = async (input: CreateRoomInput) => {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new NotFoundError('场地不存在');

  const existing = await prisma.room.findFirst({
    where: { venueId: input.venueId, name: input.name },
  });
  if (existing) throw new ConflictError('该场地下已存在同名教室');

  const room = await prisma.room.create({
    data: {
      venueId: input.venueId,
      name: input.name,
      capacity: input.capacity,
    },
  });
  return room;
};

// 更新教室
export const updateRoom = async (id: string, input: UpdateRoomInput) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new NotFoundError('教室不存在');

  if (input.name && input.name !== room.name) {
    const existing = await prisma.room.findFirst({
      where: { venueId: room.venueId, name: input.name, NOT: { id } },
    });
    if (existing) throw new ConflictError('该场地下已存在同名教室');
  }

  const updated = await prisma.room.update({
    where: { id },
    data: input,
  });
  return updated;
};

// 删除教室
export const deleteRoom = async (id: string) => {
  const room = await prisma.room.findUnique({ where: { id } });
  if (!room) throw new NotFoundError('教室不存在');

  await prisma.room.delete({ where: { id } });
};

// ==================== VenueTimeSlot (时段) ====================

// 时段列表
export const listVenueSlots = async (query: VenueSlotListQuery) => {
  const { page, pageSize, venueId, dayOfWeek, status } = query;

  const where: Prisma.VenueTimeSlotWhereInput = {};
  if (venueId) where.venueId = venueId;
  if (dayOfWeek) where.dayOfWeek = dayOfWeek;
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.venueTimeSlot.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true } },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venueTimeSlot.count({ where }),
  ]);

  return {
    list: list.map((s) => ({
      id: s.id,
      venueId: s.venueId,
      venueName: s.venue.name,
      dayOfWeek: s.dayOfWeek,
      dayName: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][s.dayOfWeek - 1],
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 创建时段
export const createVenueSlot = async (input: CreateVenueSlotInput) => {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new NotFoundError('场地不存在');

  const slot = await prisma.venueTimeSlot.create({
    data: {
      venueId: input.venueId,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
    },
  });
  return slot;
};

// 批量创建时段
export const batchCreateVenueSlots = async (input: BatchCreateVenueSlotInput) => {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new NotFoundError('场地不存在');

  const slots = await prisma.venueTimeSlot.createMany({
    data: input.slots.map((s) => ({
      venueId: input.venueId,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  });
  return slots;
};

// 更新时段
export const updateVenueSlot = async (id: string, input: UpdateVenueSlotInput) => {
  const slot = await prisma.venueTimeSlot.findUnique({ where: { id } });
  if (!slot) throw new NotFoundError('时段不存在');

  const updated = await prisma.venueTimeSlot.update({
    where: { id },
    data: input,
  });
  return updated;
};

// 删除时段
export const deleteVenueSlot = async (id: string) => {
  const slot = await prisma.venueTimeSlot.findUnique({ where: { id } });
  if (!slot) throw new NotFoundError('时段不存在');

  await prisma.venueTimeSlot.delete({ where: { id } });
};

// 获取可用时段
export const getAvailableSlots = async (query: VenueSlotAvailableQuery) => {
  const { venueId, roomId, date, startTime, endTime } = query;

  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) throw new NotFoundError('场地不存在');

  const dateObj = new Date(date);
  const dayOfWeek = dateObj.getDay() === 0 ? 7 : dateObj.getDay();

  const venueSlots = await prisma.venueTimeSlot.findMany({
    where: {
      venueId,
      dayOfWeek,
      status: 'ACTIVE',
    },
    orderBy: { startTime: 'asc' },
  });

  if (venueSlots.length === 0) {
    return { slots: [], rooms: [] };
  }

  const bookings = await prisma.venueBooking.findMany({
    where: {
      venueId,
      date: dateObj,
      status: { in: ['PENDING', 'CONFIRMED'] },
      ...(roomId && { roomId }),
    },
    select: {
      roomId: true,
      startTime: true,
      endTime: true,
    },
  });

  const rooms = await prisma.room.findMany({
    where: {
      venueId,
      status: 'ACTIVE',
      ...(roomId && { id: roomId }),
    },
  });

  const bookedSlots = bookings.map((b) => ({
    roomId: b.roomId,
    startTime: b.startTime,
    endTime: b.endTime,
  }));

  return {
    slots: venueSlots.map((s) => {
      const filteredBookings = bookedSlots.filter(
        (b) => b.startTime === s.startTime && b.endTime === s.endTime
      );
      const availableRooms = rooms.filter(
        (r) => !filteredBookings.some((b) => b.roomId === r.id)
      );

      return {
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        availableRooms: availableRooms.map((r) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
        })),
        availableCount: availableRooms.length,
        totalCount: rooms.length,
      };
    }),
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      capacity: r.capacity,
    })),
  };
};

// ==================== VenueBooking (场地预约) ====================

// 场地预约列表
export const listVenueBookings = async (query: VenueBookingListQuery) => {
  const { page, pageSize, venueId, roomId, status, dateFrom, dateTo } = query;

  const where: Prisma.VenueBookingWhereInput = {};
  if (venueId) where.venueId = venueId;
  if (roomId) where.roomId = roomId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  const [list, total] = await Promise.all([
    prisma.venueBooking.findMany({
      where,
      include: {
        venue: { select: { id: true, name: true } },
        room: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'desc' }, { startTime: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.venueBooking.count({ where }),
  ]);

  return {
    list: list.map((b) => ({
      id: b.id,
      venueId: b.venueId,
      venueName: b.venue.name,
      roomId: b.roomId,
      roomName: b.room.name,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      purpose: b.purpose,
      bookerId: b.bookerId,
      status: b.status,
      remark: b.remark,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 场地预约详情
export const getVenueBookingDetail = async (id: string) => {
  const booking = await prisma.venueBooking.findUnique({
    where: { id },
    include: {
      venue: true,
      room: true,
    },
  });
  if (!booking) throw new NotFoundError('预约记录不存在');
  return {
    ...booking,
    venueName: booking.venue.name,
    roomName: booking.room.name,
  };
};

// 创建场地预约
export const createVenueBooking = async (input: CreateVenueBookingInput, bookerId: string) => {
  const venue = await prisma.venue.findUnique({ where: { id: input.venueId } });
  if (!venue) throw new NotFoundError('场地不存在');

  const room = await prisma.room.findUnique({ where: { id: input.roomId } });
  if (!room) throw new NotFoundError('教室不存在');

  if (room.venueId !== input.venueId) {
    throw new BusinessError('教室不属于该场地', 422);
  }

  const dateObj = new Date(input.date);

  const conflict = await prisma.venueBooking.findFirst({
    where: {
      venueId: input.venueId,
      roomId: input.roomId,
      date: dateObj,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        {
          startTime: { lte: input.startTime },
          endTime: { gt: input.startTime },
        },
        {
          startTime: { lt: input.endTime },
          endTime: { gte: input.endTime },
        },
        {
          startTime: { gte: input.startTime },
          endTime: { lte: input.endTime },
        },
      ],
    },
  });

  if (conflict) {
    throw new ConflictError('该时段已被预约');
  }

  const booking = await prisma.venueBooking.create({
    data: {
      venueId: input.venueId,
      roomId: input.roomId,
      date: dateObj,
      startTime: input.startTime,
      endTime: input.endTime,
      purpose: input.purpose,
      remark: input.remark,
      bookerId,
    },
  });
  return booking;
};

// 更新场地预约
export const updateVenueBooking = async (id: string, input: UpdateVenueBookingInput) => {
  const booking = await prisma.venueBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约记录不存在');

  if (booking.status === 'CANCELLED') {
    throw new BusinessError('已取消的预约无法修改', 422);
  }

  const updateData: Prisma.VenueBookingUpdateInput = { ...input };
  if (input.date) {
    updateData.date = new Date(input.date);
  }

  const updated = await prisma.venueBooking.update({
    where: { id },
    data: updateData,
  });
  return updated;
};

// 取消场地预约
export const cancelVenueBooking = async (id: string) => {
  const booking = await prisma.venueBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约记录不存在');

  if (booking.status === 'CANCELLED') {
    throw new BusinessError('预约已取消', 422);
  }

  const updated = await prisma.venueBooking.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  return updated;
};

// 确认场地预约
export const confirmVenueBooking = async (id: string) => {
  const booking = await prisma.venueBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约记录不存在');

  if (booking.status !== 'PENDING') {
    throw new BusinessError('只能确认待确认状态的预约', 422);
  }

  const updated = await prisma.venueBooking.update({
    where: { id },
    data: { status: 'CONFIRMED' },
  });
  return updated;
};

// 删除场地预约
export const deleteVenueBooking = async (id: string) => {
  const booking = await prisma.venueBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约记录不存在');

  await prisma.venueBooking.delete({ where: { id } });
};
