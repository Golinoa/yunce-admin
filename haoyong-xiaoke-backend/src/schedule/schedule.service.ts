import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError, BusinessError } from '../utils/errors';
import type { CreateScheduleInput, UpdateScheduleInput, ScheduleListQuery, TodayScheduleQuery, WeekScheduleQuery, BatchCreateScheduleInput } from './schedule.validator';

const DAY_MAP = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const;

// 本地时间格式化 YYYY-MM-DD
const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// ==================== 排课列表 ====================

export const listSchedules = async (teacherId: string, query: ScheduleListQuery) => {
  const { page, pageSize, classId, dayOfWeek } = query;

  const where: Prisma.ScheduleWhereInput = { teacherId };

  if (classId) where.classId = classId;
  if (dayOfWeek !== undefined && dayOfWeek !== null) where.dayOfWeek = dayOfWeek;

  const [schedules, total] = await Promise.all([
    prisma.schedule.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        class: { select: { id: true, name: true } },
      },
    }),
    prisma.schedule.count({ where }),
  ]);

  const list = schedules.map((s) => ({
    id: s.id,
    classId: s.classId,
    className: s.class?.name ?? null,
    dayOfWeek: s.dayOfWeek,
    dayOfWeekText: DAY_MAP[s.dayOfWeek],
    startTime: s.startTime,
    endTime: s.endTime,
    startDate: s.startDate ? formatDate(s.startDate) : null,
    endDate: s.endDate ? formatDate(s.endDate) : null,
    createdAt: s.createdAt,
  }));

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 创建排课 ====================

export const createSchedule = async (teacherId: string, input: CreateScheduleInput) => {
  // 验证班级归属
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new NotFoundError('班级不存在');
  if (cls.teacherId !== teacherId) throw new ForbiddenError('无权操作该班级');

  const data: Prisma.ScheduleCreateInput = {
    teacher: { connect: { id: teacherId } },
    class: { connect: { id: input.classId } },
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    startDate: input.startDate ? new Date(input.startDate) : undefined,
    endDate: input.endDate ? new Date(input.endDate) : undefined,
  };

  return prisma.schedule.create({ data });
};

// ==================== 更新排课 ====================

export const updateSchedule = async (scheduleId: string, teacherId: string, input: UpdateScheduleInput) => {
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw new NotFoundError('排课不存在');
  if (schedule.teacherId !== teacherId) throw new ForbiddenError('无权操作该排课');

  // 验证班级归属
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new NotFoundError('班级不存在');
  if (cls.teacherId !== teacherId) throw new ForbiddenError('无权操作该班级');

  const data: Prisma.ScheduleUpdateInput = {
    class: { connect: { id: input.classId } },
    dayOfWeek: input.dayOfWeek,
    startTime: input.startTime,
    endTime: input.endTime,
    startDate: input.startDate ? new Date(input.startDate) : null,
    endDate: input.endDate ? new Date(input.endDate) : null,
  };

  return prisma.schedule.update({ where: { id: scheduleId }, data });
};

// ==================== 删除排课 ====================

export const deleteSchedule = async (scheduleId: string, teacherId: string) => {
  const schedule = await prisma.schedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw new NotFoundError('排课不存在');
  if (schedule.teacherId !== teacherId) throw new ForbiddenError('无权操作该排课');

  await prisma.schedule.delete({ where: { id: scheduleId } });
};

// ==================== 排课详情 ====================

export const getScheduleDetail = async (scheduleId: string, teacherId: string) => {
  const schedule = await prisma.schedule.findUnique({
    where: { id: scheduleId },
    include: {
      class: { select: { id: true, name: true, subject: true, color: true } },
    },
  });

  if (!schedule) throw new NotFoundError('排课不存在');
  if (schedule.teacherId !== teacherId) throw new ForbiddenError('无权查看该排课');

  return {
    id: schedule.id,
    classId: schedule.classId,
    class: schedule.class,
    studentId: schedule.studentId,
    dayOfWeek: schedule.dayOfWeek,
    dayOfWeekText: DAY_MAP[schedule.dayOfWeek],
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    startDate: schedule.startDate ? formatDate(schedule.startDate) : null,
    endDate: schedule.endDate ? formatDate(schedule.endDate) : null,
    color: schedule.color,
    note: schedule.note,
    reminderMinutes: schedule.reminderMinutes,
    room: schedule.room,
    tag: schedule.tag,
    courseType: schedule.courseType,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
  };
};

