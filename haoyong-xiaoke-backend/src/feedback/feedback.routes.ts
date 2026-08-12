import { Router } from 'express';
import * as feedbackController from './feedback.controller';
import { validate } from '../middleware/validate';
import { createFeedbackSchema } from './feedback.validator';
import { requireAuth } from '../middleware/auth';

const router = Router();

// 提交反馈
router.post(
  '/',
  requireAuth,
  validate({ body: createFeedbackSchema }),
  feedbackController.create,
);

export default router;
