import { Router } from 'express';
import * as cardTypeController from './card-type.controller';
import { validate } from '../middleware/validate';
import {
  cardTypeListQuerySchema,
  createCardTypeSchema,
  updateCardTypeSchema,
  toggleCardTypeStatusSchema,
  memberCardListQuerySchema,
  issueMemberCardSchema,
  updateMemberCardSchema,
  memberCardStatsQuerySchema,
} from './card-type.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// ==================== CardType (卡种) ====================

// 卡种列表
router.get(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: cardTypeListQuerySchema }),
  cardTypeController.listCardTypes,
);

// 卡种详情
router.get(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  cardTypeController.getCardTypeDetail,
);

// 创建卡种
router.post(
  '/',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: createCardTypeSchema }),
  cardTypeController.createCardType,
);

// 更新卡种
router.put(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: updateCardTypeSchema }),
  cardTypeController.updateCardType,
);

// 切换卡种状态
router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['PRINCIPAL']),
  validate({ body: toggleCardTypeStatusSchema }),
  cardTypeController.toggleCardTypeStatus,
);

// 删除卡种
router.delete(
  '/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  cardTypeController.deleteCardType,
);

// ==================== MemberCard (会员卡) ====================

// 会员卡列表
router.get(
  '/member-cards/list',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: memberCardListQuerySchema }),
  cardTypeController.listMemberCards,
);

// 根据卡种ID与统计维度获取会员卡列表
router.get(
  '/:cardTypeId/member-cards',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ query: memberCardStatsQuerySchema }),
  cardTypeController.getMemberCardsByCardTypeAndStat,
);

// 会员卡详情
router.get(
  '/member-cards/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  cardTypeController.getMemberCardDetail,
);

// 发放会员卡
router.post(
  '/member-cards',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: issueMemberCardSchema }),
  cardTypeController.issueMemberCard,
);

// 更新会员卡
router.put(
  '/member-cards/:id',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  validate({ body: updateMemberCardSchema }),
  cardTypeController.updateMemberCard,
);

// 冻卡
router.post(
  '/member-cards/:id/freeze',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  cardTypeController.freezeMemberCard,
);

// 解冻
router.post(
  '/member-cards/:id/unfreeze',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  cardTypeController.unfreezeMemberCard,
);

// 删除会员卡
router.delete(
  '/member-cards/:id',
  requireAuth,
  requireRole(['PRINCIPAL']),
  cardTypeController.deleteMemberCard,
);

export default router;
