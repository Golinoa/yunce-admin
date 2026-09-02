<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { DashboardOverview } from '#/api';

import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { getDashboardOverviewApi } from '#/api';
import {
  buildActivationCodesLink,
  buildFeedbackAlertLink,
  buildMembershipAlertLink,
  buildStoreEntryLink,
} from '#/utils/ops-nav';

import {
  DASHBOARD_WINDOW_OPTIONS,
  formatDateTime,
  formatNumber,
  formatPercent,
  resolveDaysLeftText,
  resolveDisplayName,
  resolveFeedbackTypeLabel,
  resolveHandleStatusColor,
  resolveHandleStatusLabel,
  resolveHealthStatus,
  toPercent,
} from './dashboard-format';

interface OverviewCardItem {
  color: string;
  key: string;
  label: string;
  tip: string;
  value: string;
}

interface SummaryMetricItem {
  key: string;
  label: string;
  value: string;
}

interface HealthMetric {
  key: string;
  label: string;
  status: 'error' | 'normal' | 'success';
  tip: string;
  value: number;
}

interface InsightItem {
  description: string;
  key: string;
  title: string;
  value: string;
}

interface AlertItem {
  action: string;
  key: string;
  level: 'high' | 'medium' | 'normal';
  metric: string;
  title: string;
}

interface QuickActionItem {
  description: string;
  key: string;
  metric: string;
  path: string;
  query?: Record<string, string>;
  title: string;
}

interface WorkbenchMetricItem {
  key: string;
  label: string;
  value: string;
}

type TrendRow = DashboardOverview['series'][number] & {
  total: number;
};

const loading = ref(false);
const overview = ref<DashboardOverview | null>(null);
const windowDays = ref(14);
const updatedAt = ref('');
const router = useRouter();

const trendChartRef = ref<EchartsUIType>();
const conversionChartRef = ref<EchartsUIType>();
const scaleChartRef = ref<EchartsUIType>();

const { renderEcharts: renderTrendChart } = useEcharts(trendChartRef);
const { renderEcharts: renderConversionChart } = useEcharts(conversionChartRef);
const { renderEcharts: renderScaleChart } = useEcharts(scaleChartRef);

const windowOptions = DASHBOARD_WINDOW_OPTIONS;

async function fetchOverview() {
  loading.value = true;
  try {
    overview.value = await getDashboardOverviewApi(windowDays.value);
    updatedAt.value = new Date().toLocaleString('zh-CN', { hour12: false });
  } finally {
    loading.value = false;
  }
}

const cards = computed(() => overview.value?.cards ?? null);
const feedbackAlerts = computed(() => overview.value?.feedbackAlerts ?? null);
const membershipAlerts = computed(
  () => overview.value?.membershipAlerts ?? null,
);
const retention = computed(() => overview.value?.retention ?? null);

const trendRows = computed<TrendRow[]>(() => {
  const series = overview.value?.series ?? [];
  return series.map((item) => ({
    ...item,
    total: item.users + item.members + item.activation + item.invites,
  }));
});

const membershipRate = computed(() => {
  const current = cards.value;
  return current ? toPercent(current.totalMembers, current.totalUsers) : 0;
});

const activationUsageRate = computed(() => {
  const current = cards.value;
  return current
    ? toPercent(current.usedActivationCodes, current.totalActivationCodes)
    : 0;
});

const inviteRate = computed(() => {
  const current = cards.value;
  return current ? toPercent(current.totalInvites, current.totalUsers) : 0;
});

const totalActionVolume = computed(() => {
  let sum = 0;
  for (const item of trendRows.value) {
    sum += item.total;
  }
  return sum;
});

const peakDay = computed(() => {
  let current: null | TrendRow = null;
  for (const item of trendRows.value) {
    if (!current || item.total > current.total) {
      current = item;
    }
  }
  return current;
});

const overviewCards = computed<OverviewCardItem[]>(() => {
  const current = cards.value;
  if (!current) {
    return [];
  }

  return [
    {
      color: '#1677ff',
      key: 'total-users',
      label: '累计用户',
      tip: `近 ${windowDays.value} 天新增 ${formatNumber(current.newUsersInRange)}`,
      value: formatNumber(current.totalUsers),
    },
    {
      color: '#13c2c2',
      key: 'opened-users',
      label: '开通用户',
      tip: `用户开通率 ${formatPercent(membershipRate.value)}`,
      value: formatNumber(current.totalMembers),
    },
    {
      color: '#722ed1',
      key: 'activation-codes',
      label: '激活码使用',
      tip: `使用率 ${formatPercent(activationUsageRate.value)}`,
      value: formatNumber(current.usedActivationCodes),
    },
    {
      color: '#fa8c16',
      key: 'students',
      label: '机构学生',
      tip: `教师 ${formatNumber(current.totalTeachers)} / 家长 ${formatNumber(current.totalParents)}`,
      value: formatNumber(current.totalStudents),
    },
  ];
});

