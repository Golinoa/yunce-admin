import {
  ActivationCodeStatus,
  ActivityStatus,
  BannerStatus,
  FeedbackHandleStatus,
  MembershipSource,
  MembershipStatus,
  PointChangeSource,
  PointType,
  Prisma,
} from '@prisma/client';
import { prisma } from '../config/database';
import env from '../config/env';
import { comparePassword, hashPassword } from '../utils/password';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors';
import {
  generateAdminTokenPair,
  verifyAdminRefreshToken,
} from '../utils/admin-jwt';
import type {
  ActivationCodeListQuery,
  AuditLogListQuery,
  BatchDeleteActivationCodesInput,
  BatchCreateActivationCodesInput,
  CreateActivityInput,
  CreateBannerInput,
  CreateMembershipPlanInput,
  DashboardQuery,
  FeedbackListQuery,
  GrantMembershipInput,
  InviteListQuery,
  InviteRuleInput,
  LoginInput,
  MembershipGrantListQuery,
  PointAdjustInput,
  PointRecordListQuery,
  UpdateFeedbackHandleInput,
  UpdateActivityInput,
  UpdateBannerInput,
  UpdateMembershipPlanInput,
  UserListQuery,
} from './admin.validator';

const ADMIN_ROLE = 'ADMIN' as const;
const DEFAULT_ADMIN_USERNAME = env.ADMIN_INIT_USERNAME;
const DEFAULT_ADMIN_PASSWORD = env.ADMIN_INIT_PASSWORD;
const PRINCIPAL_ROLE = 'PRINCIPAL' as const;

const CONTENT_SLOT_OPTIONS = [
  { key: 'HOME_BANNER', label: '小程序首页轮播' },
  { key: 'HOME_POPUP', label: '小程序首页弹窗' },
  { key: 'HOME_CARD', label: '小程序首页活动卡片' },
  { key: 'HOME_NOTICE', label: '小程序首页公告条' },
  { key: 'HOME_FLOATING', label: '小程序首页浮窗' },
] as const;

const ACTION_TYPE_OPTIONS = [
  { key: 'NONE', label: '不跳转' },
  { key: 'PAGE', label: '跳转页面' },
  { key: 'TAB', label: '切换 Tab' },
  { key: 'WEBVIEW', label: '打开 H5' },
  { key: 'ACTIVITY', label: '活动详情' },
  { key: 'MINI_PROGRAM', label: '跳转其他小程序' },
] as const;

const OPERATION_CONTENT_TEMPLATES = [
  {
    defaultAction: { path: '/pages/activity/index', type: 'PAGE' },
    defaultDisplay: { styleVariant: 'banner-primary' },
    description: '首页顶部轮播大图，适合会员促销、节假日主活动、限时通知',
    group: 'banner',
    key: 'HOME_BANNER_IMAGE',
    label: '首页轮播图',
    slotKey: 'HOME_BANNER',
  },
  {
    defaultAction: { path: '/pages/activity/popup', type: 'PAGE' },
    defaultDisplay: { buttonText: '立即查看', closeable: true, frequency: 'ONCE_PER_DAY', styleVariant: 'popup-highlight' },
    description: '首页首次进入弹窗，适合限时活动、版本公告、会员续期提醒',
    group: 'activity',
    key: 'HOME_POPUP_SINGLE',
    label: '首页活动弹窗',
    slotKey: 'HOME_POPUP',
  },
  {
    defaultAction: { path: '/pages/activity/card', type: 'PAGE' },
    defaultDisplay: { badgeText: '推荐', buttonText: '查看详情', styleVariant: 'card-double' },
    description: '首页运营卡片，适合邀请活动、续费优惠、积分兑换专区',
    group: 'activity',
    key: 'HOME_CARD_FEATURE',
    label: '首页活动卡片',
    slotKey: 'HOME_CARD',
  },
  {
    defaultAction: { path: '/pages/notice/index', type: 'PAGE' },
    defaultDisplay: { badgeText: '公告', styleVariant: 'notice-scrolling' },
    description: '首页公告条，适合系统公告、活动预告、版本升级通知',
    group: 'activity',
    key: 'HOME_NOTICE_BAR',
    label: '首页公告条',
    slotKey: 'HOME_NOTICE',
  },
  {
    defaultAction: { path: '/pages/activity/floating', type: 'PAGE' },
    defaultDisplay: { closeable: true, styleVariant: 'floating-assistant' },
    description: '首页右下角浮窗，适合咨询入口、活动提醒、快捷触达',
    group: 'activity',
    key: 'HOME_FLOATING_WIDGET',
    label: '首页浮窗',
    slotKey: 'HOME_FLOATING',
  },
  {
    defaultAction: { path: '/pages/invite/index', type: 'PAGE' },
    defaultDisplay: { badgeText: '拉新', buttonText: '立即参与', styleVariant: 'invite-campaign' },
    description: '邀请有礼模板，适合积分裂变和推荐奖励场景',
    group: 'activity',
    key: 'INVITE_CAMPAIGN',
    label: '邀请有礼活动',
    slotKey: 'HOME_CARD',
  },
  {
    defaultAction: { path: '/pages/membership/renewal', type: 'PAGE' },
    defaultDisplay: { badgeText: '续期', buttonText: '立即续期', styleVariant: 'renewal-reminder' },
    description: '会员续期模板，适合到期提醒、限时续费优惠',
    group: 'activity',
    key: 'MEMBERSHIP_RENEWAL',
    label: '会员续期提醒',
    slotKey: 'HOME_POPUP',
  },
] as const;

const addDays = (date: Date, days: number) => {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
};

const subDays = (date: Date, days: number) => {
  const previousDate = new Date(date);
  previousDate.setDate(previousDate.getDate() - days);
  return previousDate;
};

const buildPagination = (page: number, pageSize: number, total: number) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});

const buildCode = (): string => {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `HXK-${Date.now().toString(36).toUpperCase()}-${random}`;
};

const toNullableDate = (value?: null | string) => {
  return value ? new Date(value) : null;
};

