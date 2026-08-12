import { z } from 'zod';

// 创建校区
export const createCampusSchema = z.object({
  name: z.string().min(1, '校区名称不能为空').max(50, '校区名称不能超过 50 字符'),
  type: z.enum(['self', 'partner']).default('self'),
  partnerMode: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  icon: z.string().default('🏫'),
  iconGradient: z.string().default('from-blue-400 to-blue-600'),
  isMain: z.boolean().default(false),
  monthlyRent: z.number().int().min(0).default(0),
  rentDueDay: z.number().int().min(1).max(28).default(1),
});

// 更新校区
export const updateCampusSchema = z.object({
  name: z.string().min(1, '校区名称不能为空').max(50, '校区名称不能超过 50 字符').optional(),
  type: z.enum(['self', 'partner']).optional(),
  partnerMode: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  icon: z.string().optional(),
  iconGradient: z.string().optional(),
  isMain: z.boolean().optional(),
  monthlyRent: z.number().int().min(0).optional(),
  rentDueDay: z.number().int().min(1).max(28).optional(),
});

// 校区列表查询
export const campusListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().optional(),
  type: z.enum(['self', 'partner']).optional(),
});

export type CreateCampusInput = z.infer<typeof createCampusSchema>;
export type UpdateCampusInput = z.infer<typeof updateCampusSchema>;
export type CampusListQuery = z.infer<typeof campusListQuerySchema>;