const summaryMetrics = computed<SummaryMetricItem[]>(() => {
  const current = cards.value;
  const currentRetention = retention.value;
  const currentFeedback = feedbackAlerts.value;
  const currentMembershipAlerts = membershipAlerts.value;

  return [
    {
      key: 'invite-rate',
      label: '邀请渗透率',
      value: formatPercent(inviteRate.value),
    },
    {
      key: 'day1-retention',
      label: '次日留存',
      value: formatPercent(currentRetention?.day1 ?? 0),
    },
    {
      key: 'day7-retention',
      label: '7 日留存',
      value: formatPercent(currentRetention?.day7 ?? 0),
    },
    {
      key: 'invite-rules',
      label: '启用规则',
      value: formatNumber(current?.activeInviteRules ?? 0),
    },
    {
      key: 'invite-total',
      label: '邀请关系',
      value: formatNumber(current?.totalInvites ?? 0),
    },
    {
      key: 'teacher-total',
      label: '机构教师',
      value: formatNumber(current?.totalTeachers ?? 0),
    },
    {
      key: 'expiring-memberships',
      label: '7天内到期',
      value: formatNumber(currentMembershipAlerts?.expiringIn7Days ?? 0),
    },
    {
      key: 'pending-feedback',
      label: '待处理反馈',
      value: formatNumber(currentFeedback?.pendingCount ?? 0),
    },
  ];
});

const healthMetrics = computed<HealthMetric[]>(() => {
  const currentRetention = retention.value;

  return [
    {
      key: 'membership',
      label: '用户开通率',
      status: resolveHealthStatus(membershipRate.value),
      tip: '开通用户 / 累计用户',
      value: membershipRate.value,
    },
    {
      key: 'activation',
      label: '激活码使用率',
      status: resolveHealthStatus(activationUsageRate.value),
      tip: '已使用激活码 / 激活码总量',
      value: activationUsageRate.value,
    },
    {
      key: 'invite',
      label: '邀请渗透率',
      status: resolveHealthStatus(inviteRate.value),
      tip: '邀请关系 / 累计用户',
      value: inviteRate.value,
    },
    {
      key: 'day1',
      label: '次日留存',
      status: resolveHealthStatus(currentRetention?.day1 ?? 0),
      tip: '当前保留基础留存指标',
      value: currentRetention?.day1 ?? 0,
    },
    {
      key: 'day7',
      label: '7 日留存',
      status: resolveHealthStatus(currentRetention?.day7 ?? 0),
      tip: '当前为基础观察口径',
      value: currentRetention?.day7 ?? 0,
    },
  ];
});

const insightList = computed<InsightItem[]>(() => {
  const current = cards.value;
  const currentRetention = retention.value;

  return [
    {
      key: 'growth',
      title: `近 ${windowDays.value} 天新增`,
      value: formatNumber(current?.newUsersInRange ?? 0),
      description: `增长率 ${formatPercent(current?.newUsersGrowth ?? 0)}`,
    },
    {
      key: 'peak-day',
      title: '业务峰值日',
      value: peakDay.value?.date ?? '-',
      description: peakDay.value
        ? `单日动作 ${formatNumber(peakDay.value.total)}`
        : '暂无趋势数据',
    },
    {
      key: 'scale',
      title: '机构基础规模',
      value: `${formatNumber(current?.totalTeachers ?? 0)} / ${formatNumber(current?.totalStudents ?? 0)}`,
      description: `教师 / 学生，家长 ${formatNumber(current?.totalParents ?? 0)}`,
    },
    {
      key: 'retention',
      title: '留存观察',
      value: formatPercent(currentRetention?.day1 ?? 0),
      description: `7 日留存 ${formatPercent(currentRetention?.day7 ?? 0)}`,
    },
    {
      key: 'expiring-membership',
      title: '会员到期预警',
      value: formatNumber(membershipAlerts.value?.expiringIn15Days ?? 0),
      description: `15 天内到期用户，7 天内 ${formatNumber(membershipAlerts.value?.expiringIn7Days ?? 0)}`,
    },
  ];
});

