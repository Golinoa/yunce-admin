import { Router } from 'express';
import authRoutes from '../auth/auth.routes';
import studentRoutes from '../student/student.routes';
import lessonRecordRoutes from '../lesson-record/lesson-record.routes';
import classRoutes from '../class/class.routes';
import scheduleRoutes from '../schedule/schedule.routes';
import packageRoutes from '../course-package/course-package.routes';
import leaveRoutes from '../leave-request/leave-request.routes';
import notificationRoutes from '../notification/notification.routes';
import statsRoutes from '../stats/stats.routes';
import profileRoutes from '../profile/profile.routes';
import feedbackRoutes from '../feedback/feedback.routes';
import uploadRoutes from '../upload/upload.routes';
import uploadTokenRoutes from '../upload/upload-token.routes';
import homeRoutes from '../home/home.routes';
import teacherRoutes from '../teacher/teacher.routes';
import packageTemplateRoutes from '../package-template/package-template.routes';
import campusRoutes from '../campus/campus.routes';
import subjectRoutes from '../subject/subject.routes';
import holidayRoutes from '../holiday/holiday.routes';
import notifySettingRoutes from '../notify-setting/notify-setting.routes';
import rechargeRoutes from '../recharge/recharge.routes';
import installmentRoutes from '../installment/installment.routes';
import exportRoutes from '../export/export.routes';
import auditRoutes from '../audit/audit.routes';
import statisticsRoutes from '../statistics/statistics.routes';
import venueRoutes from '../venue/venue.routes';
import cardTypeRoutes from '../card-type/card-type.routes';
import memberCardRoutes from '../card-type/member-card.routes';
import followRecordRoutes from '../follow-record/follow-record.routes';
import studentFollowRoutes from '../follow-record/student-follow.routes';
import leadRoutes from '../lead/lead.routes';
import leadPublicRoutes from '../lead/lead-public.routes';
import attendanceRoutes from '../attendance/attendance.routes';

const router = Router();

// 首页聚合模块
router.use('/home', homeRoutes);

// 认证模块
router.use('/auth', authRoutes);

// 教师管理模块
router.use('/teachers', teacherRoutes);

// 学生管理模块
router.use('/students', studentRoutes);

// 消课记录模块
router.use('/lesson-records', lessonRecordRoutes);

// 班级管理模块
router.use('/classes', classRoutes);

// 排课管理模块
router.use('/schedules', scheduleRoutes);

// 课时套餐模块
router.use('/course-packages', packageRoutes);

// 课包模板模块
router.use('/package-templates', packageTemplateRoutes);

// 校区管理模块
router.use('/campuses', campusRoutes);

// 科目管理模块
router.use('/subjects', subjectRoutes);

// 节假日管理模块
router.use('/holidays', holidayRoutes);

// 通知偏好设置模块
router.use('/notify-settings', notifySettingRoutes);

// 课时充值记录模块
router.use('/recharges', rechargeRoutes);

// 分期记账模块
router.use('/installments', installmentRoutes);

// 数据导出模块
router.use('/export', exportRoutes);

// 审计日志模块
router.use('/audit-logs', auditRoutes);

// 请假管理模块
router.use('/leave-requests', leaveRoutes);

// 通知管理模块
router.use('/notifications', notificationRoutes);

// 统计模块
router.use('/stats', statsRoutes);

// 高级统计模块
router.use('/statistics', statisticsRoutes);

// 场地预约模块
router.use('/venues', venueRoutes);

// 卡种模块
router.use('/card-types', cardTypeRoutes);

// 会员卡模块
router.use('/', memberCardRoutes);

// 跟进记录模块
router.use('/follow-records', followRecordRoutes);
router.use('/', studentFollowRoutes);

// 试听线索模块
router.use('/leads', leadRoutes);

// 考勤、薪资模板、临时调课模块
router.use('/attendance', attendanceRoutes);

// 个人中心模块
router.use('/profile', profileRoutes);

// 反馈模块
router.use('/feedback', feedbackRoutes);

// 文件上传模块
router.use('/upload', uploadRoutes);
router.use('/upload', uploadTokenRoutes);

// 用户协议（公开）
router.get('/agreement', (_req, res) => {
  res.json({
    code: 200,
    data: {
      title: '好用消课用户协议',
      version: '1.0',
      content: '欢迎使用好用消课小程序。在使用本服务前，请仔细阅读以下条款：\n\n1. 服务说明：好用消课是一款面向教育培训机构的课时管理工具，提供学生管理、消课记录、排课、课时套餐等功能。\n\n2. 用户注册：用户需通过微信授权登录，并完善个人资料后方可使用完整功能。\n\n3. 数据安全：我们重视用户数据安全，采用加密存储和传输，不会向第三方泄露用户信息。\n\n4. 服务变更：我们保留随时修改服务内容和本协议的权利，修改后的协议将在应用内公示。\n\n5. 免责声明：因不可抗力导致的服务中断，我们不承担责任。\n\n6. 知识产权：本应用的所有内容（包括但不限于文字、图片、代码）均受知识产权法保护。\n\n如有疑问，请通过应用内反馈功能联系我们。',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    message: 'success',
  });
});

export default router;
