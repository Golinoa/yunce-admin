import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import type { SendNotificationInput, NotificationListQuery } from './notification.validator';

const TYPE_MAP: Record<string, string> = {
  SYSTEM: '系统',
  LEAVE: '请假',
  SCHEDULE: '排课',
  CHECKIN: '签到',
  HOMEWORK: '作业',
};

// ==================== 通知列表 ====================

export const listNotifications = async (profileId: string, query: NotificationListQuery) => {
  const { page, pageSize, type, read } = query;

  const where: Prisma.NotificationWhereInput = { receiverId: profileId };

  if (type) where.type = type;
  if (read !== undefined) where.read = read;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        sender: { select: { nickname: true } },
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { receiverId: profileId, read: false } }),
  ]);

  const list = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    typeText: TYPE_MAP[n.type] ?? n.type,
    title: n.title,
    content: n.content,
    read: n.read,
    senderName: n.sender?.nickname ?? '系统',
    createdAt: n.createdAt,
  }));

  return {
    list,
    unreadCount,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// ==================== 发送通知 ====================

export const sendNotification = async (senderProfileId: string, input: SendNotificationInput) => {
  // 校验接收者是否都是发送者的学生家长（教师只能给自己学生的家长发通知）
  const senderTeacher = await prisma.teacher.findUnique({
    where: { profileId: senderProfileId },
  });

  if (senderTeacher) {
    // 获取该教师的所有学生 ID
    const teacherStudents = await prisma.student.findMany({
      where: { teacherId: senderTeacher.id },
      select: { id: true },
    });
    const teacherStudentIds = new Set(teacherStudents.map((s) => s.id));

    // 获取接收者绑定的学生
    for (const receiverId of input.receiverIds) {
      const receiverBindings = await prisma.studentParent.findMany({
        where: { profileId: receiverId },
        select: { studentId: true },
      });
      const boundStudentIds = receiverBindings.map((b) => b.studentId).filter((id): id is string => id !== null);
      const hasBoundStudent = boundStudentIds.some((id) => teacherStudentIds.has(id));
      if (!hasBoundStudent) {
        throw new ForbiddenError('只能向自己学生的家长发送通知');
      }
    }
  }

  const data = input.receiverIds.map((receiverId) => ({
    senderId: senderProfileId,
    receiverId,
    type: input.type,
    title: input.title,
    content: input.content,
  }));

  const { count } = await prisma.notification.createMany({
    data,
    skipDuplicates: true,
  });

  return {
    sentCount: count,
  };
};

// ==================== 标记已读 ====================

export const markAsRead = async (notificationId: string, profileId: string) => {
  const notification = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notification) throw new NotFoundError('通知不存在');
  if (notification.receiverId !== profileId) throw new ForbiddenError('无权操作该通知');

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  });
};

// ==================== 批量标记已读 ====================

export const batchMarkAsRead = async (ids: string[], profileId: string) => {
  const result = await prisma.notification.updateMany({
    where: { id: { in: ids }, receiverId: profileId, read: false },
    data: { read: true },
  });
  return { updated: result.count };
};

// ==================== 全部标记已读 ====================

export const markAllAsRead = async (profileId: string) => {
  const result = await prisma.notification.updateMany({
    where: { receiverId: profileId, read: false },
    data: { read: true },
  });
  return { updated: result.count };
};

// ==================== 批量删除 ====================

export const batchDelete = async (ids: string[], profileId: string) => {
  const result = await prisma.notification.deleteMany({
    where: { id: { in: ids }, receiverId: profileId },
  });
  return { deleted: result.count };
};