const alertList = computed<AlertItem[]>(() => {
  const current = cards.value;
  const result: AlertItem[] = [];

  if (!current) {
    return result;
  }

  if (membershipRate.value < 35) {
    result.push({
      action: '优先检查激活码投放渠道和开通引导页',
      key: 'membership-rate',
      level: 'high',
      metric: formatPercent(membershipRate.value),
      title: '用户开通率偏低，需要关注开通转化链路',
    });
  }

  if (activationUsageRate.value < 45) {
    result.push({
      action: '排查激活码库存结构、过期时间和运营触达',
      key: 'activation-rate',
      level: 'medium',
      metric: formatPercent(activationUsageRate.value),
      title: '激活码使用率偏低，可能存在库存积压',
    });
  }

  if (inviteRate.value < 20) {
    result.push({
      action: '优化邀请奖励文案，针对已开通用户做二次拉新触达',
      key: 'invite-rate',
      level: 'medium',
      metric: formatPercent(inviteRate.value),
      title: '邀请渗透率较低，拉新机制还有提升空间',
    });
  }

  if ((retention.value?.day1 ?? 0) < 40) {
    result.push({
      action: '重点检查新用户首日体验和首次开通后的关键动作',
      key: 'retention-rate',
      level: 'high',
      metric: formatPercent(retention.value?.day1 ?? 0),
      title: '次日留存偏低，需关注新用户首日活跃路径',
    });
  }

  if ((membershipAlerts.value?.expiringIn7Days ?? 0) > 0) {
    result.push({
      action: '优先筛出即将到期用户，准备续期激活码和人工提醒',
      key: 'membership-expiring',
      level: 'high',
      metric: `${formatNumber(membershipAlerts.value?.expiringIn7Days ?? 0)} 户`,
      title: '近期有用户会员即将到期，需要提前做续期触达',
    });
  }

  if ((feedbackAlerts.value?.overdueCount ?? 0) > 0) {
    result.push({
      action: '优先处理超时反馈，避免问题积压影响口碑和留存',
      key: 'feedback-overdue',
      level: 'high',
      metric: `${formatNumber(feedbackAlerts.value?.overdueCount ?? 0)} 条`,
      title: '存在超时未处理反馈，需要运营和客服及时跟进',
    });
  }

  if (result.length === 0) {
    result.push({
      action: '当前指标稳定，可继续观察新增用户与开通节奏',
      key: 'healthy',
      level: 'normal',
      metric: '稳定',
      title: '当前运营指标整体平稳，暂无明显风险项',
    });
  }

  return result.slice(0, 4);
});

const quickActions = computed<QuickActionItem[]>(() => {
  const current = cards.value;
  const membershipLink = buildMembershipAlertLink({ status: 'ACTIVE' });
  const codesLink = buildActivationCodesLink();
  const feedbackLink = buildFeedbackAlertLink({ handleStatus: 'PENDING' });
  const storeLink = buildStoreEntryLink({ status: 'PENDING' });

  return [
    {
      description: '查看校长客户列表、会员状态和机构基础数据',
      key: 'users',
      metric: `累计 ${formatNumber(current?.totalUsers ?? 0)}`,
      path: '/operation/users',
      title: '用户管理',
    },
    {
      description: '处理开通、激活码和会员归属问题',
      key: 'memberships',
      metric: `开通 ${formatNumber(current?.totalMembers ?? 0)}`,
      path: membershipLink.path,
      query: membershipLink.query,
      title: '会员管理',
    },
    {
      description: '检查激活码库存、批次和使用情况',
      key: 'codes',
      metric: `已用 ${formatNumber(current?.usedActivationCodes ?? 0)}`,
      path: codesLink.path,
      query: codesLink.query,
      title: '激活码管理',
    },
    {
      description: '查看反馈、处理备注和客诉状态',
      key: 'feedbacks',
      metric: `待处理 ${formatNumber(feedbackAlerts.value?.pendingCount ?? 0)}`,
      path: feedbackLink.path,
      query: feedbackLink.query,
      title: '使用反馈',
    },
    {
      description: '处理待审核入驻申请',
      key: 'store-entry',
      metric: '入驻审核',
      path: storeLink.path,
      query: storeLink.query,
      title: '入驻审核',
    },
  ];
});

