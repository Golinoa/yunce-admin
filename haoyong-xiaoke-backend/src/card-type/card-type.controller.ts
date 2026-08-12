import { Response, NextFunction } from 'express';
import * as cardTypeService from './card-type.service';
import { success, created, paginated } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
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

// ==================== CardType (卡种) ====================

// 卡种列表
export const listCardTypes = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = cardTypeListQuerySchema.parse(req.query);
    const result = await cardTypeService.listCardTypes(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 卡种详情
export const getCardTypeDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await cardTypeService.getCardTypeDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 创建卡种
export const createCardType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = createCardTypeSchema.parse(req.body);
    const result = await cardTypeService.createCardType(input);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新卡种
export const updateCardType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateCardTypeSchema.parse(req.body);
    const result = await cardTypeService.updateCardType(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 切换卡种状态
export const toggleCardTypeStatus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = toggleCardTypeStatusSchema.parse(req.body);
    const result = await cardTypeService.toggleCardTypeStatus(req.params.id, input.status);
    success(res, result, '状态更新成功');
  } catch (error) {
    next(error);
  }
};

// 删除卡种
export const deleteCardType = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await cardTypeService.deleteCardType(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};

// ==================== MemberCard (会员卡) ====================

// 会员卡列表
export const listMemberCards = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = memberCardListQuerySchema.parse(req.query);
    const result = await cardTypeService.listMemberCards(query);
    paginated(res, result.list, result.pagination);
  } catch (error) {
    next(error);
  }
};

// 根据卡种和统计维度获取会员卡列表
export const getMemberCardsByCardTypeAndStat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const query = memberCardStatsQuerySchema.parse({
      ...req.query,
      cardTypeId: req.params.cardTypeId,
    });
    const result = await cardTypeService.getMemberCardsByCardTypeAndStat(query);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 根据学员获取会员卡列表
export const getMemberCardsByStudent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await cardTypeService.getMemberCardsByStudent(req.params.studentId);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 会员卡详情
export const getMemberCardDetail = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await cardTypeService.getMemberCardDetail(req.params.id);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

// 发放会员卡
export const issueMemberCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = issueMemberCardSchema.parse(req.body);
    const result = await cardTypeService.issueMemberCard(input, req.user?.id);
    created(res, result);
  } catch (error) {
    next(error);
  }
};

// 更新会员卡
export const updateMemberCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = updateMemberCardSchema.parse(req.body);
    const result = await cardTypeService.updateMemberCard(req.params.id, input);
    success(res, result, '更新成功');
  } catch (error) {
    next(error);
  }
};

// 冻卡
export const freezeMemberCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await cardTypeService.freezeMemberCard(req.params.id, true);
    success(res, result, '冻卡成功');
  } catch (error) {
    next(error);
  }
};

// 解冻
export const unfreezeMemberCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const result = await cardTypeService.freezeMemberCard(req.params.id, false);
    success(res, result, '解冻成功');
  } catch (error) {
    next(error);
  }
};

// 删除会员卡
export const deleteMemberCard = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await cardTypeService.deleteMemberCard(req.params.id);
    success(res, null, '删除成功');
  } catch (error) {
    next(error);
  }
};
