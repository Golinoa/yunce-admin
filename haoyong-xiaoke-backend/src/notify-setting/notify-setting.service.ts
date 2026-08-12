import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError } from '../utils/errors';
import type { CreateNotifySettingInput, UpdateNotifySettingInput, NotifySettingListQuery, BatchUpdateNotifySettingInput } from './notify-setting.validator';

// 通知偏好列表
export const listNotifySettings = async (query: NotifySettingListQuery) => {
  const where: Prisma.NotifySettingWhereInput = {};
  if (query.group) where.group = query.group;
  if (query.enabled !== undefined) where.enabled = query.enabled;

  const list = await prisma.notifySetting.findMany({
    where,
    orderBy: [{ group: 'asc' }, { createdAt: 'asc' }],
  });

  return list;
};

// 通知偏好详情
export const getNotifySettingDetail = async (id: string) => {
  const setting = await prisma.notifySetting.findUnique({ where: { id } });
  if (!setting) throw new NotFoundError('通知偏好不存在');
  return setting;
};

// 创建通知偏好
export const createNotifySetting = async (input: CreateNotifySettingInput) => {
  const setting = await prisma.notifySetting.create({ data: input });
  return setting;
};

// 更新通知偏好
export const updateNotifySetting = async (id: string, input: UpdateNotifySettingInput) => {
  const setting = await prisma.notifySetting.findUnique({ where: { id } });
  if (!setting) throw new NotFoundError('通知偏好不存在');

  const updated = await prisma.notifySetting.update({
    where: { id },
    data: input,
  });
  return updated;
};

// 删除通知偏好
export const deleteNotifySetting = async (id: string) => {
  const setting = await prisma.notifySetting.findUnique({ where: { id } });
  if (!setting) throw new NotFoundError('通知偏好不存在');

  await prisma.notifySetting.delete({ where: { id } });
};

// 批量更新开关
export const batchUpdateNotifySetting = async (input: BatchUpdateNotifySettingInput) => {
  const result = await prisma.notifySetting.updateMany({
    where: { id: { in: input.ids } },
    data: { enabled: input.enabled },
  });
  return { updated: result.count };
};

// 按分组获取偏好（供通知发送逻辑使用）
export const getEnabledByGroup = async (group: string) => {
  const settings = await prisma.notifySetting.findMany({
    where: { group, enabled: true },
  });
  return settings;
};
