/**
 * 七牛云上传 Token 接口
 *
 * 前端通过此接口获取上传 Token，然后直接上传到七牛云
 * 架构：前端 -> 七牛云（而不是前端 -> 后端 -> 七牛云）
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { generateUploadToken, validateFileSize, validateFileType, extractKeyFromUrl } from '../config/qiniu-token';
import { success } from '../utils/response';
import env from '../config/env';

const router = Router();

// 允许的文件类型
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * 获取头像上传 Token
 * POST /upload/token/avatar
 */
router.post('/token/avatar', requireAuth, async (req, res, next) => {
  try {
    const response = generateUploadToken({
      maxSize: 5 * 1024 * 1024, // 头像限制 5MB
      mimeLimit: 'image/*',
      prefix: 'avatar/',
      expires: 1800, // 30 分钟
    });

    success(res, response, '获取上传 Token 成功');
  } catch (error) {
    next(error);
  }
});

/**
 * 获取场地图片上传 Token
 * POST /upload/token/venue
 */
router.post('/token/venue', requireAuth, async (req, res, next) => {
  try {
    const response = generateUploadToken({
      maxSize: 10 * 1024 * 1024, // 场地图片 10MB
      mimeLimit: 'image/*',
      prefix: 'venue/',
      expires: 3600,
    });

    success(res, response, '获取上传 Token 成功');
  } catch (error) {
    next(error);
  }
});

/**
 * 获取课件上传 Token
 * POST /upload/token/courseware
 */
router.post('/token/courseware', requireAuth, async (req, res, next) => {
  try {
    const response = generateUploadToken({
      maxSize: 50 * 1024 * 1024, // 课件限制 50MB
      mimeLimit: ['image/*', 'application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      prefix: 'courseware/',
      expires: 3600,
    });

    success(res, response, '获取上传 Token 成功');
  } catch (error) {
    next(error);
  }
});

/**
 * 通用上传 Token（需指定类型）
 * POST /upload/token
 * Body: { type: 'avatar' | 'venue' | 'courseware', size?: number, mimeType?: string }
 */
router.post('/token', requireAuth, async (req, res, next) => {
  try {
    const { type, size, mimeType } = req.body as {
      type?: string;
      size?: number;
      mimeType?: string;
    };

    // 根据类型设置配置
    const configMap: Record<string, { maxSize: number; mimeLimit: string[]; prefix: string }> = {
      avatar: {
        maxSize: 5 * 1024 * 1024,
        mimeLimit: ['image/jpeg', 'image/png', 'image/webp'],
        prefix: 'avatar/',
      },
      venue: {
        maxSize: 10 * 1024 * 1024,
        mimeLimit: ['image/jpeg', 'image/png', 'image/webp'],
        prefix: 'venue/',
      },
      courseware: {
        maxSize: 50 * 1024 * 1024,
        mimeLimit: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        prefix: 'courseware/',
      },
    };

    const config = configMap[type || 'avatar'] || configMap.avatar;

    // 如果传入了大小，进行校验
    if (size && !validateFileSize(size, config.maxSize)) {
      res.status(400).json({
        code: 400,
        data: null,
        message: `文件大小不能超过 ${config.maxSize / 1024 / 1024}MB`,
      });
      return;
    }

    // 如果传入了类型，进行校验
    if (mimeType && !validateFileType(mimeType, config.mimeLimit)) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '不支持的文件类型',
      });
      return;
    }

    const response = generateUploadToken({
      maxSize: config.maxSize,
      mimeLimit: config.mimeLimit.join(';'),
      prefix: config.prefix,
      expires: 3600,
    });

    success(res, response, '获取上传 Token 成功');
  } catch (error) {
    next(error);
  }
});

/**
 * 确认上传成功（可选，用于记录日志）
 * POST /upload/confirm
 * Body: { url: string, type: string }
 */
router.post('/confirm', requireAuth, async (req, res, next) => {
  try {
    const { url, type } = req.body as {
      url: string;
      type: string;
    };

    if (!url) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '缺少文件 URL',
      });
      return;
    }

    // 提取 key 用于可能的删除操作
    const key = extractKeyFromUrl(url);

    // 这里可以添加日志记录、数据库记录等逻辑
    // await uploadLogService.create({ url, type, userId: req.user.id, key });

    success(res, { key, url }, '上传确认成功');
  } catch (error) {
    next(error);
  }
});

/**
 * 获取上传配置（判断当前上传模式）
 * GET /upload/info
 */
router.get('/info', async (req, res, next) => {
  try {
    const qiniuEnabled = !!(env.QINIU_ACCESS_KEY && env.QINIU_SECRET_KEY && env.QINIU_BUCKET);

    success(res, {
      mode: qiniuEnabled ? 'qiniu' : 'local',
      maxSize: DEFAULT_MAX_SIZE,
      allowedTypes: ALLOWED_IMAGE_TYPES,
      qiniu: qiniuEnabled ? {
        domain: env.QINIU_CUSTOM_DOMAIN || `${env.QINIU_BUCKET}.${env.QINIU_DOMAIN || 'qiniudn.com'}`,
        bucket: env.QINIU_BUCKET,
        uploadUrl: 'https://upload.qiniu.com',
      } : null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
