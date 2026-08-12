import { Router } from 'express';
import * as cardTypeController from './card-type.controller';
import { validate } from '../middleware/validate';
import {
  memberCardListQuerySchema,
  memberCardStatsQuerySchema,
  issueMemberCardSchema,
  updateMemberCardSchema,
} from './card-type.validator';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// 学员相关会员卡路由
router.get(
  '/students/:studentId/member-cards',
  requireAuth,
  requireRole(['PRINCIPAL', 'TEACHER']),
  cardTypeController.getMemberCardsByStudent,
);

export default router;
