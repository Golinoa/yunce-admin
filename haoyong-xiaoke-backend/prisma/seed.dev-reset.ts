import 'dotenv/config';
import { PrismaClient, Role, Gender, StudentStatus, BindStatus, PackageStatus, LessonStatus, ClassStatus, LeaveStatus, NotificationType, FeedbackType, FeedbackHandleStatus } from '@prisma/client';

const prisma = new PrismaClient();
const SEEDED_LESSON_HOURS_USED = 1;

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('开发重置 seed 仅允许在 NODE_ENV=development 环境执行');
  }

  console.log('🌱 开始执行开发环境重置 seed...');
  console.log('⚠️ 该脚本会清空现有业务数据，仅限本地开发显式执行');

  // 清空所有表（按依赖顺序）
  await prisma.feedback.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.lessonRecord.deleteMany();
  await prisma.classStudent.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.coursePackage.deleteMany();
  await prisma.studentParent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.profile.deleteMany();
  console.log('✅ 清空旧数据完成');

  // ==================== Profile ====================
  const principalProfile1 = await prisma.profile.create({
    data: {
      unionId: 'union_principal_001',
      openId: 'open_principal_001',
      avatar: 'https://picsum.photos/seed/t1/200/200',
      nickname: '张校长',
      phone: '13800138001',
      role: Role.PRINCIPAL,
    },
  });

  const principalProfile2 = await prisma.profile.create({
    data: {
      unionId: 'union_principal_002',
      openId: 'open_principal_002',
      avatar: 'https://picsum.photos/seed/t2/200/200',
      nickname: '李校长',
      phone: '13800138002',
      role: Role.PRINCIPAL,
    },
  });

  const parentProfile1 = await prisma.profile.create({
    data: {
      unionId: 'union_parent_001',
      openId: 'open_parent_001',
      avatar: 'https://picsum.photos/seed/p1/200/200',
      nickname: '小明爸爸',
      phone: '13800138101',
      role: Role.PARENT,
    },
  });

  const parentProfile2 = await prisma.profile.create({
    data: {
      unionId: 'union_parent_002',
      openId: 'open_parent_002',
      avatar: 'https://picsum.photos/seed/p2/200/200',
      nickname: '小红妈妈',
      phone: '13800138102',
      role: Role.PARENT,
    },
  });

  const parentProfile3 = await prisma.profile.create({
    data: {
      unionId: 'union_parent_003',
      openId: 'open_parent_003',
      avatar: 'https://picsum.photos/seed/p3/200/200',
      nickname: '小刚妈妈',
      phone: '13800138103',
      role: Role.PARENT,
    },
  });

  const parentProfile4 = await prisma.profile.create({
    data: {
      unionId: 'union_parent_004',
      openId: 'open_parent_004',
      avatar: 'https://picsum.photos/seed/p4/200/200',
      nickname: '小丽爸爸',
      phone: '13800138104',
      role: Role.PARENT,
    },
  });

  console.log('✅ Profile 创建完成（6 条）');

  // ==================== Teacher ====================
  const teacher1 = await prisma.teacher.create({
    data: {
      profileId: principalProfile1.id,
      inviteCode: 'TEACH001',
      institution: '阳光艺术培训中心',
    },
  });

  const teacher2 = await prisma.teacher.create({
    data: {
      profileId: principalProfile2.id,
      inviteCode: 'TEACH002',
      institution: '星辰教育',
    },
  });

  console.log('✅ Teacher 创建完成（2 条）');

  // ==================== Student ====================
  const studentNames1 = [
    { name: '小明', gender: Gender.MALE, birthday: new Date('2015-03-15') },
    { name: '小红', gender: Gender.FEMALE, birthday: new Date('2016-07-22') },
    { name: '小刚', gender: Gender.MALE, birthday: new Date('2015-11-08') },
    { name: '小丽', gender: Gender.FEMALE, birthday: new Date('2016-01-30') },
    { name: '小华', gender: Gender.MALE, birthday: new Date('2015-09-12') },
  ];

  const studentNames2 = [
    { name: '小芳', gender: Gender.FEMALE, birthday: new Date('2016-05-18') },
    { name: '小强', gender: Gender.MALE, birthday: new Date('2015-12-25') },
    { name: '小雪', gender: Gender.FEMALE, birthday: new Date('2016-08-14') },
    { name: '小龙', gender: Gender.MALE, birthday: new Date('2015-06-03') },
    { name: '小梅', gender: Gender.FEMALE, birthday: new Date('2016-02-20') },
  ];

  const students1 = [];
  for (const s of studentNames1) {
    const student = await prisma.student.create({
      data: {
        teacherId: teacher1.id,
        name: s.name,
        gender: s.gender,
        birthday: s.birthday,
        status: StudentStatus.ACTIVE,
      },
    });
    students1.push(student);
  }

  const students2 = [];
  for (const s of studentNames2) {
    const student = await prisma.student.create({
      data: {
        teacherId: teacher2.id,
        name: s.name,
        gender: s.gender,
        birthday: s.birthday,
        status: StudentStatus.ACTIVE,
      },
    });
    students2.push(student);
  }

  // 给最后一个学生设置 INACTIVE 状态
  await prisma.student.update({
    where: { id: students1[4].id },
    data: { status: StudentStatus.INACTIVE },
  });

  console.log('✅ Student 创建完成（10 条）');

  // ==================== StudentParent ====================
  await prisma.studentParent.create({
    data: {
      profileId: parentProfile1.id,
      studentId: students1[0].id,
      relation: '父亲',
      bindStatus: BindStatus.BOUND,
    },
  });

  await prisma.studentParent.create({
    data: {
      profileId: parentProfile2.id,
      studentId: students1[1].id,
      relation: '母亲',
      bindStatus: BindStatus.BOUND,
    },
  });

  await prisma.studentParent.create({
    data: {
      profileId: parentProfile3.id,
      studentId: students1[2].id,
      relation: '母亲',
      bindStatus: BindStatus.PENDING,
    },
  });

  await prisma.studentParent.create({
    data: {
      profileId: parentProfile4.id,
      studentId: students1[3].id,
      relation: '父亲',
      bindStatus: BindStatus.PENDING,
    },
  });

  console.log('✅ StudentParent 创建完成（4 条）');

  // ==================== Class ====================
  const class1 = await prisma.class.create({
    data: {
      teacherId: teacher1.id,
      name: '钢琴基础班',
      subject: '钢琴',
      grade: '初级',
      schedule: '每周六 09:00-10:30',
      location: 'A301',
      status: ClassStatus.ACTIVE,
    },
  });

  const class2 = await prisma.class.create({
    data: {
      teacherId: teacher1.id,
      name: '钢琴进阶班',
      subject: '钢琴',
      grade: '中级',
      schedule: '每周六 10:30-12:00',
      location: 'A301',
      status: ClassStatus.ACTIVE,
    },
  });

  const class3 = await prisma.class.create({
    data: {
      teacherId: teacher2.id,
      name: '美术启蒙班',
      subject: '美术',
      grade: '初级',
      schedule: '每周日 14:00-15:30',
      location: 'B205',
      status: ClassStatus.ACTIVE,
    },
  });

  const class4 = await prisma.class.create({
    data: {
      teacherId: teacher2.id,
      name: '书法班（已解散）',
      subject: '书法',
      grade: '初级',
      schedule: '每周日 09:00-10:30',
      location: 'B201',
      status: ClassStatus.DISBANDED,
    },
  });

  console.log('✅ Class 创建完成（4 条）');

  // ==================== ClassStudent ====================
  const classStudentData = [
    { classId: class1.id, studentId: students1[0].id },
    { classId: class1.id, studentId: students1[1].id },
    { classId: class1.id, studentId: students1[2].id },
    { classId: class2.id, studentId: students1[3].id },
    { classId: class2.id, studentId: students1[4].id },
    { classId: class3.id, studentId: students2[0].id },
    { classId: class3.id, studentId: students2[1].id },
    { classId: class3.id, studentId: students2[2].id },
    { classId: class4.id, studentId: students2[3].id },
  ];

  for (const cs of classStudentData) {
    await prisma.classStudent.create({ data: cs });
  }

  console.log('✅ ClassStudent 创建完成（9 条）');

  // ==================== Schedule ====================
  const schedule1 = await prisma.schedule.create({
    data: {
      teacherId: teacher1.id,
      classId: class1.id,
      dayOfWeek: 6,
      startTime: '09:00',
      endTime: '10:30',
    },
  });

  const schedule2 = await prisma.schedule.create({
    data: {
      teacherId: teacher1.id,
      classId: class2.id,
      dayOfWeek: 6,
      startTime: '10:30',
      endTime: '12:00',
    },
  });

  const schedule3 = await prisma.schedule.create({
    data: {
      teacherId: teacher2.id,
      classId: class3.id,
      dayOfWeek: 0,
      startTime: '14:00',
      endTime: '15:30',
    },
  });

  await prisma.schedule.create({
    data: {
      teacherId: teacher2.id,
      classId: class4.id,
      dayOfWeek: 0,
      startTime: '09:00',
      endTime: '10:30',
    },
  });

  console.log('✅ Schedule 创建完成（4 条）');

  // ==================== CoursePackage ====================
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const threeMonthsLater = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const package1 = await prisma.coursePackage.create({
    data: {
      teacherId: teacher1.id,
      studentId: students1[0].id,
      name: '钢琴课 20 节套餐',
      totalHours: 20,
      usedHours: 0,
      validStart: threeMonthsAgo,
      validEnd: threeMonthsLater,
      status: PackageStatus.ACTIVE,
    },
  });

  const package2 = await prisma.coursePackage.create({
    data: {
      teacherId: teacher1.id,
      studentId: students1[1].id,
      name: '钢琴课 30 节套餐',
      totalHours: 30,
      usedHours: 0,
      validStart: threeMonthsAgo,
      validEnd: threeMonthsLater,
      status: PackageStatus.ACTIVE,
    },
  });

  const package3 = await prisma.coursePackage.create({
    data: {
      teacherId: teacher1.id,
      studentId: students1[2].id,
      name: '钢琴课 10 节套餐（已过期）',
      totalHours: 10,
      usedHours: 0,
      validStart: new Date('2024-01-01'),
      validEnd: new Date('2024-06-30'),
      status: PackageStatus.EXPIRED,
    },
  });

  await prisma.coursePackage.create({
    data: {
      teacherId: teacher1.id,
      studentId: students1[3].id,
      name: '钢琴课 10 节套餐（未开始）',
      totalHours: 10,
      usedHours: 0,
      validStart: threeMonthsAgo,
      validEnd: threeMonthsLater,
      status: PackageStatus.ACTIVE,
    },
  });

  const package5 = await prisma.coursePackage.create({
    data: {
      teacherId: teacher2.id,
      studentId: students2[0].id,
      name: '美术课 20 节套餐',
      totalHours: 20,
      usedHours: 0,
      validStart: oneMonthAgo,
      validEnd: threeMonthsLater,
      status: PackageStatus.ACTIVE,
    },
  });

  const package6 = await prisma.coursePackage.create({
    data: {
      teacherId: teacher2.id,
      studentId: students2[1].id,
      name: '美术课 15 节套餐',
      totalHours: 15,
      usedHours: 0,
      validStart: oneMonthAgo,
      validEnd: threeMonthsLater,
      status: PackageStatus.ACTIVE,
    },
  });

  console.log('✅ CoursePackage 创建完成（6 条）');

  // ==================== LessonRecord ====================
  const lessonContents = [
    '学习基础指法练习',
    '练习音阶与和弦',
    '学习新曲目《小星星》',
    '复习上节课内容',
    '学习踏板技巧',
    '练习节奏感训练',
    '学习乐理基础知识',
    '曲目练习《致爱丽丝》',
    '手指独立性训练',
    '音乐表现力训练',
  ];

  const homeworks = [
    '每天练习指法 15 分钟',
    '完成音阶练习作业',
    '熟记《小星星》旋律',
    '复习笔记内容',
    '练习踏板配合',
    '节奏练习打卡',
    '完成乐理习题',
    '练习《致爱丽丝》前半段',
    '手指操练习',
    '准备下节课展示',
  ];

  let lessonCount = 0;
  // 为张老师的学生生成消课记录
  for (let weekOffset = 0; weekOffset < 10; weekOffset++) {
    const lessonDate = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);

    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const student = students1[sIdx];
      const contentIdx = (weekOffset + sIdx) % lessonContents.length;
      const isCancelled = weekOffset === 2 && sIdx === 1; // 第3周第2个学生取消

      await prisma.lessonRecord.create({
        data: {
          teacherId: teacher1.id,
          studentId: student.id,
          packageId: sIdx < 2 ? [package1, package2][sIdx]?.id : package3.id,
          classId: sIdx < 3 ? class1.id : class2.id,
          scheduleId: sIdx < 3 ? schedule1.id : schedule2.id,
          lessonDate: lessonDate,
          duration: 45,
          hoursUsed: SEEDED_LESSON_HOURS_USED,
          content: lessonContents[contentIdx],
          homework: homeworks[contentIdx],
          status: isCancelled ? LessonStatus.CANCELLED : LessonStatus.NORMAL,
        },
      });
      lessonCount++;
    }
  }

  // 为李老师的学生生成消课记录
  for (let weekOffset = 0; weekOffset < 7; weekOffset++) {
    const lessonDate = new Date(now.getTime() - weekOffset * 7 * 24 * 60 * 60 * 1000);

    for (let sIdx = 0; sIdx < 2; sIdx++) {
      const student = students2[sIdx];
      const contentIdx = (weekOffset + sIdx + 5) % lessonContents.length;

      await prisma.lessonRecord.create({
        data: {
          teacherId: teacher2.id,
          studentId: student.id,
          packageId: sIdx === 0 ? package5.id : package6.id,
          classId: class3.id,
          scheduleId: schedule3.id,
          lessonDate: lessonDate,
          duration: 45,
          hoursUsed: SEEDED_LESSON_HOURS_USED,
          content: lessonContents[contentIdx],
          homework: homeworks[contentIdx],
          status: LessonStatus.NORMAL,
        },
      });
      lessonCount++;
    }
  }

  console.log(`✅ LessonRecord 创建完成（${lessonCount} 条）`);

  const seededPackageUsage = await prisma.lessonRecord.groupBy({
    by: ['packageId'],
    where: {
      packageId: { not: null },
      status: LessonStatus.NORMAL,
    },
    _sum: { hoursUsed: true },
  });

  for (const usage of seededPackageUsage) {
    if (!usage.packageId) {
      continue;
    }

    const pkg = await prisma.coursePackage.findUnique({
      where: { id: usage.packageId },
      select: { totalHours: true, status: true },
    });

    if (!pkg) {
      continue;
    }

    const usedHours = usage._sum.hoursUsed ?? 0;
    const status = pkg.status === PackageStatus.EXPIRED
      ? PackageStatus.EXPIRED
      : usedHours >= pkg.totalHours
        ? PackageStatus.DEPLETED
        : PackageStatus.ACTIVE;

    await prisma.coursePackage.update({
      where: { id: usage.packageId },
      data: { usedHours, status },
    });
  }

  // ==================== LeaveRequest ====================
  await prisma.leaveRequest.create({
    data: {
      studentId: students1[0].id,
      parentId: parentProfile1.id,
      teacherId: teacher1.id,
      startDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
      reason: '身体不适，需要休息',
      status: LeaveStatus.APPROVED,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: students1[1].id,
      parentId: parentProfile2.id,
      teacherId: teacher1.id,
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      reason: '家中有事',
      status: LeaveStatus.APPROVED,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: students1[2].id,
      teacherId: teacher1.id,
      startDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      reason: '学校考试',
      status: LeaveStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: students2[0].id,
      teacherId: teacher2.id,
      startDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      reason: '参加比赛',
      status: LeaveStatus.PENDING,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: students2[1].id,
      teacherId: teacher2.id,
      startDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000),
      reason: '外出旅游',
      status: LeaveStatus.REJECTED,
    },
  });

  await prisma.leaveRequest.create({
    data: {
      studentId: students1[3].id,
      teacherId: teacher1.id,
      startDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      reason: '感冒发烧',
      status: LeaveStatus.PENDING,
    },
  });

  console.log('✅ LeaveRequest 创建完成（6 条）');

  // ==================== Notification ====================
  const notificationData = [
    { type: NotificationType.SYSTEM, title: '欢迎使用好用消课', content: '欢迎使用好用消课系统，祝您使用愉快！' },
    { type: NotificationType.LEAVE, title: '请假审批通知', content: '小明同学提交了请假申请，请及时审批。' },
    { type: NotificationType.SCHEDULE, title: '排课变更通知', content: '本周六钢琴课时间调整为 10:00-11:30。' },
    { type: NotificationType.CHECKIN, title: '签到提醒', content: '明天 09:00 有钢琴基础课，请准时签到。' },
    { type: NotificationType.HOMEWORK, title: '作业提醒', content: '请完成本周指法练习作业。' },
  ];

  let notifCount = 0;

  // 给教师发通知
  for (let i = 0; i < 5; i++) {
    const nd = notificationData[i];
    await prisma.notification.create({
      data: {
        senderId: parentProfile1.id,
        receiverId: principalProfile1.id,
        type: nd.type,
        title: nd.title,
        content: nd.content,
        read: i < 3,
      },
    });
    notifCount++;
  }

  // 给家长发通知
  for (let i = 0; i < 5; i++) {
    const nd = notificationData[i];
    await prisma.notification.create({
      data: {
        senderId: principalProfile1.id,
        receiverId: parentProfile1.id,
        type: nd.type,
        title: nd.title,
        content: nd.content,
        read: i < 2,
      },
    });
    notifCount++;
  }

  // 给教师2发通知
  for (let i = 0; i < 5; i++) {
    const nd = notificationData[i];
    await prisma.notification.create({
      data: {
        senderId: parentProfile3.id,
        receiverId: principalProfile2.id,
        type: nd.type,
        title: nd.title,
        content: nd.content,
        read: i < 2,
      },
    });
    notifCount++;
  }

  // 给家长2发通知
  for (let i = 0; i < 5; i++) {
    const nd = notificationData[i];
    await prisma.notification.create({
      data: {
        senderId: principalProfile2.id,
        receiverId: parentProfile2.id,
        type: nd.type,
        title: nd.title,
        content: nd.content,
        read: false,
      },
    });
    notifCount++;
  }

  console.log(`✅ Notification 创建完成（${notifCount} 条）`);

  // ==================== Feedback ====================
  await prisma.feedback.create({
    data: {
      profileId: principalProfile1.id,
      type: FeedbackType.FEATURE,
      content: '希望增加批量消课功能，可以一次给多个学生消课。',
      images: ['https://picsum.photos/seed/feedback-1/800/600'],
      contact: '13800138001',
      handleStatus: FeedbackHandleStatus.PROCESSING,
      handleRemark: '已记录需求，排入下一轮评估。',
      handledAt: new Date(),
      handledByAdminId: adminUser.id,
    },
  });

  await prisma.feedback.create({
    data: {
      profileId: parentProfile1.id,
      type: FeedbackType.BUG,
      content: '签到功能偶尔会闪退，手机型号 iPhone 15 Pro。',
      images: [
        'https://picsum.photos/seed/feedback-2/800/600',
        'https://picsum.photos/seed/feedback-3/800/600',
      ],
      contact: '13800138101',
      handleStatus: FeedbackHandleStatus.PENDING,
    },
  });

  await prisma.feedback.create({
    data: {
      profileId: principalProfile2.id,
      type: FeedbackType.FEATURE,
      content: '建议增加课程模板功能，方便快速创建课程。',
      contact: '13800138002',
      handleStatus: FeedbackHandleStatus.RESOLVED,
      handleRemark: '已在新版本中上线模板能力。',
      handledAt: new Date(),
      handledByAdminId: adminUser.id,
    },
  });

  await prisma.feedback.create({
    data: {
      profileId: parentProfile2.id,
      type: FeedbackType.OTHER,
      content: '系统整体很好用，希望能增加消息推送功能。',
      contact: '13800138102',
      handleStatus: FeedbackHandleStatus.CLOSED,
      handleRemark: '已回访确认，先关闭归档。',
      handledAt: new Date(),
      handledByAdminId: adminUser.id,
    },
  });

  await prisma.feedback.create({
    data: {
      profileId: parentProfile3.id,
      type: FeedbackType.BUG,
      content: '课时统计页面数据偶尔不准确，刷新后恢复。',
      images: ['https://picsum.photos/seed/feedback-4/800/600'],
      contact: '13800138103',
      handleStatus: FeedbackHandleStatus.PENDING,
    },
  });

  console.log('✅ Feedback 创建完成（5 条）');

  // ==================== 统计输出 ====================
  const counts = {
    profiles: await prisma.profile.count(),
    teachers: await prisma.teacher.count(),
    students: await prisma.student.count(),
    studentParents: await prisma.studentParent.count(),
    classes: await prisma.class.count(),
    classStudents: await prisma.classStudent.count(),
    schedules: await prisma.schedule.count(),
    coursePackages: await prisma.coursePackage.count(),
    lessonRecords: await prisma.lessonRecord.count(),
    leaveRequests: await prisma.leaveRequest.count(),
    notifications: await prisma.notification.count(),
    feedbacks: await prisma.feedback.count(),
  };

  console.log('\n📊 种子数据统计：');
  console.table(counts);
  console.log('🎉 种子数据插入完成！');
}

main()
  .catch((e) => {
    console.error('❌ 种子数据插入失败：', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