// ==================== 检查排课冲突 ====================

export const checkConflict = async (
  teacherId: string,
  input: {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    excludeScheduleId?: string;
  },
) => {
  const where: Prisma.ScheduleWhereInput = {
    teacherId,
    dayOfWeek: input.dayOfWeek,
    // 时间重叠：新排课的开始时间 < 已有结束时间 且 新排课的结束时间 > 已有开始时间
    startTime: { lt: input.endTime },
    endTime: { gt: input.startTime },
  };

  if (input.excludeScheduleId) {
    where.id = { not: input.excludeScheduleId };
  }

  const conflicts = await prisma.schedule.findMany({
    where,
    include: {
      class: { select: { id: true, name: true } },
    },
  });

  return {
    hasConflict: conflicts.length > 0,
    conflicts: conflicts.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class?.name ?? null,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
    })),
  };
};

// ==================== 查询节假日信息 ====================

const getHolidaysInRange = async (startDate: Date, endDate: Date) => {
  return prisma.holiday.findMany({
    where: {
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
  });
};

// 判断某日期是否在节假日范围内
const isDateHoliday = (date: Date, holidays: { startDate: Date; endDate: Date; name: string; icon: string }[]) => {
  for (const h of holidays) {
    if (date >= h.startDate && date <= new Date(h.endDate.getTime() + 86400000 - 1)) {
      return { isHoliday: true, holidayName: h.name, holidayIcon: h.icon };
    }
  }
  return { isHoliday: false, holidayName: null, holidayIcon: null };
};

// ==================== 今日课表 ====================

export const getTodaySchedule = async (teacherId: string, query: TodayScheduleQuery) => {
  const targetDate = query.date ? new Date(query.date) : new Date();
  const dayOfWeek = targetDate.getDay();

  // 查询该教师当天所有排课
  const schedules = await prisma.schedule.findMany({
    where: {
      teacherId,
      dayOfWeek,
      // 排课日期范围需包含目标日期
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: targetDate }, endDate: { gte: targetDate } },
        { startDate: null, endDate: { gte: targetDate } },
        { startDate: { lte: targetDate }, endDate: null },
      ],
    },
    include: {
      class: { select: { id: true, name: true, subject: true, color: true, students: { include: { student: { select: { id: true, name: true } } } } } },
    },
    orderBy: { startTime: 'asc' },
  });

  // 查询当天是否为节假日
  const holidays = await getHolidaysInRange(targetDate, targetDate);
  const holidayInfo = isDateHoliday(targetDate, holidays);

  const dateStr = formatDate(targetDate);

  return {
    date: dateStr,
    dayOfWeek,
    dayOfWeekText: DAY_MAP[dayOfWeek],
    ...holidayInfo,
    schedules: schedules.map((s) => ({
      id: s.id,
      classId: s.classId,
      className: s.class?.name ?? null,
      subject: s.class?.subject ?? null,
      color: s.class?.color ?? null,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      note: s.note,
      students: s.class?.students?.map((cs) => cs.student) ?? [],
    })),
  };
};

// ==================== 周课表 ====================

