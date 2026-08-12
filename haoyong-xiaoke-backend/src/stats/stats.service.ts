import { prisma } from '../config/database';
import { NotFoundError, ForbiddenError } from '../utils/errors';
import { assertParentBoundToStudent } from '../utils/permission';

// ==================== 教师统计 ====================

export const getTeacherStats = async (teacherId: string) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // 基础统计
  const [totalStudents, totalClasses, totalPackages, lessonsThisMonth] = await Promise.all([
    prisma.student.count({ where: { teacherId } }),
    prisma.class.count({ where: { teacherId, status: 'ACTIVE' } }),
    prisma.coursePackage.count({ where: { teacherId } }),
    prisma.lessonRecord.findMany({
      where: { teacherId, lessonDate: { gte: monthStart, lte: monthEnd }, status: 'NORMAL' },
      select: { duration: true },
    }),
  ]);

  const totalLessonsThisMonth = lessonsThisMonth.length;
  const totalHoursThisMonth = lessonsThisMonth.reduce((sum, l) => sum + l.duration, 0);

  // 近 6 个月学生趋势
  const studentTrend = await getMonthlyTrend(teacherId, 'student');

  // 近 6 个月消课趋势
  const lessonTrend = await getMonthlyTrend(teacherId, 'lesson');

  // 套餐状态分布
  const packageStatus = await getPackageStatusDistribution(teacherId);

  // Top 5 学生
  const topStudents = await getTopStudents(teacherId);

  return {
    overview: {
      totalStudents,
      totalClasses,
      totalPackages,
      totalLessonsThisMonth,
      totalHoursThisMonth,
    },
    studentTrend,
    lessonTrend,
    packageStatus,
    topStudents,
  };
};

// ==================== 学生统计 ====================

export const getStudentStats = async (studentId: string, userId: string, role: string, profileId?: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) throw new NotFoundError('学生不存在');

  // 权限校验
  if (role === 'TEACHER') {
    if (student.teacherId !== userId) throw new ForbiddenError('无权查看该学生');
  } else if (role === 'PARENT') {
    if (!profileId) throw new ForbiddenError('无权查看该学生');
    // 使用统一的权限校验方法，只允许 BOUND 状态的家长访问
    await assertParentBoundToStudent(profileId, studentId);
  }

  // 基础统计
  const [totalLessons, packages] = await Promise.all([
    prisma.lessonRecord.count({ where: { studentId, status: 'NORMAL' } }),
    prisma.coursePackage.findMany({
      where: { studentId },
      select: { id: true, name: true, totalHours: true, usedHours: true, status: true },
    }),
  ]);

  const totalHours = await prisma.lessonRecord.aggregate({
    where: { studentId, status: 'NORMAL' },
    _sum: { duration: true },
  });

  const remainingHours = packages.reduce((sum, p) => sum + (p.totalHours - p.usedHours), 0);

  // 近 6 个月消课趋势
  const lessonTrend = await getStudentLessonTrend(studentId);

  // 套餐使用率
  const packageUsage = packages.map((p) => ({
    packageId: p.id,
    name: p.name,
    totalHours: p.totalHours,
    usedHours: p.usedHours,
    usageRate: p.totalHours > 0 ? Math.round((p.usedHours / p.totalHours) * 100) : 0,
  }));

  // 最近 10 条消课
  const recentLessons = await prisma.lessonRecord.findMany({
    where: { studentId, status: 'NORMAL' },
    orderBy: { lessonDate: 'desc' },
    take: 10,
    select: { id: true, lessonDate: true, duration: true, content: true, status: true },
  });

  return {
    studentId,
    studentName: student.name,
    overview: {
      totalLessons,
      totalHours: totalHours._sum.duration ?? 0,
      totalPackages: packages.length,
      remainingHours,
    },
    lessonTrend,
    packageUsage,
    recentLessons: recentLessons.map((l) => ({
      ...l,
      lessonDate: l.lessonDate.toISOString().slice(0, 10),
    })),
  };
};

// ==================== 辅助函数 ====================

/**
 * 教师维度月度趋势（消除 N+1：使用 groupBy 一次性聚合）
 */
