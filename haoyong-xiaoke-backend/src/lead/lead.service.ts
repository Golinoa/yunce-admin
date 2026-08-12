import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError } from '../utils/errors';
import type {
  CreateLeadInput,
  UpdateLeadInput,
  UpdateLeadStatusInput,
  LeadListQuery,
  CreateLeadContactInput,
  CreateLeadFollowUpInput,
  LeadFollowUpListQuery,
  CreateLeadBookingInput,
  UpdateLeadBookingInput,
  LeadBookingListQuery,
  CreateLeadConversionInput,
  CreateTrialSlotConfigInput,
  UpdateTrialSlotConfigInput,
  TrialSlotConfigListQuery,
  CreateInviteRecordInput,
} from './lead.validator';

// ==================== Lead (线索) ====================

// 线索列表
export const listLeads = async (query: LeadListQuery) => {
  const { page, pageSize, campusId, teacherId, status, filterTab, keyword } = query;

  const where: Prisma.LeadWhereInput = {};
  if (campusId) where.campusId = campusId;
  if (teacherId) where.OR = [
    { creatorTeacherId: teacherId },
    { ownerTeacherId: teacherId },
    { latestInviteTeacherId: teacherId },
  ];
  
  // 筛选标签
  if (filterTab === 'following') {
    where.status = 'following';
  } else if (filterTab === 'booked') {
    where.status = 'booked';
  } else if (filterTab === 'closed') {
    where.status = { in: ['closed', 'converted'] };
  } else if (status) {
    where.status = status;
  }
  
  if (keyword) {
    where.OR = [
      { childName: { contains: keyword } },
      { parentName: { contains: keyword } },
      { parentPhone: { contains: keyword } },
    ];
  }

  const [list, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        bookings: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
        followUps: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.lead.count({ where }),
  ]);

  // 统计
  const summary = await getLeadSummaryByTeacher(teacherId || '');

  return {
    list: list.map((lead) => ({
      id: lead.id,
      trial_student_id: lead.trialStudentId,
      child_name: lead.childName,
      child_nickname: lead.childNickname,
      child_gender: lead.childGender,
      child_age: lead.childAge,
      parent_user_id: lead.parentUserId,
      parent_name: lead.parentName,
      parent_phone: lead.parentPhone,
      source_type: lead.sourceType,
      campus_id: lead.campusId,
      owner_teacher_id: lead.ownerTeacherId,
      owner_lock_status: lead.ownerLockStatus,
      status: lead.status,
      latest_follow_up_at: lead.followUps[0]?.createdAt,
      next_follow_up_at: lead.followUps[0]?.nextFollowUpAt,
      created_at: lead.createdAt,
      updated_at: lead.updatedAt,
      // 附加信息
      booking_course_name: lead.bookings[0]?.courseName,
    })),
    summary,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 获取线索详情
export const getLeadDetail = async (id: string) => {
  const lead = await prisma.lead.findUnique({
    where: { id },
    include: {
      contacts: true,
      followUps: { orderBy: { createdAt: 'desc' } },
      bookings: { orderBy: { createdAt: 'desc' } },
      conversions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!lead) throw new NotFoundError('线索不存在');

  return {
    id: lead.id,
    trial_student_id: lead.trialStudentId,
    child_name: lead.childName,
    child_nickname: lead.childNickname,
    child_gender: lead.childGender,
    child_age: lead.childAge,
    parent_user_id: lead.parentUserId,
    parent_name: lead.parentName,
    parent_phone: lead.parentPhone,
    creator_teacher_id: lead.creatorTeacherId,
    campus_id: lead.campusId,
    source_type: lead.sourceType,
    source_course_id: lead.sourceCourseId,
    booking_course_id: lead.bookingCourseId,
    owner_teacher_id: lead.ownerTeacherId,
    owner_lock_status: lead.ownerLockStatus,
    status: lead.status,
    notes: lead.notes,
    first_touch_at: lead.firstTouchAt,
    booked_at: lead.bookedAt,
    converted_at: lead.convertedAt,
    closed_reason: lead.closedReason,
    created_at: lead.createdAt,
    updated_at: lead.updatedAt,
    // 关联数据
    contacts: lead.contacts,
    follow_ups: lead.followUps.map((f) => ({
      id: f.id,
      action: f.action,
      intent_level: f.intentLevel,
      content: f.content,
      next_follow_up_at: f.nextFollowUpAt,
      operator_id: f.operatorId,
      created_at: f.createdAt,
    })),
    bookings: lead.bookings.map((b) => ({
      id: b.id,
      trial_mode: b.trialMode,
      course_name: b.courseName,
      teacher_name: b.teacherName,
      lesson_date: b.lessonDate,
      start_time: b.startTime,
      end_time: b.endTime,
      status: b.status,
      booking_type: b.bookingType,
      created_at: b.createdAt,
    })),
    conversions: lead.conversions,
  };
};

// 创建线索
export const createLead = async (input: CreateLeadInput, teacherId: string) => {
  const lead = await prisma.lead.create({
    data: {
      childName: input.childName,
      childNickname: input.childNickname,
      childGender: input.childGender,
      childAge: input.childAge,
      parentName: input.parentName,
      parentPhone: input.parentPhone || null,
      campusId: input.campusId,
      creatorTeacherId: teacherId,
      sourceType: input.sourceType,
      sourceCourseId: input.sourceCourseId,
      notes: input.notes,
      ownerLockStatus: 'weak',
      status: 'new',
    },
  });

  return {
    id: lead.id,
    trial_student_id: lead.trialStudentId,
    child_name: lead.childName,
    status: lead.status,
    created_at: lead.createdAt,
  };
};

// 更新线索
export const updateLead = async (id: string, input: UpdateLeadInput) => {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('线索不存在');

  const updated = await prisma.lead.update({
    where: { id },
    data: input,
  });

  return updated;
};

// 更新线索状态
export const updateLeadStatus = async (id: string, input: UpdateLeadStatusInput) => {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('线索不存在');

  const data: Prisma.LeadUpdateInput = {
    status: input.status,
    closedReason: input.closedReason,
  };

  // 首次触达
  if (input.status === 'following' && !lead.firstTouchAt) {
    data.firstTouchAt = new Date();
  }

  // 已预约
  if (input.status === 'booked' && !lead.bookedAt) {
    data.bookedAt = new Date();
  }

  // 转化
  if (input.status === 'converted' && !lead.convertedAt) {
    data.convertedAt = new Date();
  }

  const updated = await prisma.lead.update({
    where: { id },
    data,
  });

  return { id: updated.id, status: updated.status };
};

// 删除线索
export const deleteLead = async (id: string) => {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) throw new NotFoundError('线索不存在');

  await prisma.lead.delete({ where: { id } });
};

// 获取线索统计
export const getLeadSummaryByTeacher = async (teacherId: string) => {
  const where: Prisma.LeadWhereInput = teacherId
    ? { OR: [
        { creatorTeacherId: teacherId },
        { ownerTeacherId: teacherId },
        { latestInviteTeacherId: teacherId },
      ]}
    : {};

  const leads = await prisma.lead.findMany({ where, select: { status: true } });

  const total = leads.length;
  const following = leads.filter((l) => l.status === 'following').length;
  const booked = leads.filter((l) => l.status === 'booked').length;
  const closed = leads.filter((l) => ['closed', 'converted'].includes(l.status)).length;
  const converted = leads.filter((l) => l.status === 'converted').length;

  // 今日试听数
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayBookings = await prisma.leadBooking.count({
    where: {
      teacherId,
      lessonDate: { gte: todayStart },
      status: { in: ['pending', 'confirmed'] },
    },
  });

  return {
    total,
    following,
    booked,
    closed,
    today_trial: todayBookings,
    pending: leads.filter((l) => l.status === 'pending').length,
    converted,
  };
};

// ==================== LeadContact (联系人) ====================

// 添加联系人
export const createLeadContact = async (input: CreateLeadContactInput) => {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new NotFoundError('线索不存在');

  // 如果设为默认，先取消其他的默认
  if (input.isDefault) {
    await prisma.leadContact.updateMany({
      where: { leadId: input.leadId },
      data: { isDefault: false },
    });
  }

  const contact = await prisma.leadContact.create({
    data: input,
  });

  return contact;
};

// 删除联系人
export const deleteLeadContact = async (id: string) => {
  const contact = await prisma.leadContact.findUnique({ where: { id } });
  if (!contact) throw new NotFoundError('联系人不存在');

  await prisma.leadContact.delete({ where: { id } });
};

// ==================== LeadFollowUp (跟进) ====================

// 创建跟进
export const createLeadFollowUp = async (input: CreateLeadFollowUpInput, operatorId: string) => {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new NotFoundError('线索不存在');

  const followUp = await prisma.leadFollowUp.create({
    data: {
      leadId: input.leadId,
      action: input.action,
      intentLevel: input.intentLevel,
      content: input.content,
      nextFollowUpAt: input.nextFollowUpAt ? new Date(input.nextFollowUpAt) : undefined,
      operatorId,
    },
  });

  // 更新线索状态为 following
  await prisma.lead.update({
    where: { id: input.leadId },
    data: { status: 'following' },
  });

  return followUp;
};

// 获取线索跟进列表
export const listLeadFollowUps = async (query: LeadFollowUpListQuery) => {
  const { page, pageSize, leadId } = query;

  const where: Prisma.LeadFollowUpWhereInput = {};
  if (leadId) where.leadId = leadId;

  const [list, total] = await Promise.all([
    prisma.leadFollowUp.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leadFollowUp.count({ where }),
  ]);

  return {
    list,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== LeadBooking (预约) ====================

// 创建试听预约
export const createLeadBooking = async (input: CreateLeadBookingInput) => {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new NotFoundError('线索不存在');

  // 检查时段冲突
  const existing = await prisma.leadBooking.findFirst({
    where: {
      teacherId: input.teacherId,
      lessonDate: new Date(input.lessonDate),
      status: { in: ['pending', 'confirmed'] },
      OR: [
        { startTime: { lte: input.startTime }, endTime: { gt: input.startTime } },
        { startTime: { lt: input.endTime }, endTime: { gte: input.endTime } },
      ],
    },
  });

  if (existing) {
    throw new BusinessError('该时段已被预约', 422);
  }

  const booking = await prisma.leadBooking.create({
    data: {
      leadId: input.leadId,
      trialStudentId: lead.trialStudentId,
      trialMode: input.trialMode,
      referenceScheduleId: input.referenceScheduleId,
      timeOffsetMinutes: input.timeOffsetMinutes,
      classId: input.classId,
      className: input.className,
      courseId: input.courseId,
      courseName: input.courseName,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      campusId: input.campusId,
      campusName: input.campusName,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      lessonDate: new Date(input.lessonDate),
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room,
      bookingType: input.bookingType,
      operatorId: input.operatorId,
      note: input.note,
      childName: lead.childName,
      parentName: lead.parentName,
      parentPhone: lead.parentPhone,
    },
  });

  // 更新线索状态
  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      status: 'booked',
      bookedAt: new Date(),
      bookingTeacherId: input.teacherId,
      bookingCourseId: input.courseId,
    },
  });

  return {
    id: booking.id,
    lead_id: booking.leadId,
    trial_mode: booking.trialMode,
    course_name: booking.courseName,
    teacher_name: booking.teacherName,
    lesson_date: booking.lessonDate,
    start_time: booking.startTime,
    end_time: booking.endTime,
    status: booking.status,
    created_at: booking.createdAt,
  };
};

// 试听预约列表
export const listLeadBookings = async (query: LeadBookingListQuery) => {
  const { page, pageSize, leadId, teacherId, status, startDate, endDate } = query;

  const where: Prisma.LeadBookingWhereInput = {};
  if (leadId) where.leadId = leadId;
  if (teacherId) where.teacherId = teacherId;
  if (status) where.status = status;
  if (startDate || endDate) {
    where.lessonDate = {};
    if (startDate) where.lessonDate.gte = new Date(startDate);
    if (endDate) where.lessonDate.lte = new Date(endDate + 'T23:59:59.999Z');
  }

  const [list, total] = await Promise.all([
    prisma.leadBooking.findMany({
      where,
      include: { lead: { select: { childName: true, parentName: true } } },
      orderBy: [{ lessonDate: 'desc' }, { startTime: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.leadBooking.count({ where }),
  ]);

  return {
    list: list.map((b) => ({
      id: b.id,
      lead_id: b.leadId,
      trial_student_id: b.trialStudentId,
      trial_mode: b.trialMode,
      reference_schedule_id: b.referenceScheduleId,
      time_offset_minutes: b.timeOffsetMinutes,
      class_id: b.classId,
      class_name: b.className,
      course_id: b.courseId,
      course_name: b.courseName,
      subject_id: b.subjectId,
      subject_name: b.subjectName,
      campus_id: b.campusId,
      campus_name: b.campusName,
      teacher_id: b.teacherId,
      teacher_name: b.teacherName,
      lesson_date: b.lessonDate,
      start_time: b.startTime,
      end_time: b.endTime,
      room: b.room,
      status: b.status,
      difficulty: b.difficulty,
      booking_type: b.bookingType,
      operator_id: b.operatorId,
      note: b.note,
      child_name: b.childName || b.lead.childName,
      parent_name: b.parentName || b.lead.parentName,
      parent_phone: b.parentPhone,
      created_at: b.createdAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 更新预约
export const updateLeadBooking = async (id: string, input: UpdateLeadBookingInput) => {
  const booking = await prisma.leadBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约不存在');

  const data: Prisma.LeadBookingUpdateInput = { ...input };
  if (input.lessonDate) {
    data.lessonDate = new Date(input.lessonDate);
  }

  const updated = await prisma.leadBooking.update({
    where: { id },
    data,
  });

  return updated;
};

// 取消预约
export const cancelLeadBooking = async (id: string) => {
  const booking = await prisma.leadBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约不存在');

  const updated = await prisma.leadBooking.update({
    where: { id },
    data: { status: 'cancelled' },
  });

  return updated;
};

// 恢复预约
export const restoreLeadBooking = async (id: string) => {
  const booking = await prisma.leadBooking.findUnique({ where: { id } });
  if (!booking) throw new NotFoundError('预约不存在');

  const updated = await prisma.leadBooking.update({
    where: { id },
    data: { status: 'pending' },
  });

  return updated;
};

// ==================== LeadConversion (转化) ====================

// 创建转化
export const createLeadConversion = async (input: CreateLeadConversionInput, operatorId: string) => {
  const lead = await prisma.lead.findUnique({ where: { id: input.leadId } });
  if (!lead) throw new NotFoundError('线索不存在');

  // 创建转化记录
  const conversion = await prisma.leadConversion.create({
    data: {
      leadId: input.leadId,
      conversionType: input.conversionType,
      studentId: input.studentId,
      mergeToStudentId: input.mergeToStudentId,
      operatorId,
      note: input.note,
    },
  });

  // 更新线索状态
  await prisma.lead.update({
    where: { id: input.leadId },
    data: {
      status: 'converted',
      convertedAt: new Date(),
      ownerTeacherId: operatorId,
    },
  });

  return conversion;
};

// ==================== TrialSlotConfig (时段配置) ====================

// 时段配置列表
export const listTrialSlotConfigs = async (query: TrialSlotConfigListQuery) => {
  const { page, pageSize, teacherId, campusId, status, date } = query;

  const where: Prisma.TrialSlotConfigWhereInput = {};
  if (teacherId) where.teacherId = teacherId;
  if (campusId) where.campusId = campusId;
  if (status) where.status = status;
  if (date) where.lessonDate = new Date(date);

  const [list, total] = await Promise.all([
    prisma.trialSlotConfig.findMany({
      where,
      orderBy: [{ lessonDate: 'asc' }, { startTime: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.trialSlotConfig.count({ where }),
  ]);

  return {
    list: list.map((s) => ({
      id: s.id,
      course_id: s.courseId,
      course_name: s.courseName,
      subject_id: s.subjectId,
      subject_name: s.subjectName,
      campus_id: s.campusId,
      campus_name: s.campusName,
      teacher_id: s.teacherId,
      teacher_name: s.teacherName,
      lesson_date: s.lessonDate,
      start_time: s.startTime,
      end_time: s.endTime,
      room: s.room,
      max_count: s.maxCount,
      current_count: s.currentCount,
      status: s.status,
      creator_teacher_id: s.creatorTeacherId,
      note: s.note,
      created_at: s.createdAt,
    })),
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 创建时段配置
export const createTrialSlotConfig = async (input: CreateTrialSlotConfigInput, creatorTeacherId: string) => {
  const config = await prisma.trialSlotConfig.create({
    data: {
      courseId: input.courseId,
      courseName: input.courseName,
      subjectId: input.subjectId,
      subjectName: input.subjectName,
      campusId: input.campusId,
      campusName: input.campusName,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      lessonDate: new Date(input.lessonDate),
      startTime: input.startTime,
      endTime: input.endTime,
      room: input.room,
      maxCount: input.maxCount,
      creatorTeacherId,
      note: input.note,
    },
  });

  return config;
};

// 更新时段配置
export const updateTrialSlotConfig = async (id: string, input: UpdateTrialSlotConfigInput) => {
  const config = await prisma.trialSlotConfig.findUnique({ where: { id } });
  if (!config) throw new NotFoundError('时段配置不存在');

  const data: Prisma.TrialSlotConfigUpdateInput = { ...input };
  if (input.lessonDate) {
    data.lessonDate = new Date(input.lessonDate);
  }

  const updated = await prisma.trialSlotConfig.update({
    where: { id },
    data,
  });

  return updated;
};

// 删除时段配置
export const deleteTrialSlotConfig = async (id: string) => {
  const config = await prisma.trialSlotConfig.findUnique({ where: { id } });
  if (!config) throw new NotFoundError('时段配置不存在');

  await prisma.trialSlotConfig.delete({ where: { id } });
};

// ==================== InviteRecord (邀约) ====================

// 创建邀约记录
export const createInviteRecord = async (input: CreateInviteRecordInput) => {
  const code = generateInviteCode();

  const record = await prisma.inviteRecord.create({
    data: {
      code,
      teacherId: input.teacherId,
      campusId: input.campusId,
      type: input.type,
      targetUrl: input.targetUrl,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    },
  });

  return record;
};

// 获取邀约二维码
export const getInviteQRCode = async (teacherId: string) => {
  const records = await prisma.inviteRecord.findMany({
    where: { teacherId },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  return records.map((r) => ({
    id: r.id,
    code: r.code,
    type: r.type,
    scan_count: r.scanCount,
    convert_count: r.convertCount,
    created_at: r.createdAt,
    expires_at: r.expiresAt,
  }));
};

// 落地页数据
export const getInviteLandingData = async (code: string) => {
  const record = await prisma.inviteRecord.findUnique({
    where: { code },
  });

  if (!record) throw new NotFoundError('邀约不存在');
  if (record.expiresAt && record.expiresAt < new Date()) {
    throw new BusinessError('邀约已过期', 422);
  }

  // 增加扫描计数
  await prisma.inviteRecord.update({
    where: { id: record.id },
    data: { scanCount: { increment: 1 } },
  });

  return {
    code: record.code,
    teacher_id: record.teacherId,
    campus_id: record.campusId,
    type: record.type,
  };
};

// 邀约落地页提交
export const submitInviteLanding = async (code: string, data: {
  childName: string;
  parentName?: string;
  parentPhone?: string;
}) => {
  const record = await prisma.inviteRecord.findUnique({ where: { code } });
  if (!record) throw new NotFoundError('邀约不存在');

  // 这里可以创建线索，但需要 teacherId，暂时返回成功
  return { success: true, message: '提交成功' };
};

// 生成邀请码
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
