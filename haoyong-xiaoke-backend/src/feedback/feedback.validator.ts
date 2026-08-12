import { z } from 'zod';

export const createFeedbackSchema = z.object({
  type: z.enum(['BUG', 'FEATURE', 'OTHER'], { required_error: '请选择反馈类型' }),
  content: z.string().min(1, '反馈内容不能为空').max(2000, '反馈内容不能超过 2000 字符'),
  images: z.array(z.string().trim().url('图片地址格式不正确')).max(3, '最多上传 3 张图片').optional().default([]),
  contact: z.string().max(100, '联系方式不能超过 100 字符').optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