const membershipWorkbenchMetrics = computed<WorkbenchMetricItem[]>(() => {
  const current = membershipAlerts.value;

  return [
    {
      key: 'expire-7',
      label: '7天内到期',
      value: formatNumber(current?.expiringIn7Days ?? 0),
    },
    {
      key: 'expire-15',
      label: '15天内到期',
      value: formatNumber(current?.expiringIn15Days ?? 0),
    },
    {
      key: 'expire-30',
      label: '30天内到期',
      value: formatNumber(current?.expiringIn30Days ?? 0),
    },
  ];
});

const feedbackWorkbenchMetrics = computed<WorkbenchMetricItem[]>(() => {
  const current = feedbackAlerts.value;

  return [
    {
      key: 'pending',
      label: '待处理',
      value: formatNumber(current?.pendingCount ?? 0),
    },
    {
      key: 'processing',
      label: '处理中',
      value: formatNumber(current?.processingCount ?? 0),
    },
    {
      key: 'overdue',
      label: '超时未处理',
      value: formatNumber(current?.overdueCount ?? 0),
    },
  ];
});

const topTrendRows = computed(() => {
  return [...trendRows.value]
    .toSorted((a, b) => b.total - a.total)
    .slice(0, 5)
    .map((item) => ({
      ...item,
      share: totalActionVolume.value
        ? Number(((item.total / totalActionVolume.value) * 100).toFixed(2))
        : 0,
    }));
});

async function renderCharts() {
  await nextTick();

  const dates = trendRows.value.map((item) => item.date);
  const rows = trendRows.value;
  const current = cards.value;
  const currentRetention = retention.value;

  await Promise.all([
    renderTrendChart({
      color: ['#1677ff', '#13c2c2', '#722ed1', '#fa8c16'],
      grid: {
        bottom: 8,
        containLabel: true,
        left: 8,
        right: 8,
        top: 48,
      },
      legend: {
        itemHeight: 8,
        itemWidth: 14,
        top: 8,
      },
      series: [
        {
          data: rows.map((item) => item.users),
          name: '新增用户',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          type: 'line',
        },
        {
          data: rows.map((item) => item.members),
          name: '开通用户',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          type: 'line',
        },
        {
          data: rows.map((item) => item.activation),
          name: '激活码使用',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          type: 'line',
        },
        {
          areaStyle: {
            opacity: 0.08,
          },
          data: rows.map((item) => item.invites),
          name: '邀请关系',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          type: 'line',
        },
      ],
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        axisTick: {
          show: false,
        },
        boundaryGap: false,
        data: dates,
        type: 'category',
      },
      yAxis: {
        splitLine: {
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed',
          },
        },
        type: 'value',
      },
    }),
    renderConversionChart({
      color: ['#1677ff', '#13c2c2', '#722ed1', '#faad14', '#ff4d4f'],
      grid: {
        bottom: 8,
        containLabel: true,
        left: 12,
        right: 16,
        top: 12,
      },
      series: [
        {
          data: [
            membershipRate.value,
            activationUsageRate.value,
            inviteRate.value,
            currentRetention?.day1 ?? 0,
            currentRetention?.day7 ?? 0,
          ],
          itemStyle: {
            borderRadius: [0, 6, 6, 0],
          },
          label: {
            formatter: '{c}%',
            position: 'right',
            show: true,
          },
          type: 'bar',
        },
      ],
      tooltip: {
        formatter: '{b}: {c}%',
        trigger: 'axis',
      },
      xAxis: {
        max: 100,
        splitLine: {
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed',
          },
        },
        type: 'value',
      },
      yAxis: {
        axisTick: {
          show: false,
        },
        data: [
          '用户开通率',
          '激活码使用率',
          '邀请渗透率',
          '次日留存',
          '7 日留存',
        ],
        type: 'category',
      },
    }),
    renderScaleChart({
      color: ['#1677ff', '#13c2c2', '#722ed1', '#faad14'],
      legend: {
        bottom: 0,
        icon: 'circle',
      },
      series: [
        {
          center: ['50%', '46%'],
          data: [
            { name: '机构教师', value: current?.totalTeachers ?? 0 },
            { name: '机构学生', value: current?.totalStudents ?? 0 },
            { name: '机构家长', value: current?.totalParents ?? 0 },
            { name: '开通用户', value: current?.totalMembers ?? 0 },
          ],
          label: {
            formatter: '{b}\n{d}%',
          },
          radius: ['48%', '72%'],
          type: 'pie',
        },
      ],
      tooltip: {
        trigger: 'item',
      },
    }),
  ]);
}

