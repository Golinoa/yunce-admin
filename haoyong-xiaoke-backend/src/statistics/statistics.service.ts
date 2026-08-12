import { prisma } from '../config/database';
import { fenToYuan, fenToYuanNumber } from '../utils/currency';
import type { StatisticsQueryType, AlertQueryType } from './statistics.validator';

// ==================== 课时趋势 ====================

export const getLessonTrend = async (teacherId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const { startDate, endDate, groupFormat } = getDateRange(period, targetYear, targetMonth);

  const records = await prisma.lessonRecord.findMany({
    where: {
      teacherId,
      status: 'NORMAL',
      lessonDate: { gte: startDate, lte: endDate },
    },
    select: { lessonDate: true, duration: true },
  });

  const grouped = new Map<string, number>();
  for (const r of records) {
    const key = formatLabel(r.lessonDate, groupFormat);
    grouped.set(key, (grouped.get(key) ?? 0) + r.duration);
  }

  const labels = generateLabels(period, targetYear, targetMonth);

  return labels.map((label) => ({
    label,
    value: grouped.get(label) ?? 0,
  }));
};

// ==================== 收入趋势 ====================

export const getIncomeTrend = async (teacherId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const { startDate, endDate, groupFormat } = getDateRange(period, targetYear, targetMonth);

  // 收入来自课包的 feeAmount，在代码中过滤 null
  const packages = await prisma.coursePackage.findMany({
    where: {
      teacherId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { createdAt: true, feeAmount: true },
  });

  const grouped = new Map<string, number>();
  for (const p of packages) {
    if (p.feeAmount === null) continue;
    const key = formatLabel(p.createdAt, groupFormat);
    grouped.set(key, (grouped.get(key) ?? 0) + (fenToYuanNumber(p.feeAmount) ?? 0));
  }

  const labels = generateLabels(period, targetYear, targetMonth);

  return labels.map((label) => ({
    label,
    value: grouped.get(label) ?? 0,
  }));
};

// ==================== 家长端课时趋势 ====================

export const getParentTrend = async (profileId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const bindings = await prisma.studentParent.findMany({
    where: { profileId, bindStatus: 'BOUND' },
    select: { studentId: true },
  });
  const studentIds = bindings.map((b) => b.studentId).filter((id): id is string => id !== null);

  if (studentIds.length === 0) return [];

  const { startDate, endDate, groupFormat } = getDateRange(period, targetYear, targetMonth);

  const records = await prisma.lessonRecord.findMany({
    where: {
      studentId: { in: studentIds },
      status: 'NORMAL',
      lessonDate: { gte: startDate, lte: endDate },
    },
    select: { lessonDate: true, duration: true },
  });

  const grouped = new Map<string, number>();
  for (const r of records) {
    const key = formatLabel(r.lessonDate, groupFormat);
    grouped.set(key, (grouped.get(key) ?? 0) + r.duration);
  }

  const labels = generateLabels(period, targetYear, targetMonth);

  return labels.map((label) => ({
    label,
    value: grouped.get(label) ?? 0,
  }));
};

// ==================== 学员课时消耗排行 ====================

export const getLessonRank = async (teacherId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const { startDate, endDate } = getDateRange(period, targetYear, targetMonth);

  const ranked = await prisma.lessonRecord.groupBy({
    by: ['studentId'],
    where: {
      teacherId,
      status: 'NORMAL',
      lessonDate: { gte: startDate, lte: endDate },
    },
    _sum: { duration: true },
    _count: { id: true },
    orderBy: { _sum: { duration: 'desc' } },
    take: 20,
  });

  const students = await prisma.student.findMany({
    where: { id: { in: ranked.map((r) => r.studentId) } },
    select: { id: true, name: true, avatar: true },
  });

  return ranked.map((r, index) => ({
    rank: index + 1,
    studentId: r.studentId,
    studentName: students.find((s) => s.id === r.studentId)?.name ?? '',
    avatar: students.find((s) => s.id === r.studentId)?.avatar ?? null,
    totalMinutes: r._sum.duration ?? 0,
    lessonCount: r._count.id,
  }));
};

// ==================== 收费方式收入排行 ====================

export const getPaymentRank = async (teacherId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const { startDate, endDate } = getDateRange(period, targetYear, targetMonth);

  // 按收费方式分组统计，在代码中过滤 null
  const packages = await prisma.coursePackage.findMany({
    where: {
      teacherId,
      createdAt: { gte: startDate, lte: endDate },
    },
    select: { feeMethod: true, feeAmount: true },
  });

  const grouped = new Map<string, { method: string; amount: number; count: number }>();
  for (const p of packages) {
    if (p.feeMethod === null) continue;
    const existing = grouped.get(p.feeMethod);
    if (existing) {
      existing.amount += fenToYuanNumber(p.feeAmount) ?? 0;
      existing.count += 1;
    } else {
      grouped.set(p.feeMethod, { method: p.feeMethod, amount: fenToYuanNumber(p.feeAmount) ?? 0, count: 1 });
    }
  }

  return Array.from(grouped.values())
    .sort((a, b) => b.amount - a.amount)
    .map((item, index) => ({
      rank: index + 1,
      method: item.method,
      amount: item.amount,
      count: item.count,
    }));
};

// ==================== 支出比例 ====================

export const getExpenseRatios = async (teacherId: string, query: StatisticsQueryType) => {
  const { period, year, month } = query;
  const now = new Date();
  const targetYear = year ?? now.getFullYear();
  const targetMonth = month ?? (now.getMonth() + 1);

  const { startDate, endDate } = getDateRange(period, targetYear, targetMonth);

  const [salaryTotal, deductions, campuses] = await Promise.all([
    prisma.salaryRecord.aggregate({
      where: { teacherId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.deduction.groupBy({
      by: ['type'],
      where: { teacherId, createdAt: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
    prisma.campus.findMany({
      select: { name: true, monthlyRent: true },
    }),
  ]);

  const totalSalary = fenToYuanNumber(salaryTotal._sum.amount) ?? 0;
  const totalDeduction = deductions
    .filter((d) => d.type === 'deduct')
    .reduce((sum, d) => sum + (fenToYuanNumber(d._sum.amount) ?? 0), 0);
  const totalBonus = deductions
    .filter((d) => d.type === 'bonus')
    .reduce((sum, d) => sum + (fenToYuanNumber(d._sum.amount) ?? 0), 0);
  const totalRent = campuses.reduce((sum, c) => sum + c.monthlyRent, 0);

  const totalExpense = totalSalary + totalDeduction + totalRent;

  return {
    totalExpense,
    breakdown: [
      { category: '薪资', amount: totalSalary, ratio: totalExpense > 0 ? Math.round((totalSalary / totalExpense) * 100) : 0 },
      { category: '扣款', amount: totalDeduction, ratio: totalExpense > 0 ? Math.round((totalDeduction / totalExpense) * 100) : 0 },
      { category: '补发', amount: totalBonus, ratio: totalExpense > 0 ? Math.round((totalBonus / totalExpense) * 100) : 0 },
      { category: '租金', amount: totalRent, ratio: totalExpense > 0 ? Math.round((totalRent / totalExpense) * 100) : 0 },
    ],
  };
};

// ==================== 预警列表 ====================

export const getAlerts = async (teacherId: string, query: AlertQueryType) => {
  const { viewType } = query;
  const alerts: Array<{ type: string; level: 'warning' | 'danger'; title: string; detail: string; targetId?: string }> = [];

  if (viewType === 'operation') {
    // 即将过期课包（7天内）
    const expiringPackages = await prisma.coursePackage.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
        validEnd: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      include: { student: { select: { name: true } } },
      take: 10,
    });

    for (const pkg of expiringPackages) {
      alerts.push({
        type: 'package_expiring',
        level: 'warning',
        title: '课包即将过期',
        detail: `${pkg.student.name} 的课包「${pkg.name}」将于 ${pkg.validEnd!.toISOString().slice(0, 10)} 过期，剩余 ${pkg.totalHours - pkg.usedHours} 课时`,
        targetId: pkg.id,
      });
    }

    // 课时不足学生（剩余 < 5）
    const lowHourPackages = await prisma.coursePackage.findMany({
      where: {
        teacherId,
        status: 'ACTIVE',
      },
      include: { student: { select: { name: true } } },
    });

    for (const pkg of lowHourPackages) {
      const remaining = pkg.totalHours - pkg.usedHours;
      if (remaining > 0 && remaining < 5) {
        alerts.push({
          type: 'low_hours',
          level: 'danger',
          title: '课时不足',
          detail: `${pkg.student.name} 的课包「${pkg.name}」仅剩 ${remaining} 课时`,
          targetId: pkg.id,
        });
      }
    }

    // 待审批请假
    const pendingLeaves = await prisma.leaveRequest.count({
      where: { teacherId, status: 'PENDING' },
    });

    if (pendingLeaves > 0) {
      alerts.push({
        type: 'pending_leave',
        level: 'warning',
        title: '待审批请假',
        detail: `有 ${pendingLeaves} 条请假申请待审批`,
      });
    }
  } else {
    // 财务预警
    const pendingSalary = await prisma.salaryRecord.count({
      where: { teacherId, status: 'pending' },
    });

    if (pendingSalary > 0) {
      alerts.push({
        type: 'pending_salary',
        level: 'warning',
        title: '待确认薪资',
        detail: `有 ${pendingSalary} 条薪资记录待确认`,
      });
    }

    // 逾期分期
    const overdueInstallments = await prisma.installmentSchedule.findMany({
      where: {
        paid: false,
        dueDate: { lt: new Date() },
        package: { teacherId },
      },
      include: {
        package: { include: { student: { select: { name: true } } } },
      },
      take: 10,
    });

    for (const inst of overdueInstallments) {
      alerts.push({
        type: 'overdue_installment',
        level: 'danger',
        title: '分期逾期',
        detail: `${inst.package.student.name} 的分期第 ${inst.period} 期已逾期，应缴 ${fenToYuan(inst.amount) ?? '0.00'} 元`,
        targetId: inst.id,
      });
    }
  }

  return alerts;
};

// ==================== 洞察列表 ====================

export const getInsights = async (teacherId: string, query: AlertQueryType) => {
  const { viewType } = query;
  const insights: Array<{ type: string; title: string; detail: string; metric?: number; trend?: 'up' | 'down' | 'stable' }> = [];

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  if (viewType === 'operation') {
    const [thisMonthLessons, lastMonthLessons] = await Promise.all([
      prisma.lessonRecord.count({
        where: { teacherId, status: 'NORMAL', lessonDate: { gte: thisMonthStart } },
      }),
      prisma.lessonRecord.count({
        where: { teacherId, status: 'NORMAL', lessonDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      }),
    ]);

    const lessonTrend: 'up' | 'down' | 'stable' = thisMonthLessons > lastMonthLessons ? 'up' : thisMonthLessons < lastMonthLessons ? 'down' : 'stable';
    insights.push({
      type: 'lesson_trend',
      title: '消课趋势',
      detail: `本月消课 ${thisMonthLessons} 次，${lessonTrend === 'up' ? '高于' : lessonTrend === 'down' ? '低于' : '持平'}上月（${lastMonthLessons} 次）`,
      metric: thisMonthLessons,
      trend: lessonTrend,
    });

    const [thisMonthStudents, lastMonthStudents] = await Promise.all([
      prisma.student.count({ where: { teacherId, createdAt: { gte: thisMonthStart } } }),
      prisma.student.count({ where: { teacherId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } } }),
    ]);

    const studentTrend: 'up' | 'down' | 'stable' = thisMonthStudents > lastMonthStudents ? 'up' : thisMonthStudents < lastMonthStudents ? 'down' : 'stable';
    insights.push({
      type: 'student_growth',
      title: '学员增长',
      detail: `本月新增 ${thisMonthStudents} 名学员，${studentTrend === 'up' ? '高于' : studentTrend === 'down' ? '低于' : '持平'}上月（${lastMonthStudents} 名）`,
      metric: thisMonthStudents,
      trend: studentTrend,
    });

    const activePackages = await prisma.coursePackage.count({
      where: { teacherId, status: 'ACTIVE' },
    });

    insights.push({
      type: 'active_packages',
      title: '活跃课包',
      detail: `当前有 ${activePackages} 个活跃课包`,
      metric: activePackages,
      trend: 'stable',
    });
  } else {
    // 财务洞察
    const [thisMonthIncome, lastMonthIncome] = await Promise.all([
      prisma.coursePackage.aggregate({
        where: { teacherId, createdAt: { gte: thisMonthStart } },
        _sum: { feeAmount: true },
      }),
      prisma.coursePackage.aggregate({
        where: { teacherId, createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
        _sum: { feeAmount: true },
      }),
    ]);

    const thisIncome = fenToYuanNumber(thisMonthIncome._sum?.feeAmount) ?? 0;
    const lastIncome = fenToYuanNumber(lastMonthIncome._sum?.feeAmount) ?? 0;
    const incomeTrend: 'up' | 'down' | 'stable' = thisIncome > lastIncome ? 'up' : thisIncome < lastIncome ? 'down' : 'stable';

    insights.push({
      type: 'income_trend',
      title: '收入趋势',
      detail: `本月收入 ${thisIncome} 元，${incomeTrend === 'up' ? '高于' : incomeTrend === 'down' ? '低于' : '持平'}上月（${lastIncome} 元）`,
      metric: thisIncome,
      trend: incomeTrend,
    });

    const pendingInstallments = await prisma.installmentSchedule.aggregate({
      where: { paid: false, package: { teacherId } },
      _sum: { amount: true },
      _count: true,
    });

    insights.push({
      type: 'pending_installment',
      title: '待收分期',
      detail: `有 ${pendingInstallments._count} 期待收分期，合计 ${fenToYuan(pendingInstallments._sum?.amount) ?? '0.00'} 元`,
      metric: fenToYuanNumber(pendingInstallments._sum?.amount) ?? 0,
      trend: 'stable',
    });
  }

  return insights;
};

// ==================== 校区运营数据 ====================

export const getCampusData = async (campusId: string) => {
  const campus = await prisma.campus.findUnique({ where: { id: campusId } });
  if (!campus) return null;

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisQuarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const thisYearStart = new Date(now.getFullYear(), 0, 1);

  const campusTeachers = await prisma.teacher.findMany({
    where: { campusId },
    select: { id: true },
  });
  const teacherIds = campusTeachers.map((teacher) => teacher.id);

  if (teacherIds.length === 0) {
    return {
      campusId,
      campusName: campus.name,
      monthlyRent: campus.monthlyRent,
      monthly: { newStudents: 0, lessons: 0, hours: 0, income: 0 },
      quarterly: { lessons: 0, income: 0 },
      yearly: { lessons: 0, income: 0 },
    };
  }

  const [monthStudents, monthLessons, monthHours, monthIncome] = await Promise.all([
    prisma.student.count({ where: { teacherId: { in: teacherIds }, createdAt: { gte: thisMonthStart } } }),
    prisma.lessonRecord.count({ where: { teacherId: { in: teacherIds }, status: 'NORMAL', lessonDate: { gte: thisMonthStart } } }),
    prisma.lessonRecord.aggregate({
      where: { teacherId: { in: teacherIds }, status: 'NORMAL', lessonDate: { gte: thisMonthStart } },
      _sum: { duration: true },
    }),
    prisma.coursePackage.aggregate({
      where: { teacherId: { in: teacherIds }, createdAt: { gte: thisMonthStart } },
      _sum: { feeAmount: true },
    }),
  ]);

  const [quarterLessons, quarterIncome] = await Promise.all([
    prisma.lessonRecord.count({ where: { teacherId: { in: teacherIds }, status: 'NORMAL', lessonDate: { gte: thisQuarterStart } } }),
    prisma.coursePackage.aggregate({
      where: { teacherId: { in: teacherIds }, createdAt: { gte: thisQuarterStart } },
      _sum: { feeAmount: true },
    }),
  ]);

  const [yearLessons, yearIncome] = await Promise.all([
    prisma.lessonRecord.count({ where: { teacherId: { in: teacherIds }, status: 'NORMAL', lessonDate: { gte: thisYearStart } } }),
    prisma.coursePackage.aggregate({
      where: { teacherId: { in: teacherIds }, createdAt: { gte: thisYearStart } },
      _sum: { feeAmount: true },
    }),
  ]);

  return {
    campusId,
    campusName: campus.name,
    monthlyRent: campus.monthlyRent,
    monthly: {
      newStudents: monthStudents,
      lessons: monthLessons,
      hours: monthHours._sum?.duration ?? 0,
      income: fenToYuanNumber(monthIncome._sum?.feeAmount) ?? 0,
    },
    quarterly: {
      lessons: quarterLessons,
      income: fenToYuanNumber(quarterIncome._sum?.feeAmount) ?? 0,
    },
    yearly: {
      lessons: yearLessons,
      income: fenToYuanNumber(yearIncome._sum?.feeAmount) ?? 0,
    },
  };
};

// ==================== 发薪日设置 ====================

export const getPayDaySettings = async () => {
  const mainCampus = await prisma.campus.findFirst({ where: { isMain: true } });

  return {
    payDay: mainCampus?.rentDueDay ?? 15,
    pushDaysBefore: 3,
    autoConfirm: false,
    pushEnabled: true,
  };
};

export const updatePayDaySettings = async (data: { payDay: number; pushDaysBefore?: number; autoConfirm?: boolean; pushEnabled?: boolean }) => {
  const mainCampus = await prisma.campus.findFirst({ where: { isMain: true } });

  if (mainCampus) {
    await prisma.campus.update({
      where: { id: mainCampus.id },
      data: { rentDueDay: data.payDay },
    });
  } else {
    await prisma.campus.create({
      data: {
        name: '默认校区',
        isMain: true,
        rentDueDay: data.payDay,
      },
    });
  }

  return {
    payDay: data.payDay,
    pushDaysBefore: data.pushDaysBefore ?? 3,
    autoConfirm: data.autoConfirm ?? false,
    pushEnabled: data.pushEnabled ?? true,
  };
};

// ==================== 辅助函数 ====================

function getDateRange(period: string, year: number, month: number) {
  let startDate: Date;
  let endDate: Date;
  let groupFormat: 'day' | 'week' | 'month';

  switch (period) {
    case 'year':
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
      groupFormat = 'month';
      break;
    case 'quarter': {
      const quarterStart = Math.floor((month - 1) / 3) * 3;
      startDate = new Date(year, quarterStart, 1);
      endDate = new Date(year, quarterStart + 3, 0, 23, 59, 59);
      groupFormat = 'week';
      break;
    }
    case 'month':
    default:
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
      groupFormat = 'day';
      break;
  }

  return { startDate, endDate, groupFormat };
}

function formatLabel(date: Date, format: 'day' | 'week' | 'month'): string {
  switch (format) {
    case 'day':
      return date.toISOString().slice(0, 10);
    case 'month':
      return date.toISOString().slice(0, 7);
    case 'week': {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
      const week1 = new Date(d.getFullYear(), 0, 4);
      const weekNumber = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
      return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
    }
  }
}

function generateLabels(period: string, year: number, month: number): string[] {
  switch (period) {
    case 'year':
      return Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
    case 'quarter': {
      const quarterStart = Math.floor((month - 1) / 3) * 3;
      const labels: string[] = [];
      const start = new Date(year, quarterStart, 1);
      const end = new Date(year, quarterStart + 3, 0);
      const current = new Date(start);
      while (current <= end) {
        labels.push(formatLabel(current, 'week'));
        current.setDate(current.getDate() + 7);
      }
      return [...new Set(labels)];
    }
    case 'month':
    default: {
      const daysInMonth = new Date(year, month, 0).getDate();
      return Array.from({ length: daysInMonth }, (_, i) => `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`);
    }
  }
}