export const getWeekSchedule = async (teacherId: string, query: WeekScheduleQuery) => {
  const refDate = query.date ? new Date(query.date) : new Date();
  // 计算本周一
  const dayOfWeek = refDate.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(refDate);
  monday.setDate(monday.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // 查询该教师本周所有排课
  const schedules = await prisma.schedule.findMany({
    where: {
      teacherId,
      dayOfWeek: { gte: 0, lte: 6 },
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: sunday }, endDate: { gte: monday } },
        { startDate: null, endDate: { gte: monday } },
        { startDate: { lte: sunday }, endDate: null },
      ],
    },
    include: {
      class: { select: { id: true, name: true, subject: true, color: true } },
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });

  // 查询本周节假日
  const holidays = await getHolidaysInRange(monday, sunday);

  // 按天组装课表
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dow = d.getDay();
    const holidayInfo = isDateHoliday(d, holidays);

    days.push({
      date: formatDate(d),
      dayOfWeek: dow,
      dayOfWeekText: DAY_MAP[dow],
      ...holidayInfo,
      schedules: schedules
        .filter((s) => s.dayOfWeek === dow)
        .map((s) => ({
          id: s.id,
          classId: s.classId,
          className: s.class?.name ?? null,
          subject: s.class?.subject ?? null,
          color: s.class?.color ?? null,
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room,
          note: s.note,
        })),
    });
  }

  return {
    weekStart: formatDate(monday),
    weekEnd: formatDate(sunday),
    days,
  };
};

// ==================== 批量排课 ====================

export const batchCreateSchedules = async (teacherId: string, input: BatchCreateScheduleInput) => {
  const cls = await prisma.class.findUnique({ where: { id: input.classId } });
  if (!cls) throw new NotFoundError('班级不存在');
  if (cls.teacherId !== teacherId) throw new ForbiddenError('无权操作该班级');

  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);

  // 查询日期范围内的节假日
  const holidays = input.skipHoliday ? await getHolidaysInRange(startDate, endDate) : [];

  // 按 dayOfWeek 去重，每个星期几只创建一条循环排课
  const uniqueDays: number[] = [];
  for (const dow of input.dayOfWeeks) {
    if (!uniqueDays.includes(dow)) {
      uniqueDays.push(dow);
    }
  }

  // 检查每个 dayOfWeek 在日期范围内是否有非节假日的日期
  const validDays: { dayOfWeek: number; skippedHolidays: string[] }[] = [];
  for (const dow of uniqueDays) {
    let hasValidDate = false;
    const skippedHolidays: string[] = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      if (current.getDay() === dow) {
        if (input.skipHoliday) {
          const holidayInfo = isDateHoliday(current, holidays);
          if (holidayInfo.isHoliday) {
            skippedHolidays.push(formatDate(current));
            current.setDate(current.getDate() + 7);
            continue;
          }
        }
        hasValidDate = true;
        break;
      }
      current.setDate(current.getDate() + 1);
    }
    if (hasValidDate) {
      validDays.push({ dayOfWeek: dow, skippedHolidays });
    }
  }

  if (validDays.length === 0) {
    throw new BusinessError('所选日期范围内没有可排课的日期（可能全部是节假日）', 422);
  }

  // 检查时间冲突
  for (const { dayOfWeek } of validDays) {
    const conflict = await prisma.schedule.findFirst({
      where: {
        teacherId,
        dayOfWeek,
        startTime: { lt: input.endTime },
        endTime: { gt: input.startTime },
      },
    });
    if (conflict) {
      throw new BusinessError(`${DAY_MAP[dayOfWeek]} ${input.startTime}-${input.endTime} 与已有排课冲突`, 422);
    }
  }

  // 批量创建（每个 dayOfWeek 一条循环排课）
  const result = await prisma.$transaction(
    validDays.map(({ dayOfWeek }) =>
      prisma.schedule.create({
        data: {
          teacher: { connect: { id: teacherId } },
          class: { connect: { id: input.classId } },
          dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          startDate: new Date(input.startDate),
          endDate: new Date(input.endDate),
        },
      }),
    ),
  );

  // 统计跳过的节假日数量
  const totalSkipped = validDays.reduce((sum, d) => sum + d.skippedHolidays.length, 0);

  return {
    created: result.length,
    skipped: totalSkipped,
    schedules: result.map((r) => ({
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      dayOfWeekText: DAY_MAP[r.dayOfWeek],
      startTime: r.startTime,
      endTime: r.endTime,
    })),
  };
};