function goTo(path: string, query?: Record<string, string>) {
  void router.push({ path, query: query && Object.keys(query).length ? query : undefined });
}

function goMembershipList() {
  const link = buildMembershipAlertLink({ status: 'ACTIVE' });
  goTo(link.path, link.query);
}

function goFeedbackList() {
  const link = buildFeedbackAlertLink({ handleStatus: 'PENDING' });
  goTo(link.path, link.query);
}

function goMembershipAlert(item: {
  profile: { id: string };
}) {
  const link = buildMembershipAlertLink({
    profileId: item.profile.id,
    status: 'ACTIVE',
  });
  goTo(link.path, link.query);
}

function goFeedbackAlert(item: {
  handleStatus: 'CLOSED' | 'PENDING' | 'PROCESSING' | 'RESOLVED';
  profile: { phone?: null | string };
}) {
  const link = buildFeedbackAlertLink({
    handleStatus: item.handleStatus,
    keyword: item.profile.phone || undefined,
  });
  goTo(link.path, link.query);
}

watch(
  () => overview.value,
  () => {
    if (overview.value) {
      void renderCharts();
    }
  },
  { deep: true },
);

onMounted(async () => {
  await fetchOverview();
  await renderCharts();
});
</script>

<template>
  <div class="dashboard-page p-5">
    <a-space direction="vertical" size="middle" class="w-full">
      <a-card :bordered="false" class="hero-panel" :loading="loading">
        <div class="flex flex-wrap items-start justify-between gap-5">
          <div class="max-w-[760px]">
            <div class="hero-title">运营看板</div>
            <div class="hero-subtitle">
              按用户口径观察校长客户的开通、拉新、激活码和机构基础规模，用更符合
              B 端后台的方式呈现经营状态。
            </div>
            <div class="hero-meta">
              <span>统计窗口：近 {{ windowDays }} 天</span>
              <span>用户口径：校长客户</span>
              <span>最近刷新：{{ updatedAt || '-' }}</span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-3">
            <a-segmented
              v-model:value="windowDays"
              :options="windowOptions"
              @change="fetchOverview"
            />
            <a-button type="primary" @click="fetchOverview">刷新看板</a-button>
          </div>
        </div>
      </a-card>

      <a-row :gutter="[16, 16]">
        <a-col
          v-for="item in overviewCards"
          :key="item.key"
          :xs="24"
          :sm="12"
          :xl="6"
        >
          <a-card
            :bordered="false"
            class="overview-card"
            :loading="loading"
            :style="{ '--card-accent': item.color }"
          >
            <div class="overview-card__label">{{ item.label }}</div>
            <div class="overview-card__value">{{ item.value }}</div>
            <div class="overview-card__tip">{{ item.tip }}</div>
          </a-card>
        </a-col>
      </a-row>

      <a-card :bordered="false" class="summary-strip" :loading="loading">
        <div class="summary-strip__grid">
          <div
            v-for="item in summaryMetrics"
            :key="item.key"
            class="summary-strip__item"
          >
            <div class="summary-strip__label">{{ item.label }}</div>
            <div class="summary-strip__value">{{ item.value }}</div>
          </div>
        </div>
      </a-card>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :xl="12">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>会员到期预警</template>
            <template #extra>
              <a-button type="link" @click="goMembershipList">
                查看会员管理
              </a-button>
            </template>
            <div class="workbench-metrics">
              <div
                v-for="item in membershipWorkbenchMetrics"
                :key="item.key"
                class="workbench-metric"
              >
                <div class="workbench-metric__label">{{ item.label }}</div>
                <div class="workbench-metric__value">{{ item.value }}</div>
              </div>
            </div>
            <div class="task-list">
              <button
                v-for="item in membershipAlerts?.list ?? []"
                :key="item.id"
                type="button"
                class="task-item task-item--clickable"
                @click="goMembershipAlert(item)"
              >
                <div class="task-item__header">
                  <div class="task-item__title-wrap">
                    <span class="task-item__title">{{
                      resolveDisplayName(item.profile)
                    }}</span>
                    <a-tag color="gold">
                      {{ resolveDaysLeftText(item.daysLeft) }}
                    </a-tag>
                  </div>
                  <span class="task-item__meta">
                    到期时间 {{ formatDateTime(item.endAt) }}
                  </span>
                </div>
                <div class="task-item__desc">
                  <span>机构 {{ item.profile.institution || '-' }}</span>
                  <span>手机号 {{ item.profile.phone || '-' }}</span>
                  <span>套餐 {{ item.planName || '未绑定套餐' }}</span>
                </div>
              </button>
              <a-empty
                v-if="(membershipAlerts?.list?.length ?? 0) === 0"
                description="当前 30 天内暂无会员到期预警"
                :image="false"
              />
            </div>
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="12">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>待处理反馈</template>
            <template #extra>
              <a-button type="link" @click="goFeedbackList">
                查看反馈中心
              </a-button>
            </template>
            <div class="workbench-metrics">
              <div
                v-for="item in feedbackWorkbenchMetrics"
                :key="item.key"
                class="workbench-metric"
              >
                <div class="workbench-metric__label">{{ item.label }}</div>
                <div class="workbench-metric__value">{{ item.value }}</div>
              </div>
            </div>
            <div class="task-list">
              <button
                v-for="item in feedbackAlerts?.list ?? []"
                :key="item.id"
                type="button"
                class="task-item task-item--clickable"
                @click="goFeedbackAlert(item)"
              >
                <div class="task-item__header">
                  <div class="task-item__title-wrap">
                    <span class="task-item__title">{{
                      resolveDisplayName(item.profile)
                    }}</span>
                    <a-tag :color="resolveHandleStatusColor(item.handleStatus)">
                      {{ resolveHandleStatusLabel(item.handleStatus) }}
                    </a-tag>
                  </div>
                  <span class="task-item__meta">{{
                    resolveFeedbackTypeLabel(item.type)
                  }}</span>
                </div>
                <div class="task-item__content">{{ item.content }}</div>
                <div class="task-item__desc">
                  <span>机构 {{ item.profile.institution || '-' }}</span>
                  <span>手机号 {{ item.profile.phone || '-' }}</span>
                  <span>提交时间 {{ formatDateTime(item.createdAt) }}</span>
                </div>
              </button>
              <a-empty
                v-if="(feedbackAlerts?.list?.length ?? 0) === 0"
                description="当前没有待处理反馈"
                :image="false"
              />
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :xl="15">
          <a-card
            title="运营决策提示"
            :bordered="false"
            class="chart-card"
            :loading="loading"
          >
            <div class="alert-list">
              <div v-for="item in alertList" :key="item.key" class="alert-item">
                <div class="alert-item__header">
                  <div class="alert-item__title-wrap">
                    <span
                      class="alert-item__dot"
                      :class="{
                        'is-high': item.level === 'high',
                        'is-medium': item.level === 'medium',
                        'is-normal': item.level === 'normal',
                      }"
                    ></span>
                    <span class="alert-item__title">{{ item.title }}</span>
                  </div>
                  <a-tag
                    :color="
                      item.level === 'high'
                        ? 'red'
                        : item.level === 'medium'
                          ? 'orange'
                          : 'blue'
                    "
                  >
                    {{ item.metric }}
                  </a-tag>
                </div>
                <div class="alert-item__action">{{ item.action }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="9">
          <a-card
            title="快捷入口"
            :bordered="false"
            class="chart-card"
            :loading="loading"
          >
            <div class="quick-grid">
              <button
                v-for="item in quickActions"
                :key="item.key"
                class="quick-card"
                type="button"
                @click="goTo(item.path, item.query)"
              >
                <div class="quick-card__title">{{ item.title }}</div>
                <div class="quick-card__metric">{{ item.metric }}</div>
                <div class="quick-card__desc">{{ item.description }}</div>
              </button>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :xl="16">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>核心趋势</template>
            <template #extra>
              <span class="chart-card__extra">
                新增用户、开通、激活码使用与邀请关系按日趋势
              </span>
            </template>
            <EchartsUI ref="trendChartRef" height="360px" />
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="8">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>关键转化</template>
            <template #extra>
              <span class="chart-card__extra">核心运营比率柱状图</span>
            </template>
            <EchartsUI ref="conversionChartRef" height="360px" />
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :xl="8">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>机构基础规模分布</template>
            <template #extra>
              <span class="chart-card__extra">当前总体结构占比</span>
            </template>
            <EchartsUI ref="scaleChartRef" height="320px" />
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="8">
          <a-card
            title="运营健康度"
            :bordered="false"
            class="chart-card"
            :loading="loading"
          >
            <div class="health-list">
              <div
                v-for="item in healthMetrics"
                :key="item.key"
                class="health-item"
              >
                <div class="flex items-center justify-between gap-3">
                  <div>
                    <div class="health-item__label">{{ item.label }}</div>
                    <div class="health-item__tip">{{ item.tip }}</div>
                  </div>
                  <a-tag
                    :color="
                      item.status === 'success'
                        ? 'green'
                        : item.status === 'normal'
                          ? 'blue'
                          : 'red'
                    "
                  >
                    {{ formatPercent(item.value) }}
                  </a-tag>
                </div>
                <a-progress
                  :percent="Number(item.value.toFixed(2))"
                  :show-info="false"
                  :status="item.status"
                  size="small"
                />
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="8">
          <a-card
            title="经营提示"
            :bordered="false"
            class="chart-card"
            :loading="loading"
          >
            <div class="insight-list">
              <div
                v-for="item in insightList"
                :key="item.key"
                class="insight-item"
              >
                <div class="insight-item__header">
                  <span class="insight-item__title">{{ item.title }}</span>
                  <span class="insight-item__value">{{ item.value }}</span>
                </div>
                <div class="insight-item__desc">{{ item.description }}</div>
              </div>
            </div>
          </a-card>
        </a-col>
      </a-row>

      <a-row :gutter="[16, 16]">
        <a-col :xs="24" :xl="8">
          <a-card
            title="高峰日期排行"
            :bordered="false"
            class="chart-card"
            :loading="loading"
          >
            <div class="rank-list">
              <div
                v-for="item in topTrendRows"
                :key="item.date"
                class="rank-item"
              >
                <div class="rank-item__header">
                  <span class="rank-item__date">{{ item.date }}</span>
                  <span class="rank-item__total">{{
                    formatNumber(item.total)
                  }}</span>
                </div>
                <a-progress
                  :percent="item.share"
                  :show-info="false"
                  size="small"
                  stroke-color="#1677ff"
                />
                <div class="rank-item__meta">
                  <span>新增 {{ formatNumber(item.users) }}</span>
                  <span>开通 {{ formatNumber(item.members) }}</span>
                  <span>激活 {{ formatNumber(item.activation) }}</span>
                  <span>邀请 {{ formatNumber(item.invites) }}</span>
                </div>
              </div>
            </div>
          </a-card>
        </a-col>
        <a-col :xs="24" :xl="16">
          <a-card :bordered="false" class="chart-card" :loading="loading">
            <template #title>运营趋势明细</template>
            <template #extra>
              <span class="chart-card__extra">
                保留明细表，便于运营按日核对
              </span>
            </template>
            <a-table
              :columns="[
                { title: '日期', dataIndex: 'date', width: 120 },
                { title: '新增用户', dataIndex: 'users', width: 110 },
                { title: '开通用户', dataIndex: 'members', width: 110 },
                { title: '激活码使用', dataIndex: 'activation', width: 120 },
                { title: '邀请关系', dataIndex: 'invites', width: 100 },
                { title: '动作总量', dataIndex: 'total', width: 110 },
              ]"
              :data-source="trendRows"
              :loading="loading"
              :pagination="false"
              row-key="date"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'total'">
                  <span class="font-semibold text-[var(--ant-color-text)]">{{
                    formatNumber(record.total)
                  }}</span>
                </template>
              </template>
            </a-table>
          </a-card>
        </a-col>
      </a-row>
    </a-space>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100%;
  background: linear-gradient(
    180deg,
    rgb(247 249 252 / 100%) 0%,
    rgb(244 246 250 / 100%) 100%
  );
}