async function getMonthlyTrend(teacherId: string, type: 'student' | 'lesson') {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // 生成近 6 个月的月份键
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  const monthMap = new Map(monthKeys.map((k) => [k, { month: k, count: 0, hours: 0 }]));

  if (type === 'student') {
    // 使用 createdAt <= monthEnd 的累计统计，用 groupBy 一次获取所有月份的学生创建数
    const grouped = await prisma.student.groupBy({
      by: ['createdAt'],
      where: { teacherId, createdAt: { gte: sixMonthsAgo } },
      _count: { id: true },
    });
    // 按月份聚合
    for (const g of grouped) {
      const month = g.createdAt.toISOString().slice(0, 7);
      const existing = monthMap.get(month);
      if (existing) existing.count += g._count.id;
    }
    // 累计计算（每月的 count 为累计学生数）
    let cumulative = 0;
    const baseCount = await prisma.student.count({
      where: { teacherId, createdAt: { lt: sixMonthsAgo } },
    });
    cumulative = baseCount;
    return monthKeys.map((k) => {
      const item = monthMap.get(k)!;
      cumulative += item.count;
      return { month: k, count: cumulative };
    });
  }

  // lesson 类型：使用 groupBy 一次获取所有月份的消课数和时长
  const grouped = await prisma.lessonRecord.groupBy({
    by: ['lessonDate'],
    where: {
      teacherId,
      status: 'NORMAL',
      lessonDate: { gte: sixMonthsAgo },
    },
    _count: { id: true },
    _sum: { duration: true },
  });

  for (const g of grouped) {
    const month = g.lessonDate.toISOString().slice(0, 7);
    const existing = monthMap.get(month);
    if (existing) {
      existing.count += g._count.id;
      existing.hours += g._sum.duration ?? 0;
    }
  }

  return monthKeys.map((k) => {
    const item = monthMap.get(k)!;
    return { month: k, count: item.count, hours: item.hours };
  });
}

/**
 * 学生维度月度消课趋势（消除 N+1：使用 groupBy 一次性聚合）
 */
async function getStudentLessonTrend(studentId: string) {
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }
  const monthMap = new Map(monthKeys.map((k) => [k, { month: k, count: 0, hours: 0 }]));

  const grouped = await prisma.lessonRecord.groupBy({
    by: ['lessonDate'],
    where: {
      studentId,
      status: 'NORMAL',
      lessonDate: { gte: sixMonthsAgo },
    },
    _count: { id: true },
    _sum: { duration: true },
  });

  for (const g of grouped) {
    const month = g.lessonDate.toISOString().slice(0, 7);
    const existing = monthMap.get(month);
    if (existing) {
      existing.count += g._count.id;
      existing.hours += g._sum.duration ?? 0;
    }
  }

  return monthKeys.map((k) => {
    const item = monthMap.get(k)!;
    return { month: k, count: item.count, hours: item.hours };
  });
}

/**
 * 套餐状态分布（消除 N+1：使用 groupBy 替代 3 次独立 count）
 */
async function getPackageStatusDistribution(teacherId: string) {
  const grouped = await prisma.coursePackage.groupBy({
    by: ['status'],
    where: { teacherId },
    _count: { id: true },
  });

  const result = { active: 0, expired: 0, depleted: 0 };
  for (const g of grouped) {
    if (g.status === 'ACTIVE') result.active = g._count.id;
    else if (g.status === 'EXPIRED') result.expired = g._count.id;
    else if (g.status === 'DEPLETED') result.depleted = g._count.id;
  }

  return result;
}

/**
 * Top 5 学生（已使用 groupBy，无需优化）
 */
async function getTopStudents(teacherId: string) {
  const topRecords = await prisma.lessonRecord.groupBy({
    by: ['studentId'],
    where: { teacherId, status: 'NORMAL' },
    _count: { id: true },
    _sum: { duration: true },
    orderBy: { _count: { id: 'desc' } },
    take: 5,
  });

  const students = await prisma.student.findMany({
    where: { id: { in: topRecords.map((r) => r.studentId) } },
    select: { id: true, name: true },
  });

  return topRecords.map((r) => ({
    id: r.studentId,
    name: students.find((s) => s.id === r.studentId)?.name ?? '',
    lessonCount: r._count.id,
    totalHours: r._sum.duration ?? 0,
  }));
}
