import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { NotFoundError, BusinessError } from '../utils/errors';
import type {
  CreateCardTypeInput,
  UpdateCardTypeInput,
  CardTypeListQuery,
  IssueMemberCardInput,
  UpdateMemberCardInput,
  MemberCardListQuery,
  MemberCardStatsQuery,
} from './card-type.validator';

// ==================== CardType (卡种) ====================

// 卡种列表
export const listCardTypes = async (query: CardTypeListQuery) => {
  const { page, pageSize, keyword, status, kind } = query;

  const where: Prisma.CardTypeWhereInput = {};
  if (status) where.status = status;
  if (kind) where.kind = kind;
  if (keyword) {
    where.name = { contains: keyword };
  }

  const [list, total] = await Promise.all([
    prisma.cardType.findMany({
      where,
      include: {
        _count: { select: { memberCards: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.cardType.count({ where }),
  ]);

  const cardTypesWithStats = await Promise.all(
    list.map(async (card) => {
      const stats = await getCardTypeStats(card.id);
      return {
        id: card.id,
        name: card.name,
        kind: card.kind,
        status: card.status,
        scopes: card.scopes,
        bookingMethod: card.bookingMethod,
        categoryIds: card.categoryIds,
        count: card.count,
        validDays: card.validDays,
        price: card.price,
        freezeCount: card.freezeCount,
        freezeDays: card.freezeDays,
        benefits: card.benefits,
        cardCategory: card.cardCategory,
        renewalPrice: card.renewalPrice,
        dailyMaxBookings: card.dailyMaxBookings,
        weeklyMaxBookings: card.weeklyMaxBookings,
        monthlyMaxBookings: card.monthlyMaxBookings,
        freeCancelCount: card.freeCancelCount,
        advanceBookingMinutes: card.advanceBookingMinutes,
        availableWeekdays: card.availableWeekdays,
        onlinePurchase: card.onlinePurchase,
        studentIdentityLimit: card.studentIdentityLimit,
        isGiftCard: card.isGiftCard,
        allowTransfer: card.allowTransfer,
        usageLimit: card.usageLimit,
        commissionCalc: card.commissionCalc,
        backgroundImage: card.backgroundImage,
        campusIds: card.campusIds,
        stats,
        memberCardCount: card._count.memberCards,
        createdAt: card.createdAt,
        updatedAt: card.updatedAt,
      };
    })
  );

  return {
    list: cardTypesWithStats,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 获取卡种详情
export const getCardTypeDetail = async (id: string) => {
  const cardType = await prisma.cardType.findUnique({
    where: { id },
    include: {
      memberCards: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          student: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  });
  if (!cardType) throw new NotFoundError('卡种不存在');

  const stats = await getCardTypeStats(id);

  return {
    ...cardType,
    stats,
    memberCardCount: cardType.memberCards.length,
  };
};

// 创建卡种
export const createCardType = async (input: CreateCardTypeInput) => {
  const cardType = await prisma.cardType.create({
    data: input as Prisma.CardTypeCreateInput,
  });
  return cardType;
};

// 更新卡种
export const updateCardType = async (id: string, input: UpdateCardTypeInput) => {
  const cardType = await prisma.cardType.findUnique({ where: { id } });
  if (!cardType) throw new NotFoundError('卡种不存在');

  const updated = await prisma.cardType.update({
    where: { id },
    data: input as Prisma.CardTypeUpdateInput,
  });
  return updated;
};

// 切换卡种状态
export const toggleCardTypeStatus = async (id: string, status: 'active' | 'inactive') => {
  const cardType = await prisma.cardType.findUnique({ where: { id } });
  if (!cardType) throw new NotFoundError('卡种不存在');

  const updated = await prisma.cardType.update({
    where: { id },
    data: { status },
  });
  return updated;
};

// 删除卡种
export const deleteCardType = async (id: string) => {
  const cardType = await prisma.cardType.findUnique({
    where: { id },
    include: { _count: { select: { memberCards: true } } },
  });
  if (!cardType) throw new NotFoundError('卡种不存在');

  if (cardType._count.memberCards > 0) {
    throw new BusinessError('该卡种已有会员卡，无法删除', 422);
  }

  await prisma.cardType.delete({ where: { id } });
};

// 获取卡种统计
const getCardTypeStats = async (cardTypeId: string) => {
  const cards = await prisma.memberCard.findMany({
    where: { cardTypeId },
    select: { status: true },
  });

  const sold = cards.length;
  const inUse = cards.filter((c) => c.status === 'active').length;
  const usedUp = cards.filter((c) => c.status === 'usedUp').length;
  const notActivated = cards.filter((c) => c.status === 'notActivated').length;
  const frozen = cards.filter((c) => c.status === 'frozen').length;

  return {
    sold,
    inUse,
    usedUp,
    notActivated,
    frozen,
    activeMembers: inUse,
  };
};

// ==================== MemberCard (会员卡) ====================

// 会员卡列表
export const listMemberCards = async (query: MemberCardListQuery) => {
  const { page, pageSize, cardTypeId, studentId, status } = query;

  const where: Prisma.MemberCardWhereInput = {};
  if (cardTypeId) where.cardTypeId = cardTypeId;
  if (studentId) where.studentId = studentId;
  if (status) where.status = status;

  const [list, total] = await Promise.all([
    prisma.memberCard.findMany({
      where,
      include: {
        cardType: { select: { id: true, name: true, kind: true, validDays: true, freezeCount: true, freezeDays: true, count: true } },
        student: { select: { id: true, name: true, avatar: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.memberCard.count({ where }),
  ]);

  const memberCards = list.map((card) => {
    let remainingDays: number | undefined;
    if (card.activatedAt && card.expiredAt) {
      const now = new Date();
      const diff = card.expiredAt.getTime() - now.getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      id: card.id,
      cardTypeId: card.cardTypeId,
      cardTypeName: card.cardType.name,
      studentId: card.studentId,
      studentName: card.student.name,
      studentAvatar: card.student.avatar,
      studentPhone: card.student.phone,
      status: card.status,
      remainingCount: card.remainingCount,
      remainingDays,
      purchaseAt: card.purchaseAt,
      activatedAt: card.activatedAt,
      expiredAt: card.expiredAt,
      frozenCount: card.frozenCount,
      frozenDays: card.frozenDays,
      purchasePrice: card.purchasePrice,
      source: card.source,
      operatorName: undefined,
      operatorAvatar: undefined,
      cardNo: card.cardNo,
      remark: card.remark,
      cardTypeKind: card.cardType.kind,
      cardTypeCount: card.cardType.kind === 'count' ? card.cardType.count : undefined,
      cardTypeValidDays: card.cardType.validDays,
      cardTypeFreezeCount: card.cardType.freezeCount,
      cardTypeFreezeDays: card.cardType.freezeDays,
      totalGiftCount: card.totalGiftCount,
      remainingGiftCount: card.remainingGiftCount,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    };
  });

  return {
    list: memberCards,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
};

// 根据卡种和统计维度获取会员卡列表
export const getMemberCardsByCardTypeAndStat = async (query: MemberCardStatsQuery) => {
  const { cardTypeId, stat } = query;

  const statusMap: Record<string, 'active' | 'inactive' | 'usedUp' | 'notActivated' | 'frozen'> = {
    sold: undefined as any,
    inUse: 'active',
    usedUp: 'usedUp',
    notActivated: 'notActivated',
    frozen: 'frozen',
  };

  const where: Prisma.MemberCardWhereInput = { cardTypeId };
  if (statusMap[stat]) {
    where.status = statusMap[stat];
  }

  const cardType = await prisma.cardType.findUnique({
    where: { id: cardTypeId },
    select: { id: true, name: true, kind: true, validDays: true, freezeCount: true, freezeDays: true, count: true },
  });
  if (!cardType) throw new NotFoundError('卡种不存在');

  const cards = await prisma.memberCard.findMany({
    where,
    include: {
      student: { select: { id: true, name: true, avatar: true, phone: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return cards.map((card) => {
    let remainingDays: number | undefined;
    if (card.activatedAt && card.expiredAt) {
      const now = new Date();
      const diff = card.expiredAt.getTime() - now.getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      id: card.id,
      cardTypeId: card.cardTypeId,
      cardTypeName: cardType.name,
      studentId: card.studentId,
      studentName: card.student.name,
      studentAvatar: card.student.avatar,
      studentPhone: card.student.phone,
      status: card.status,
      remainingCount: card.remainingCount,
      remainingDays,
      purchaseAt: card.purchaseAt,
      activatedAt: card.activatedAt,
      expiredAt: card.expiredAt,
      frozenCount: card.frozenCount,
      frozenDays: card.frozenDays,
      purchasePrice: card.purchasePrice,
      source: card.source,
      cardNo: card.cardNo,
      remark: card.remark,
      cardTypeKind: cardType.kind,
      cardTypeCount: cardType.kind === 'count' ? cardType.count : undefined,
      cardTypeValidDays: cardType.validDays,
      cardTypeFreezeCount: cardType.freezeCount,
      cardTypeFreezeDays: cardType.freezeDays,
      totalGiftCount: card.totalGiftCount,
      remainingGiftCount: card.remainingGiftCount,
    };
  });
};

// 根据学员获取会员卡列表
export const getMemberCardsByStudent = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError('学员不存在');

  const cards = await prisma.memberCard.findMany({
    where: { studentId },
    include: {
      cardType: { select: { id: true, name: true, kind: true, validDays: true, freezeCount: true, freezeDays: true, count: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return cards.map((card) => {
    let remainingDays: number | undefined;
    if (card.activatedAt && card.expiredAt) {
      const now = new Date();
      const diff = card.expiredAt.getTime() - now.getTime();
      remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      id: card.id,
      cardTypeId: card.cardTypeId,
      cardTypeName: card.cardType.name,
      studentId: card.studentId,
      studentName: student.name,
      studentAvatar: student.avatar,
      studentPhone: student.phone,
      status: card.status,
      remainingCount: card.remainingCount,
      remainingDays,
      purchaseAt: card.purchaseAt,
      activatedAt: card.activatedAt,
      expiredAt: card.expiredAt,
      frozenCount: card.frozenCount,
      frozenDays: card.frozenDays,
      purchasePrice: card.purchasePrice,
      source: card.source,
      cardNo: card.cardNo,
      remark: card.remark,
      cardTypeKind: card.cardType.kind,
      cardTypeCount: card.cardType.kind === 'count' ? card.cardType.count : undefined,
      cardTypeValidDays: card.cardType.validDays,
      cardTypeFreezeCount: card.cardType.freezeCount,
      cardTypeFreezeDays: card.cardType.freezeDays,
      totalGiftCount: card.totalGiftCount,
      remainingGiftCount: card.remainingGiftCount,
    };
  });
};

// 获取会员卡详情
export const getMemberCardDetail = async (id: string) => {
  const card = await prisma.memberCard.findUnique({
    where: { id },
    include: {
      cardType: true,
      student: { select: { id: true, name: true, avatar: true, phone: true } },
    },
  });
  if (!card) throw new NotFoundError('会员卡不存在');

  let remainingDays: number | undefined;
  if (card.activatedAt && card.expiredAt) {
    const now = new Date();
    const diff = card.expiredAt.getTime() - now.getTime();
    remainingDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  return {
    id: card.id,
    cardTypeId: card.cardTypeId,
    cardTypeName: card.cardType.name,
    studentId: card.studentId,
    studentName: card.student.name,
    studentAvatar: card.student.avatar,
    studentPhone: card.student.phone,
    status: card.status,
    remainingCount: card.remainingCount,
    remainingDays,
    purchaseAt: card.purchaseAt,
    activatedAt: card.activatedAt,
    expiredAt: card.expiredAt,
    frozenCount: card.frozenCount,
    frozenDays: card.frozenDays,
    purchasePrice: card.purchasePrice,
    source: card.source,
    cardNo: card.cardNo,
    remark: card.remark,
    cardTypeKind: card.cardType.kind,
    cardTypeCount: card.cardType.kind === 'count' ? card.cardType.count : undefined,
    cardTypeValidDays: card.cardType.validDays,
    cardTypeFreezeCount: card.cardType.freezeCount,
    cardTypeFreezeDays: card.cardType.freezeDays,
    cardBenefits: card.cardType.benefits,
    totalGiftCount: card.totalGiftCount,
    remainingGiftCount: card.remainingGiftCount,
    createdAt: card.createdAt,
    updatedAt: card.updatedAt,
  };
};

// 发放会员卡
export const issueMemberCard = async (input: IssueMemberCardInput, operatorId?: string) => {
  const cardType = await prisma.cardType.findUnique({ where: { id: input.cardTypeId } });
  if (!cardType) throw new NotFoundError('卡种不存在');

  if (cardType.status !== 'active') {
    throw new BusinessError('该卡种已停售', 422);
  }

  const student = await prisma.student.findUnique({ where: { id: input.studentId } });
  if (!student) throw new NotFoundError('学员不存在');

  const purchaseAt = input.purchaseAt ? new Date(input.purchaseAt) : new Date();
  const activatedAt = input.activatedAt ? new Date(input.activatedAt) : purchaseAt;
  const expiredAt = input.expiredAt
    ? new Date(input.expiredAt)
    : new Date(purchaseAt.getTime() + cardType.validDays * 24 * 60 * 60 * 1000);

  const remainingCount = cardType.kind === 'count' ? (cardType.count || 0) : undefined;

  const memberCard = await prisma.memberCard.create({
    data: {
      cardTypeId: input.cardTypeId,
      studentId: input.studentId,
      status: 'active',
      remainingCount,
      purchaseAt,
      activatedAt,
      expiredAt,
      purchasePrice: input.purchasePrice,
      source: input.source,
      operatorId,
      cardNo: input.cardNo,
      remark: input.remark,
      totalGiftCount: input.totalGiftCount,
      remainingGiftCount: input.totalGiftCount,
    },
  });

  return memberCard;
};

// 更新会员卡
export const updateMemberCard = async (id: string, input: UpdateMemberCardInput) => {
  const card = await prisma.memberCard.findUnique({ where: { id } });
  if (!card) throw new NotFoundError('会员卡不存在');

  const updated = await prisma.memberCard.update({
    where: { id },
    data: input,
  });
  return updated;
};

// 冻卡/解冻
export const freezeMemberCard = async (id: string, freeze: boolean) => {
  const card = await prisma.memberCard.findUnique({
    where: { id },
    include: { cardType: true },
  });
  if (!card) throw new NotFoundError('会员卡不存在');

  if (freeze) {
    if (card.frozenCount >= card.cardType.freezeCount) {
      throw new BusinessError('已超过最大冻卡次数', 422);
    }
    return prisma.memberCard.update({
      where: { id },
      data: {
        status: 'frozen',
        frozenCount: { increment: 1 },
      },
    });
  } else {
    return prisma.memberCard.update({
      where: { id },
      data: {
        status: 'active',
      },
    });
  }
};

// 删除会员卡
export const deleteMemberCard = async (id: string) => {
  const card = await prisma.memberCard.findUnique({ where: { id } });
  if (!card) throw new NotFoundError('会员卡不存在');

  await prisma.memberCard.delete({ where: { id } });
};