const toNullableJson = (value?: null | Record<string, unknown>) => {
  return value ? (value as Prisma.InputJsonValue) : Prisma.DbNull;
};

const buildActionConfig = (
  jumpType?: null | string,
  jumpValue?: null | string,
  actionConfig?: null | Record<string, unknown>,
) => {
  if (actionConfig) {
    return actionConfig;
  }

  const normalizedJumpType = jumpType?.toUpperCase();

  if (!normalizedJumpType || normalizedJumpType === 'NONE') {
    return {
      type: 'NONE',
    };
  }

  if (normalizedJumpType === 'PAGE' || normalizedJumpType === 'ACTIVITY' || normalizedJumpType === 'TAB') {
    return {
      path: jumpValue ?? '',
      type: normalizedJumpType,
    };
  }

  if (normalizedJumpType === 'WEBVIEW') {
    return {
      type: 'WEBVIEW',
      url: jumpValue ?? '',
    };
  }

  if (normalizedJumpType === 'MINI_PROGRAM') {
    return {
      appId: jumpValue ?? '',
      type: 'MINI_PROGRAM',
    };
  }

  return {
    path: jumpValue ?? '',
    type: normalizedJumpType,
  };
};

const normalizeBannerRecord = <T extends {
  actionConfig?: Prisma.JsonValue | null;
  createdAt: Date;
  displayConfig?: Prisma.JsonValue | null;
  endsAt?: Date | null;
  id: string;
  imageUrl: string;
  jumpType: string;
  jumpValue?: string | null;
  slotKey?: string;
  sortOrder: number;
  startsAt?: Date | null;
  status: BannerStatus;
  templateKey?: string;
  title: string;
  updatedAt?: Date;
}>(banner: T) => ({
  ...banner,
  actionConfig:
    (banner.actionConfig as null | Record<string, unknown>) ??
    buildActionConfig(banner.jumpType, banner.jumpValue ?? null),
  displayConfig: (banner.displayConfig as null | Record<string, unknown>) ?? null,
  slotKey: banner.slotKey ?? 'HOME_BANNER',
  templateKey: banner.templateKey ?? 'HOME_BANNER_IMAGE',
});

const normalizeActivityRecord = <T extends {
  actionConfig?: Prisma.JsonValue | null;
  content?: string | null;
  coverImageUrl?: string | null;
  createdAt: Date;
  displayConfig?: Prisma.JsonValue | null;
  endsAt?: Date | null;
  id: string;
  jumpType: string;
  jumpValue?: string | null;
  slotKey?: string;
  sortOrder: number;
  startsAt?: Date | null;
  status: ActivityStatus;
  summary?: string | null;
  templateKey?: string;
  title: string;
  updatedAt?: Date;
}>(activity: T) => ({
  ...activity,
  actionConfig:
    (activity.actionConfig as null | Record<string, unknown>) ??
    buildActionConfig(activity.jumpType, activity.jumpValue ?? null),
  displayConfig: (activity.displayConfig as null | Record<string, unknown>) ?? null,
  slotKey: activity.slotKey ?? 'HOME_POPUP',
  templateKey: activity.templateKey ?? 'HOME_POPUP_SINGLE',
});

const writeAdminAuditLogAsync = async (
  adminUserId: string,
  module: string,
  action: string,
  targetId?: string,
  detail?: string,
) => {
  await prisma.adminAuditLog.create({
    data: {
      action,
      adminUserId,
      detail,
      module,
      targetId,
    },
  });
};

const ensureAdminUserAsync = async () => {
  const existing = await prisma.adminUser.findUnique({
    where: { username: DEFAULT_ADMIN_USERNAME },
  });

  if (existing) {
    return existing;
  }

  return prisma.adminUser.create({
    data: {
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: await hashPassword(DEFAULT_ADMIN_PASSWORD),
      nickname: '系统管理员',
    },
  });
};

const grantMembershipWithTxAsync = async (
  tx: Prisma.TransactionClient,
  input: {
    activationCodeId?: string;
    adminUserId?: string;
    planId?: string;
    profileId: string;
    remark?: null | string;
    source: MembershipSource;
    startAt: Date;
  } & ({ durationDays: number } | { endAt: Date }),
) => {
  const account = await tx.pointAccount.upsert({
    where: { profileId: input.profileId },
    update: {},
    create: { profileId: input.profileId },
  });

  const activeGrant = await tx.membershipGrant.findFirst({
    where: {
      profileId: input.profileId,
      status: MembershipStatus.ACTIVE,
      endAt: { gte: new Date() },
    },
    orderBy: { endAt: 'desc' },
  });

  const grantStartAt =
    activeGrant && activeGrant.endAt > input.startAt ? activeGrant.endAt : input.startAt;

  const grantEndAt =
    'endAt' in input ? input.endAt : addDays(grantStartAt, input.durationDays);

  const grant = await tx.membershipGrant.create({
    data: {
      profileId: input.profileId,
      planId: input.planId,
      source: input.source,
      status: MembershipStatus.ACTIVE,
      startAt: grantStartAt,
      endAt: grantEndAt,
      activationCodeId: input.activationCodeId,
      grantedByAdminId: input.adminUserId,
      remark: input.remark ?? null,
    },
  });

  await tx.profile.update({
    where: { id: input.profileId },
    data: {
      pointAccount: {
        connect: { id: account.id },
      },
    },
  });

  return grant;
};