.hero-panel {
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(22 119 255 / 12%);
  box-shadow: 0 16px 40px rgb(15 23 42 / 6%);
}

.hero-panel::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    90deg,
    rgb(22 119 255 / 10%) 0%,
    rgb(114 46 209 / 6%) 100%
  );
}

.hero-title,
.hero-subtitle,
.hero-meta {
  position: relative;
  z-index: 1;
}

.hero-title {
  font-size: 24px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.hero-subtitle {
  max-width: 720px;
  margin-top: 10px;
  font-size: 13px;
  line-height: 22px;
  color: var(--ant-color-text-secondary);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 18px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.overview-card,
.summary-strip,
.chart-card {
  border: 1px solid var(--ant-color-border-secondary);
  box-shadow: 0 8px 24px rgb(15 23 42 / 4%);
}

.overview-card {
  position: relative;
  min-height: 156px;
  overflow: hidden;
}

.overview-card::before {
  position: absolute;
  inset: 0;
  pointer-events: none;
  content: '';
  background: linear-gradient(
    180deg,
    rgb(255 255 255 / 0%) 0%,
    rgb(255 255 255 / 100%) 100%
  );
  border-top: 3px solid var(--card-accent);
}

.overview-card__label,
.overview-card__value,
.overview-card__tip {
  position: relative;
  z-index: 1;
}

.overview-card__label {
  font-size: 13px;
  color: var(--ant-color-text-secondary);
}

.overview-card__value {
  margin-top: 18px;
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--ant-color-text);
}

.overview-card__tip {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.summary-strip__grid {
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 16px;
}

.summary-strip__item {
  padding-right: 12px;
  border-right: 1px solid var(--ant-color-border-secondary);
}

.summary-strip__item:last-child {
  padding-right: 0;
  border-right: none;
}

.summary-strip__label {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.summary-strip__value {
  margin-top: 8px;
  font-size: 22px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.chart-card__extra {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.workbench-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.workbench-metric {
  padding: 14px 16px;
  background: rgb(250 251 253 / 100%);
  border: 1px solid rgb(5 5 5 / 6%);
  border-radius: 12px;
}

.workbench-metric__label {
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.workbench-metric__value {
  margin-top: 8px;
  font-size: 24px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-item {
  padding: 14px 16px;
  background: rgb(250 251 253 / 100%);
  border: 1px solid rgb(5 5 5 / 6%);
  border-radius: 12px;
}

.task-item--clickable {
  width: 100%;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.task-item--clickable:hover {
  background: rgb(240 247 255 / 100%);
  border-color: rgb(22 119 255 / 28%);
}

.task-item__header {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  justify-content: space-between;
}

.task-item__title-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.task-item__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.task-item__meta {
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
  white-space: nowrap;
}

.task-item__content {
  margin-top: 10px;
  font-size: 13px;
  line-height: 22px;
  color: var(--ant-color-text);
}

.task-item__desc {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 10px;
  font-size: 12px;
  line-height: 20px;
  color: var(--ant-color-text-secondary);
}

.health-list,
.insight-list,
.rank-list,
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.health-item,
.insight-item,
.rank-item,
.alert-item {
  padding: 14px 16px;
  background: rgb(250 251 253 / 100%);
  border: 1px solid rgb(5 5 5 / 6%);
  border-radius: 12px;
}

.health-item {
  gap: 10px;
}

.health-item__label {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.health-item__tip {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ant-color-text-tertiary);
}

.insight-item__header,
.rank-item__header,
.alert-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.insight-item__title,
.rank-item__date,
.alert-item__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.insight-item__value,
.rank-item__total {
  font-size: 16px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.insight-item__desc,
.rank-item__meta,
.alert-item__action {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ant-color-text-secondary);
}

.alert-item__title-wrap {
  display: flex;
  gap: 10px;
  align-items: center;
}

.alert-item__dot {
  display: inline-flex;
  width: 8px;
  height: 8px;
  border-radius: 999px;
}

.alert-item__dot.is-high {
  background: #ff4d4f;
}

.alert-item__dot.is-medium {
  background: #faad14;
}

.alert-item__dot.is-normal {
  background: #1677ff;
}

.rank-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.quick-card {
  padding: 16px;
  text-align: left;
  cursor: pointer;
  background: rgb(250 251 253 / 100%);
  border: 1px solid rgb(5 5 5 / 6%);
  border-radius: 12px;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.quick-card:hover {
  border-color: rgb(22 119 255 / 28%);
  box-shadow: 0 10px 24px rgb(15 23 42 / 6%);
  transform: translateY(-2px);
}

.quick-card__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--ant-color-text);
}

.quick-card__metric {
  margin-top: 10px;
  font-size: 20px;
  font-weight: 700;
  color: var(--ant-color-text);
}

.quick-card__desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 20px;
  color: var(--ant-color-text-secondary);
}

@media (max-width: 1400px) {
  .summary-strip__grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .summary-strip__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-strip__item {
    padding-right: 0;
    border-right: none;
  }

  .quick-grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .workbench-metrics {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }

  .task-item__header {
    flex-direction: column;
  }

  .task-item__meta {
    white-space: normal;
  }
}
</style>
