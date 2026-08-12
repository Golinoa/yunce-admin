import { Router } from 'express';
import { requireAdminAuth } from '../middleware/adminAuth';
import { validate } from '../middleware/validate';
import * as adminController from './admin.controller';
import {
  batchDeleteActivationCodesSchema,
  batchCreateActivationCodesSchema,
  createActivitySchema,
  createBannerSchema,
  createMembershipPlanSchema,
  feedbackListQuerySchema,
  grantMembershipSchema,
  idParamSchema,
  inviteRuleParamSchema,
  inviteRuleSchema,
  loginSchema,
  pointAdjustSchema,
  updateFeedbackHandleSchema,
  updateActivitySchema,
  updateBannerSchema,
  updateMembershipPlanSchema,
} from './admin.validator';

const router = Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 管理员账号密码登录
 *     tags:
 *       - 后台认证
 *     security: []
 *     responses:
 *       200:
 *         description: 登录成功
 */
router.post('/auth/login', validate({ body: loginSchema }), adminController.login);

router.use(requireAdminAuth);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: 管理员退出登录
 *     tags:
 *       - 后台认证
 *     responses:
 *       200:
 *         description: 退出成功
 *
 * /auth/profile:
 *   get:
 *     summary: 获取当前管理员资料
 *     tags:
 *       - 后台认证
 *     responses:
 *       200:
 *         description: 返回管理员资料
 *
 * /auth/codes:
 *   get:
 *     summary: 获取后台权限码列表
 *     tags:
 *       - 后台认证
 *     responses:
 *       200:
 *         description: 返回权限码列表
 *
 * /user/info:
 *   get:
 *     summary: 获取后台用户信息
 *     tags:
 *       - 后台认证
 *     responses:
 *       200:
 *         description: 返回后台用户信息
 *
 * /menu/all:
 *   get:
 *     summary: 获取后台动态菜单
 *     tags:
 *       - 后台认证
 *     responses:
 *       200:
 *         description: 返回菜单树
 */
router.post('/auth/logout', adminController.logout);
router.get('/auth/profile', adminController.profile);
router.get('/auth/codes', adminController.accessCodes);
router.get('/user/info', adminController.userInfo);
router.get('/menu/all', adminController.menus);

/**
 * @swagger
 * /dashboard/overview:
 *   get:
 *     summary: 获取后台看板概览
 *     tags:
 *       - 后台看板
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 14
 *     responses:
 *       200:
 *         description: 返回看板概览
 *
 * /audit-logs:
 *   get:
 *     summary: 获取审计日志列表
 *     tags:
 *       - 审计日志
 *     responses:
 *       200:
 *         description: 返回审计日志分页数据
 *
 * /feedbacks:
 *   get:
 *     summary: 获取使用反馈列表
 *     tags:
 *       - 使用反馈
 *     responses:
 *       200:
 *         description: 返回反馈分页数据
 *
 * /feedbacks/{id}:
 *   get:
 *     summary: 获取使用反馈详情
 *     tags:
 *       - 使用反馈
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 返回反馈详情
 *
 * /feedbacks/{id}/handle:
 *   put:
 *     summary: 更新反馈处理状态
 *     tags:
 *       - 使用反馈
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.get('/dashboard/overview', adminController.dashboardOverview);
router.get('/audit-logs', adminController.listAuditLogs);
router.get('/feedbacks', validate({ query: feedbackListQuerySchema }), adminController.listFeedbacks);
router.get('/feedbacks/:id', validate({ params: idParamSchema }), adminController.getFeedbackDetail);
router.put(
  '/feedbacks/:id/handle',
  validate({ params: idParamSchema, body: updateFeedbackHandleSchema }),
  adminController.updateFeedbackHandle,
);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: 获取用户列表
 *     tags:
 *       - 用户管理
 *     responses:
 *       200:
 *         description: 返回用户分页数据
 *
 * /users/{id}:
 *   get:
 *     summary: 获取用户详情
 *     tags:
 *       - 用户管理
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 返回用户详情
 */
router.get('/users', adminController.listUsers);
router.get('/users/:id', validate({ params: idParamSchema }), adminController.getUserDetail);

/**
 * @swagger
 * /membership-plans:
 *   get:
 *     summary: 获取会员套餐列表
 *     tags:
 *       - 会员管理
 *     responses:
 *       200:
 *         description: 返回套餐列表
 *   post:
 *     summary: 创建会员套餐
 *     tags:
 *       - 会员管理
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /membership-plans/{id}:
 *   put:
 *     summary: 更新会员套餐
 *     tags:
 *       - 会员管理
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.get('/membership-plans', adminController.listMembershipPlans);
router.post(
  '/membership-plans',
  validate({ body: createMembershipPlanSchema }),
  adminController.createMembershipPlan,
);
router.put(
  '/membership-plans/:id',
  validate({ params: idParamSchema, body: updateMembershipPlanSchema }),
  adminController.updateMembershipPlan,
);

/**
 * @swagger
 * /activation-codes:
 *   get:
 *     summary: 获取激活码列表
 *     tags:
 *       - 激活码管理
 *     responses:
 *       200:
 *         description: 返回激活码分页数据
 *   delete:
 *     summary: 批量删除激活码
 *     tags:
 *       - 激活码管理
 *     responses:
 *       200:
 *         description: 删除成功
 *
 * /activation-codes/batch-create:
 *   post:
 *     summary: 批量生成激活码
 *     tags:
 *       - 激活码管理
 *     responses:
 *       200:
 *         description: 生成成功
 *
 * /activation-codes/{id}/void:
 *   post:
 *     summary: 作废激活码
 *     tags:
 *       - 激活码管理
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 作废成功
 */