export const loginAdminAsync = async (input: LoginInput) => {
  await ensureAdminUserAsync();

  const adminUser = await prisma.adminUser.findUnique({
    where: { username: input.username },
  });

  if (!adminUser || adminUser.status !== 'ACTIVE') {
    throw new UnauthorizedError('账号或密码错误');
  }

  const passwordMatched = await comparePassword(input.password, adminUser.passwordHash);
  if (!passwordMatched) {
    throw new UnauthorizedError('账号或密码错误');
  }

  const expiresAt = addDays(new Date(), 7);
  const session = await prisma.adminSession.create({
    data: {
      adminUserId: adminUser.id,
      refreshTokenJti: '',
      expiresAt,
    },
  });

  const tokenPair = await generateAdminTokenPair(
    {
      adminUserId: adminUser.id,
      role: ADMIN_ROLE,
    },
    { id: session.id, sessionVersion: session.sessionVersion },
  );

  const refreshPayload = verifyAdminRefreshToken(tokenPair.refreshToken);
  await prisma.adminSession.update({
    where: { id: session.id },
    data: {
      refreshTokenJti: refreshPayload.jti,
      lastUsedAt: new Date(),
    },
  });

  await prisma.adminUser.update({
    where: { id: adminUser.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    accessToken: tokenPair.accessToken,
    refreshToken: tokenPair.refreshToken,
    expiresIn: tokenPair.expiresIn,
    user: {
      id: adminUser.id,
      username: adminUser.username,
      nickname: adminUser.nickname,
      role: adminUser.role,
    },
  };
};

export const logoutAdminAsync = async (sessionId: string) => {
  await prisma.adminSession.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const getAdminProfileAsync = async (adminUserId: string) => {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  if (!adminUser) {
    throw new UnauthorizedError('管理员不存在');
  }

  return adminUser;
};

export const getAdminUserInfoAsync = async (adminUserId: string) => {
  const adminUser = await prisma.adminUser.findUnique({
    where: { id: adminUserId },
    select: {
      id: true,
      username: true,
      nickname: true,
      role: true,
    },
  });

  if (!adminUser) {
    throw new UnauthorizedError('管理员不存在');
  }

  return {
    id: adminUser.id,
    username: adminUser.username,
    realName: adminUser.nickname ?? adminUser.username,
    roles: [adminUser.role.toLowerCase()],
    homePath: '/analytics',
    desc: '好用消课管理后台管理员',
    token: '',
  };
};

export const getAdminAccessCodesAsync = async () => {
  return [
    'ADMIN_DASHBOARD',
    'ADMIN_USERS',
    'ADMIN_MEMBERSHIPS',
    'ADMIN_POINTS',
    'ADMIN_CONTENT',
    'ADMIN_AUDIT',
  ];
};

export const getAdminMenusAsync = async () => {
  return [
    {
      name: 'Dashboard',
      path: '/dashboard',
      redirect: '/analytics',
      meta: {
        icon: 'lucide:layout-dashboard',
        order: -1,
        title: '运营看板',
      },
      children: [
        {
          name: 'Analytics',
          path: '/analytics',
          component: '/dashboard/analytics/index',
          meta: {
            affixTab: true,
            icon: 'lucide:area-chart',
            title: '数据概览',
          },
        },
      ],
    },
    {
      name: 'Operation',
      path: '/operation',
      redirect: '/operation/users',
      meta: {
        icon: 'lucide:users',
        title: '运营管理',
      },
      children: [
        {
          name: 'OperationUsers',
          path: '/operation/users',
          component: '/operation/users/index',
          meta: {
            icon: 'lucide:users-round',
            title: '用户管理',
          },
        },
        {
          name: 'OperationMemberships',
          path: '/operation/memberships',
          component: '/operation/memberships/index',
          meta: {
            icon: 'lucide:badge-check',
            title: '会员管理',
          },
        },
        {
          name: 'OperationActivationCodes',
          path: '/operation/activation-codes',
          component: '/operation/activation-codes/index',
          meta: {
            icon: 'lucide:key-round',
            title: '激活码管理',
          },
        },
        {
          name: 'OperationInvites',
          path: '/operation/invites',
          component: '/operation/invites/index',
          meta: {
            icon: 'lucide:user-plus',
            title: '邀请积分',
          },
        },
        {
          name: 'OperationFeedbacks',
          path: '/operation/feedbacks',
          component: '/operation/feedbacks/index',
          meta: {
            icon: 'lucide:message-square-warning',
            title: '使用反馈',
          },
        },
        {
          name: 'OperationAuditLogs',
          path: '/operation/audit-logs',
          component: '/operation/audit-logs/index',
          meta: {
            icon: 'lucide:scroll-text',
            title: '审计日志',
          },
        },
        {
          name: 'OperationContents',
          path: '/operation/contents',
          component: '/operation/contents/index',
          meta: {
            icon: 'lucide:image',
            title: '内容运营',
          },
        },
        {
          name: 'OperationAppApiDocs',
          path: '/operation/api-docs-app',
          component: 'IFrameView',
          meta: {
            icon: 'lucide:file-json-2',
            link: `${env.SERVER_PUBLIC_ORIGIN}/api-docs/app`,
            title: '小程序接口文档',
          },
        },
        {
          name: 'OperationAdminApiDocs',
          path: '/operation/api-docs-admin',
          component: 'IFrameView',
          meta: {
            icon: 'lucide:file-lock-2',
            link: `${env.SERVER_PUBLIC_ORIGIN}/api-docs/admin`,
            title: '后台接口文档',
          },
        },
      ],
    },
  ];
};

export const getDashboardOverviewAsync = async (query: DashboardQuery) => {
  const today = new Date();
  const expireWithin7Days = addDays(today, 7);
  const expireWithin15Days = addDays(today, 15);
  const expireWithin30Days = addDays(today, 30);
  const startDate = subDays(today, query.days - 1);
  const previousStartDate = subDays(startDate, query.days);
  const principalWhere: Prisma.ProfileWhereInput = {
    role: PRINCIPAL_ROLE,
  };

  const [
    totalUsers,
    totalMembers,
    totalParents,
    totalStudents,
    totalTeachers,
    totalActivationCodes,
    usedActivationCodes,
    totalInvites,
    recentUsers,
    recentGrants,
    recentUsedCodes,
    recentInvites,
    activeRules,
    expiringSoonCount7,
    expiringSoonCount15,
    expiringSoonCount30,
    expiringMemberships,
    pendingFeedbackCount,
    processingFeedbackCount,
    overdueFeedbackCount,
    feedbackQueue,
  ] = await Promise.all([
    prisma.profile.count({ where: principalWhere }),
    prisma.membershipGrant.count({
      where: {
        profile: principalWhere,
        status: MembershipStatus.ACTIVE,
        endAt: { gte: today },
      },
    }),
    prisma.studentParent.count(),
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.activationCode.count(),
    prisma.activationCode.count({
      where: { status: ActivationCodeStatus.USED },
    }),
    prisma.inviteRelation.count(),
    prisma.profile.findMany({
      where: {
        ...principalWhere,
        createdAt: { gte: startDate },
      },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.membershipGrant.findMany({
      where: {
        createdAt: { gte: startDate },
        profile: principalWhere,
      },
      select: { createdAt: true },
    }),
    prisma.activationCode.findMany({
      where: {
        usedAt: { gte: startDate },
        status: ActivationCodeStatus.USED,
      },
      select: { usedAt: true },
    }),
    prisma.inviteRelation.findMany({
      where: { createdAt: { gte: startDate } },
      select: { createdAt: true },
    }),
    prisma.inviteTaskRule.count({
      where: { enabled: true },
    }),
    prisma.membershipGrant.count({
      where: {
        profile: principalWhere,
        status: MembershipStatus.ACTIVE,
        endAt: {
          gte: today,
          lt: expireWithin7Days,
        },
      },
    }),
    prisma.membershipGrant.count({
      where: {
        profile: principalWhere,
        status: MembershipStatus.ACTIVE,
        endAt: {
          gte: today,
          lt: expireWithin15Days,
        },
      },
    }),
    prisma.membershipGrant.count({
      where: {
        profile: principalWhere,
        status: MembershipStatus.ACTIVE,
        endAt: {
          gte: today,
          lt: expireWithin30Days,
        },
      },
    }),
    prisma.membershipGrant.findMany({
      where: {
        profile: principalWhere,
        status: MembershipStatus.ACTIVE,
        endAt: {
          gte: today,
          lt: expireWithin30Days,
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            name: true,
          },
        },
        profile: {
          select: {
            id: true,
            name: true,
            nickname: true,
            phone: true,
            teacher: {
              select: {
                institution: true,
              },
            },
          },
        },
      },
      orderBy: { endAt: 'asc' },
      take: 6,
    }),
    prisma.feedback.count({
      where: {
        handleStatus: FeedbackHandleStatus.PENDING,
      },
    }),
    prisma.feedback.count({
      where: {
        handleStatus: FeedbackHandleStatus.PROCESSING,
      },
    }),
    prisma.feedback.count({
      where: {
        handleStatus: {
          in: [FeedbackHandleStatus.PENDING, FeedbackHandleStatus.PROCESSING],
        },
        createdAt: {
          lt: subDays(today, 2),
        },
      },
    }),
    prisma.feedback.findMany({
      where: {
        handleStatus: {
          in: [FeedbackHandleStatus.PENDING, FeedbackHandleStatus.PROCESSING],
        },
      },
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            nickname: true,
            phone: true,
            teacher: {
              select: {
                institution: true,
              },
            },
          },
        },
      },
      orderBy: [
        { handleStatus: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 6,
    }),
  ]);

  const currentRangeNewUsers = recentUsers.length;
  const previousRangeNewUsers = await prisma.profile.count({
    where: {
      ...principalWhere,
      createdAt: {
        gte: previousStartDate,
        lt: startDate,
      },
    },
  });

  const retentionDenominator = await prisma.profile.count({
    where: {
      ...principalWhere,
      createdAt: {
        gte: subDays(today, 8),
        lt: subDays(today, 1),
      },
    },
  });

  const day1RetentionNumerator = await prisma.profile.count({
    where: {
      ...principalWhere,
      createdAt: {
        gte: subDays(today, 2),
        lt: subDays(today, 1),
      },
      membershipGrants: {
        some: {
          createdAt: {
            gte: subDays(today, 1),
          },
        },
      },
    },
  });

  const seriesMap = new Map<string, { activation: number; invites: number; members: number; users: number }>();
  for (let index = 0; index < query.days; index += 1) {
    const date = subDays(today, query.days - 1 - index);
    const key = date.toISOString().slice(0, 10);
    seriesMap.set(key, { activation: 0, invites: 0, members: 0, users: 0 });
  }

  recentUsers.forEach((item) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    const existing = seriesMap.get(key);
    if (existing) {
      existing.users += 1;
    }
  });

  recentGrants.forEach((item) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    const existing = seriesMap.get(key);
    if (existing) {
      existing.members += 1;
    }
  });

  recentUsedCodes.forEach((item) => {
    if (!item.usedAt) {
      return;
    }
    const key = item.usedAt.toISOString().slice(0, 10);
    const existing = seriesMap.get(key);
    if (existing) {
      existing.activation += 1;
    }
  });

  recentInvites.forEach((item) => {
    const key = item.createdAt.toISOString().slice(0, 10);
    const existing = seriesMap.get(key);
    if (existing) {
      existing.invites += 1;
    }
  });

  return {
    cards: {
      totalUsers,
      totalMembers,
      totalParents,
      totalStudents,
      totalTeachers,
      totalActivationCodes,
      usedActivationCodes,
      totalInvites,
      activeInviteRules: activeRules,
      newUsersInRange: currentRangeNewUsers,
      newUsersGrowth:
        previousRangeNewUsers === 0
          ? 100
          : Number(
              (((currentRangeNewUsers - previousRangeNewUsers) / previousRangeNewUsers) * 100).toFixed(2),
            ),
    },
    retention: {
      day1: retentionDenominator === 0 ? 0 : Number(((day1RetentionNumerator / retentionDenominator) * 100).toFixed(2)),
      day7: 0,
    },
    membershipAlerts: {
      expiringIn7Days: expiringSoonCount7,
      expiringIn15Days: expiringSoonCount15,
      expiringIn30Days: expiringSoonCount30,
      list: expiringMemberships.map((item) => {
        const diff = item.endAt.getTime() - today.getTime();
        const daysLeft = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));

        return {
          daysLeft,
          endAt: item.endAt,
          id: item.id,
          planName: item.plan?.name ?? null,
          profile: {
            id: item.profile.id,
            institution: item.profile.teacher?.institution ?? null,
            name: item.profile.name,
            nickname: item.profile.nickname,
            phone: item.profile.phone,
          },
        };
      }),
    },
    feedbackAlerts: {
      overdueCount: overdueFeedbackCount,
      pendingCount: pendingFeedbackCount,
      processingCount: processingFeedbackCount,
      list: feedbackQueue.map((item) => ({
        content: item.content,
        createdAt: item.createdAt,
        handleStatus: item.handleStatus,
        id: item.id,
        profile: {
          id: item.profile.id,
          institution: item.profile.teacher?.institution ?? null,
          name: item.profile.name,
          nickname: item.profile.nickname,
          phone: item.profile.phone,
        },
        type: item.type,
      })),
    },
    series: Array.from(seriesMap.entries()).map(([date, metrics]) => ({
      date,
      ...metrics,
    })),
  };
};