router.get('/activation-codes', adminController.listActivationCodes);
router.post(
  '/activation-codes/batch-create',
  validate({ body: batchCreateActivationCodesSchema }),
  adminController.batchCreateActivationCodes,
);
router.delete(
  '/activation-codes',
  validate({ body: batchDeleteActivationCodesSchema }),
  adminController.batchDeleteActivationCodes,
);
router.post(
  '/activation-codes/:id/void',
  validate({ params: idParamSchema }),
  adminController.voidActivationCode,
);

/**
 * @swagger
 * /memberships:
 *   get:
 *     summary: 获取会员开通记录
 *     tags:
 *       - 会员管理
 *     responses:
 *       200:
 *         description: 返回会员开通分页数据
 *
 * /memberships/grant:
 *   post:
 *     summary: 给用户开通会员
 *     tags:
 *       - 会员管理
 *     responses:
 *       200:
 *         description: 开通成功
 */
router.get('/memberships', adminController.listMembershipGrants);
router.post(
  '/memberships/grant',
  validate({ body: grantMembershipSchema }),
  adminController.grantMembership,
);

/**
 * @swagger
 * /invites:
 *   get:
 *     summary: 获取邀请关系列表
 *     tags:
 *       - 邀请积分
 *     responses:
 *       200:
 *         description: 返回邀请关系分页数据
 *
 * /invite-rules:
 *   get:
 *     summary: 获取邀请规则列表
 *     tags:
 *       - 邀请积分
 *     responses:
 *       200:
 *         description: 返回邀请规则列表
 *
 * /invite-rules/{taskKey}:
 *   put:
 *     summary: 更新邀请规则
 *     tags:
 *       - 邀请积分
 *     parameters:
 *       - in: path
 *         name: taskKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *
 * /points/records:
 *   get:
 *     summary: 获取积分流水
 *     tags:
 *       - 邀请积分
 *     responses:
 *       200:
 *         description: 返回积分流水分页数据
 *
 * /points/adjust:
 *   post:
 *     summary: 手工调整积分
 *     tags:
 *       - 邀请积分
 *     responses:
 *       200:
 *         description: 调整成功
 */
router.get('/invites', adminController.listInvites);
router.get('/invite-rules', adminController.listInviteRules);
router.put(
  '/invite-rules/:taskKey',
  validate({ params: inviteRuleParamSchema, body: inviteRuleSchema }),
  adminController.upsertInviteRule,
);

router.get('/points/records', adminController.listPointRecords);
router.post(
  '/points/adjust',
  validate({ body: pointAdjustSchema }),
  adminController.adjustPoints,
);

/**
 * @swagger
 * /banners:
 *   get:
 *     summary: 获取轮播图列表
 *     tags:
 *       - 内容运营
 *     responses:
 *       200:
 *         description: 返回轮播图列表
 *   post:
 *     summary: 创建轮播图
 *     tags:
 *       - 内容运营
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /banners/{id}:
 *   put:
 *     summary: 更新轮播图
 *     tags:
 *       - 内容运营
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *
 * /content-templates:
 *   get:
 *     summary: 获取运营活动模板目录
 *     tags:
 *       - 内容运营
 *     responses:
 *       200:
 *         description: 返回模板、运营位和跳转动作枚举
 *
 * /activities:
 *   get:
 *     summary: 获取活动列表
 *     tags:
 *       - 内容运营
 *     responses:
 *       200:
 *         description: 返回活动列表
 *   post:
 *     summary: 创建活动
 *     tags:
 *       - 内容运营
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /activities/{id}:
 *   put:
 *     summary: 更新活动
 *     tags:
 *       - 内容运营
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.get('/content-templates', adminController.listContentTemplates);
router.get('/banners', adminController.listBanners);
router.post('/banners', validate({ body: createBannerSchema }), adminController.createBanner);
router.put(
  '/banners/:id',
  validate({ params: idParamSchema, body: updateBannerSchema }),
  adminController.updateBanner,
);
router.delete('/banners/:id', validate({ params: idParamSchema }), adminController.deleteBanner);

router.get('/activities', adminController.listActivities);
router.post('/activities', validate({ body: createActivitySchema }), adminController.createActivity);
router.put(
  '/activities/:id',
  validate({ params: idParamSchema, body: updateActivitySchema }),
  adminController.updateActivity,
);
router.delete('/activities/:id', validate({ params: idParamSchema }), adminController.deleteActivity);

export default router;