export const listAuditLogsAsync = async (query: AuditLogListQuery) => {
  const where: Prisma.AdminAuditLogWhereInput = {
    ...(query.adminUserId ? { adminUserId: query.adminUserId } : {}),
    ...(query.action ? { action: { contains: query.action } } : {}),
    ...(query.module ? { module: { contains: query.module } } : {}),
    ...(query.keyword
      ? {
          OR: [
            { detail: { contains: query.keyword } },
            { targetId: { contains: query.keyword } },
            { adminUser: { nickname: { contains: query.keyword } } },
            { adminUser: { username: { contains: query.keyword } } },
          ],
        }
      : {}),
  };

  const [total, list] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      include: {
        adminUser: {
          select: {
            id: true,
            nickname: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const listFeedbacksAsync = async (query: FeedbackListQuery) => {
  const where: Prisma.FeedbackWhereInput = {
    ...(query.handleStatus ? { handleStatus: query.handleStatus } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.keyword
      ? {
          OR: [
            { content: { contains: query.keyword } },
            { contact: { contains: query.keyword } },
            { profile: { nickname: { contains: query.keyword } } },
            { profile: { name: { contains: query.keyword } } },
            { profile: { phone: { contains: query.keyword } } },
          ],
        }
      : {}),
  };

  const [total, list] = await Promise.all([
    prisma.feedback.count({ where }),
    prisma.feedback.findMany({
      where,
      include: {
        handledByAdmin: {
          select: {
            id: true,
            nickname: true,
            username: true,
          },
        },
        profile: {
          select: {
            id: true,
            name: true,
            nickname: true,
            phone: true,
            role: true,
            teacher: {
              select: {
                institution: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const getFeedbackDetailAsync = async (id: string) => {
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    include: {
      handledByAdmin: {
        select: {
          id: true,
          nickname: true,
          username: true,
        },
      },
      profile: {
        select: {
          id: true,
          name: true,
          nickname: true,
          phone: true,
          role: true,
          teacher: {
            select: {
              institution: true,
            },
          },
        },
      },
    },
  });

  if (!feedback) {
    throw new NotFoundError('反馈不存在');
  }

  return feedback;
};

export const updateFeedbackHandleAsync = async (
  adminUserId: string,
  id: string,
  input: UpdateFeedbackHandleInput,
) => {
  const feedback = await prisma.feedback.findUnique({
    where: { id },
    select: {
      id: true,
      handleStatus: true,
    },
  });

  if (!feedback) {
    throw new NotFoundError('反馈不存在');
  }

  const isPending = input.handleStatus === FeedbackHandleStatus.PENDING;
  const updatedFeedback = await prisma.feedback.update({
    where: { id },
    data: {
      handleRemark: input.handleRemark ?? null,
      handleStatus: input.handleStatus,
      handledAt: isPending ? null : new Date(),
      handledByAdminId: isPending ? null : adminUserId,
    },
    include: {
      handledByAdmin: {
        select: {
          id: true,
          nickname: true,
          username: true,
        },
      },
      profile: {
        select: {
          id: true,
          name: true,
          nickname: true,
          phone: true,
          role: true,
        },
      },
    },
  });

  await writeAdminAuditLogAsync(
    adminUserId,
    'feedback',
    'HANDLE',
    id,
    `from=${feedback.handleStatus};to=${input.handleStatus};remark=${input.handleRemark ?? ''}`,
  );

  return updatedFeedback;
};

export const listUsersAsync = async (query: UserListQuery) => {
  const where: Prisma.ProfileWhereInput = {
    role: query.role ?? PRINCIPAL_ROLE,
    ...(query.keyword
      ? {
          OR: [
            { nickname: { contains: query.keyword } },
            { phone: { contains: query.keyword } },
            { name: { contains: query.keyword } },
          ],
        }
      : {}),
  };

  const [total, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: {
        pointAccount: true,
        membershipGrants: {
          where: {
            status: MembershipStatus.ACTIVE,
            endAt: { gte: new Date() },
          },
          orderBy: { endAt: 'desc' },
          take: 1,
          include: { plan: true },
        },
        sentInvites: true,
        receivedInvite: {
          include: {
            inviter: {
              select: {
                id: true,
                nickname: true,
                phone: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const list = profiles
    .map((profile) => {
      const activeMembership = profile.membershipGrants[0] ?? null;
      return {
        id: profile.id,
        nickname: profile.nickname,
        name: profile.name,
        phone: profile.phone,
        role: profile.role,
        createdAt: profile.createdAt,
        membershipStatus: activeMembership ? MembershipStatus.ACTIVE : MembershipStatus.EXPIRED,
        membershipExpireAt: activeMembership?.endAt ?? null,
        membershipPlanName: activeMembership?.plan?.name ?? null,
        pointsBalance: profile.pointAccount?.balance ?? 0,
        inviteCount: profile.sentInvites.length,
        inviter: profile.receivedInvite?.inviter ?? null,
      };
    })
    .filter((item) => !query.membershipStatus || item.membershipStatus === query.membershipStatus);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const getUserDetailAsync = async (profileId: string) => {
  const profile = await prisma.profile.findUnique({
    where: { id: profileId },
    include: {
      pointAccount: true,
      teacher: {
        select: {
          id: true,
          profileId: true,
          inviteCode: true,
          institution: true,
          role: true,
          subject: true,
          color: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      parent: {
        include: {
          student: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      membershipGrants: {
        orderBy: { createdAt: 'desc' },
        include: {
          plan: true,
        },
      },
      pointRecords: {
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
      sentInvites: {
        include: {
          invitee: {
            select: {
              id: true,
              nickname: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      receivedInvite: {
        include: {
          inviter: {
            select: {
              id: true,
              nickname: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  if (!profile) {
    throw new NotFoundError('用户不存在');
  }

  let institutionSummary = {
    institutionName: profile.teacher?.institution ?? null,
    parentCount: 0,
    studentCount: 0,
    teacherCount: 0,
  };

  if (profile.teacher?.institution) {
    const institutionWhere = {
      institution: profile.teacher.institution,
    };

    const [teacherCount, studentCount, parentCount] = await Promise.all([
      prisma.teacher.count({ where: institutionWhere }),
      prisma.student.count({
        where: {
          teacher: institutionWhere,
        },
      }),
      prisma.studentParent.count({
        where: {
          student: {
            teacher: institutionWhere,
          },
        },
      }),
    ]);

    institutionSummary = {
      institutionName: profile.teacher.institution,
      parentCount,
      studentCount,
      teacherCount,
    };
  }

  return {
    ...profile,
    institutionSummary,
  };
};

export const listMembershipPlansAsync = async () => {
  return prisma.membershipPlan.findMany({
    orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
  });
};

export const createMembershipPlanAsync = async (
  adminUserId: string,
  input: CreateMembershipPlanInput,
) => {
  const plan = await prisma.membershipPlan.create({
    data: {
      name: input.name,
      durationDays: input.durationDays,
      pointsCost: input.pointsCost,
      isActive: input.isActive,
      remark: input.remark ?? null,
    },
  });

  await writeAdminAuditLogAsync(adminUserId, 'membership-plan', 'CREATE', plan.id, plan.name);
  return plan;
};

export const updateMembershipPlanAsync = async (
  adminUserId: string,
  id: string,
  input: UpdateMembershipPlanInput,
) => {
  const existingPlan = await prisma.membershipPlan.findUnique({ where: { id } });
  if (!existingPlan) {
    throw new NotFoundError('会员套餐不存在');
  }

  const updatedPlan = await prisma.membershipPlan.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.durationDays !== undefined ? { durationDays: input.durationDays } : {}),
      ...(input.pointsCost !== undefined ? { pointsCost: input.pointsCost } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.remark !== undefined ? { remark: input.remark } : {}),
    },
  });

  await writeAdminAuditLogAsync(
    adminUserId,
    'membership-plan',
    'UPDATE',
    updatedPlan.id,
    updatedPlan.name,
  );
  return updatedPlan;
};

export const listActivationCodesAsync = async (query: ActivationCodeListQuery) => {
  const where: Prisma.ActivationCodeWhereInput = {
    ...(query.code ? { code: { contains: query.code } } : {}),
    ...(query.batchNo ? { batchNo: { contains: query.batchNo } } : {}),
    ...(query.channel ? { channel: { contains: query.channel } } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, list] = await Promise.all([
    prisma.activationCode.count({ where }),
    prisma.activationCode.findMany({
      where,
      include: {
        plan: true,
        usedBy: {
          select: {
            id: true,
            nickname: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const batchCreateActivationCodesAsync = async (
  adminUserId: string,
  input: BatchCreateActivationCodesInput,
) => {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: input.planId },
  });

  if (!plan) {
    throw new NotFoundError('会员套餐不存在');
  }

  const created = await prisma.$transaction(
    Array.from({ length: input.quantity }).map(() =>
      prisma.activationCode.create({
        data: {
          code: buildCode(),
          planId: input.planId,
          expiresAt: toNullableDate(input.expiresAt),
          batchNo: input.batchNo ?? null,
          channel: input.channel ?? null,
          remark: input.remark ?? null,
        },
      }),
    ),
  );

  await writeAdminAuditLogAsync(
    adminUserId,
    'activation-code',
    'BATCH_CREATE',
    input.planId,
    `count=${created.length}`,
  );

  return {
    count: created.length,
    list: created,
  };
};

export const batchDeleteActivationCodesAsync = async (
  adminUserId: string,
  input: BatchDeleteActivationCodesInput,
) => {
  const codes = await prisma.activationCode.findMany({
    where: {
      id: { in: input.ids },
    },
    select: {
      code: true,
      id: true,
      status: true,
    },
  });

  if (codes.length !== input.ids.length) {
    throw new NotFoundError('部分激活码不存在或已被删除');
  }

  const lockedCodes = codes.filter(
    (item) => item.status === ActivationCodeStatus.USED || item.status === ActivationCodeStatus.EXPIRED,
  );
  if (lockedCodes.length > 0) {
    throw new ConflictError('已使用或已过期的激活码不支持删除');
  }

  await prisma.$transaction(async (tx) => {
    await tx.activationCode.deleteMany({
      where: {
        id: { in: input.ids },
      },
    });

    await tx.adminAuditLog.create({
      data: {
        action: 'BATCH_DELETE',
        adminUserId,
        detail: `count=${input.ids.length};codes=${codes
          .map((item) => item.code)
          .slice(0, 10)
          .join(',')}`,
        module: 'activation-code',
      },
    });
  });

  return {
    count: input.ids.length,
    ids: input.ids,
  };
};

export const voidActivationCodeAsync = async (adminUserId: string, id: string) => {
  const existingCode = await prisma.activationCode.findUnique({
    where: { id },
  });

  if (!existingCode) {
    throw new NotFoundError('激活码不存在');
  }

  if (existingCode.status === ActivationCodeStatus.USED) {
    throw new ConflictError('已使用的激活码不能作废');
  }

  const updatedCode = await prisma.activationCode.update({
    where: { id },
    data: { status: ActivationCodeStatus.VOIDED },
  });

  await writeAdminAuditLogAsync(
    adminUserId,
    'activation-code',
    'VOID',
    updatedCode.id,
    updatedCode.code,
  );
  return updatedCode;
};

export const listMembershipGrantsAsync = async (query: MembershipGrantListQuery) => {
  const where: Prisma.MembershipGrantWhereInput = {
    ...(query.profileId ? { profileId: query.profileId } : {}),
    profile: {
      role: PRINCIPAL_ROLE,
    },
    ...(query.source ? { source: query.source } : {}),
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, list] = await Promise.all([
    prisma.membershipGrant.count({ where }),
    prisma.membershipGrant.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            name: true,
            nickname: true,
            phone: true,
            role: true,
            teacher: {
              select: {
                institution: true,
              },
            },
          },
        },
        plan: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const grantMembershipAsync = async (adminUserId: string, input: GrantMembershipInput) => {
  const profile = await prisma.profile.findUnique({
    where: { id: input.profileId },
  });

  if (!profile) {
    throw new NotFoundError('用户不存在');
  }

  if (profile.role !== PRINCIPAL_ROLE) {
    throw new ForbiddenError('当前仅支持给用户（校长客户）开通会员');
  }

  return prisma.$transaction(async (tx) => {
    let durationDays = input.durationDays ?? null;
    let planId = input.planId ?? null;

    if (planId) {
      const plan = await tx.membershipPlan.findUnique({
        where: { id: planId },
      });
      if (!plan) {
        throw new NotFoundError('会员套餐不存在');
      }
      durationDays = plan.durationDays;
    }

    if (!durationDays) {
      throw new ConflictError('会员时长不能为空');
    }

    const grant = await grantMembershipWithTxAsync(tx, {
      adminUserId,
      durationDays,
      planId: planId ?? undefined,
      profileId: input.profileId,
      remark: input.remark,
      source: input.source,
      startAt: new Date(),
    });

    await tx.adminAuditLog.create({
      data: {
        action: 'GRANT',
        adminUserId,
        detail: `source=${input.source};durationDays=${durationDays}`,
        module: 'membership',
        targetId: grant.id,
      },
    });

    return grant;
  });
};

export const listInvitesAsync = async (query: InviteListQuery) => {
  const where: Prisma.InviteRelationWhereInput = query.keyword
    ? {
        OR: [
          { inviter: { nickname: { contains: query.keyword } } },
          { inviter: { phone: { contains: query.keyword } } },
          { invitee: { nickname: { contains: query.keyword } } },
          { invitee: { phone: { contains: query.keyword } } },
        ],
      }
    : {};

  const [total, list] = await Promise.all([
    prisma.inviteRelation.count({ where }),
    prisma.inviteRelation.findMany({
      where,
      include: {
        inviter: {
          select: {
            id: true,
            nickname: true,
            phone: true,
          },
        },
        invitee: {
          select: {
            id: true,
            nickname: true,
            phone: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const listInviteRulesAsync = async () => {
  return prisma.inviteTaskRule.findMany({
    orderBy: { createdAt: 'asc' },
  });
};

export const upsertInviteRuleAsync = async (taskKey: string, input: InviteRuleInput) => {
  return prisma.inviteTaskRule.upsert({
    where: { taskKey },
    update: {
      name: input.name,
      pointsReward: input.pointsReward,
      inviteePointsReward: input.inviteePointsReward,
      enabled: input.enabled,
      remark: input.remark ?? null,
    },
    create: {
      taskKey,
      name: input.name,
      pointsReward: input.pointsReward,
      inviteePointsReward: input.inviteePointsReward,
      enabled: input.enabled,
      remark: input.remark ?? null,
    },
  });
};

export const listPointRecordsAsync = async (query: PointRecordListQuery) => {
  const where: Prisma.PointRecordWhereInput = {
    ...(query.profileId ? { profileId: query.profileId } : {}),
    ...(query.type ? { type: query.type } : {}),
    ...(query.source ? { source: query.source } : {}),
  };

  const [total, list] = await Promise.all([
    prisma.pointRecord.count({ where }),
    prisma.pointRecord.findMany({
      where,
      include: {
        profile: {
          select: {
            id: true,
            nickname: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    list,
    pagination: buildPagination(query.page, query.pageSize, total),
  };
};

export const adjustPointsAsync = async (adminUserId: string, input: PointAdjustInput) => {
  const profile = await prisma.profile.findUnique({
    where: { id: input.profileId },
  });

  if (!profile) {
    throw new NotFoundError('用户不存在');
  }

  return prisma.$transaction(async (tx) => {
    const account = await tx.pointAccount.upsert({
      where: { profileId: input.profileId },
      update: {},
      create: { profileId: input.profileId },
    });

    const nextBalance = account.balance + input.amount;
    if (nextBalance < 0) {
      throw new ConflictError('积分余额不足');
    }

    await tx.pointAccount.update({
      where: { id: account.id },
      data: { balance: nextBalance },
    });

    const record = await tx.pointRecord.create({
      data: {
        profileId: input.profileId,
        type: input.amount > 0 ? PointType.EARN : PointType.SPEND,
        amount: Math.abs(input.amount),
        balanceAfter: nextBalance,
        source: PointChangeSource.MANUAL_ADJUST,
        operatorAdminId: adminUserId,
        remark: input.remark ?? null,
      },
    });

    await tx.adminAuditLog.create({
      data: {
        action: 'ADJUST',
        adminUserId,
        detail: `amount=${input.amount}`,
        module: 'points',
        targetId: record.id,
      },
    });

    return record;
  });
};

export const listBannersAsync = async () => {
  const list = await prisma.banner.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return list.map((item) => normalizeBannerRecord(item));
};

export const listContentTemplatesAsync = async () => {
  return {
    actionTypes: ACTION_TYPE_OPTIONS,
    slots: CONTENT_SLOT_OPTIONS,
    templates: OPERATION_CONTENT_TEMPLATES,
  };
};

export const createBannerAsync = async (adminUserId: string, input: CreateBannerInput) => {
  const banner = await prisma.banner.create({
    data: {
      actionConfig: toNullableJson(buildActionConfig(input.jumpType, input.jumpValue ?? null, input.actionConfig ?? null)),
      title: input.title,
      displayConfig: toNullableJson(input.displayConfig ?? null),
      imageUrl: input.imageUrl,
      jumpType: input.jumpType,
      jumpValue: input.jumpValue ?? null,
      slotKey: input.slotKey,
      sortOrder: input.sortOrder,
      status: input.status,
      startsAt: toNullableDate(input.startsAt),
      endsAt: toNullableDate(input.endsAt),
      templateKey: input.templateKey,
      createdById: adminUserId,
    },
  });

  await writeAdminAuditLogAsync(adminUserId, 'banner', 'CREATE', banner.id, banner.title);
  return normalizeBannerRecord(banner);
};

export const updateBannerAsync = async (
  adminUserId: string,
  id: string,
  input: UpdateBannerInput,
) => {
  const existingBanner = await prisma.banner.findUnique({ where: { id } });
  if (!existingBanner) {
    throw new NotFoundError('轮播图不存在');
  }

  const updatedBanner = await prisma.banner.update({
    where: { id },
    data: {
      ...(input.actionConfig !== undefined
        ? {
            actionConfig: toNullableJson(buildActionConfig(input.jumpType, input.jumpValue ?? null, input.actionConfig ?? null)),
          }
        : {}),
      ...(input.displayConfig !== undefined ? { displayConfig: toNullableJson(input.displayConfig ?? null) } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.jumpType !== undefined ? { jumpType: input.jumpType } : {}),
      ...(input.jumpValue !== undefined ? { jumpValue: input.jumpValue } : {}),
      ...(input.slotKey !== undefined ? { slotKey: input.slotKey } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startsAt !== undefined ? { startsAt: toNullableDate(input.startsAt) } : {}),
      ...(input.endsAt !== undefined ? { endsAt: toNullableDate(input.endsAt) } : {}),
      ...(input.templateKey !== undefined ? { templateKey: input.templateKey } : {}),
    },
  });

  await writeAdminAuditLogAsync(
    adminUserId,
    'banner',
    'UPDATE',
    updatedBanner.id,
    updatedBanner.title,
  );
  return normalizeBannerRecord(updatedBanner);
};

export const listActivitiesAsync = async () => {
  const list = await prisma.activity.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  return list.map((item) => normalizeActivityRecord(item));
};

export const createActivityAsync = async (adminUserId: string, input: CreateActivityInput) => {
  const activity = await prisma.activity.create({
    data: {
      actionConfig: toNullableJson(buildActionConfig(input.jumpType, input.jumpValue ?? null, input.actionConfig ?? null)),
      title: input.title,
      coverImageUrl: input.coverImageUrl ?? null,
      displayConfig: toNullableJson(input.displayConfig ?? null),
      summary: input.summary ?? null,
      content: input.content ?? null,
      jumpType: input.jumpType,
      jumpValue: input.jumpValue ?? null,
      slotKey: input.slotKey,
      status: input.status,
      startsAt: toNullableDate(input.startsAt),
      endsAt: toNullableDate(input.endsAt),
      sortOrder: input.sortOrder,
      templateKey: input.templateKey,
      createdById: adminUserId,
    },
  });

  await writeAdminAuditLogAsync(adminUserId, 'activity', 'CREATE', activity.id, activity.title);
  return normalizeActivityRecord(activity);
};

export const updateActivityAsync = async (
  adminUserId: string,
  id: string,
  input: UpdateActivityInput,
) => {
  const existingActivity = await prisma.activity.findUnique({ where: { id } });
  if (!existingActivity) {
    throw new NotFoundError('活动不存在');
  }

  const updatedActivity = await prisma.activity.update({
    where: { id },
    data: {
      ...(input.actionConfig !== undefined
        ? {
            actionConfig: toNullableJson(buildActionConfig(input.jumpType, input.jumpValue ?? null, input.actionConfig ?? null)),
          }
        : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.displayConfig !== undefined ? { displayConfig: toNullableJson(input.displayConfig ?? null) } : {}),
      ...(input.summary !== undefined ? { summary: input.summary } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.jumpType !== undefined ? { jumpType: input.jumpType } : {}),
      ...(input.jumpValue !== undefined ? { jumpValue: input.jumpValue } : {}),
      ...(input.slotKey !== undefined ? { slotKey: input.slotKey } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.startsAt !== undefined ? { startsAt: toNullableDate(input.startsAt) } : {}),
      ...(input.endsAt !== undefined ? { endsAt: toNullableDate(input.endsAt) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      ...(input.templateKey !== undefined ? { templateKey: input.templateKey } : {}),
    },
  });

  await writeAdminAuditLogAsync(
    adminUserId,
    'activity',
    'UPDATE',
    updatedActivity.id,
    updatedActivity.title,
  );
  return normalizeActivityRecord(updatedActivity);
};

export const deleteBannerAsync = async (adminUserId: string, id: string) => {
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) {
    throw new NotFoundError('轮播图不存在');
  }

  await prisma.banner.delete({ where: { id } });

  await writeAdminAuditLogAsync(adminUserId, 'banner', 'DELETE', id, banner.title);
  return { success: true };
};

export const deleteActivityAsync = async (adminUserId: string, id: string) => {
  const activity = await prisma.activity.findUnique({ where: { id } });
  if (!activity) {
    throw new NotFoundError('活动不存在');
  }

  await prisma.activity.delete({ where: { id } });

  await writeAdminAuditLogAsync(adminUserId, 'activity', 'DELETE', id, activity.title);
  return { success: true };
};
