import { Router } from 'express';
import { persistUploadedFileAsync, resolveUploadPublicUrl, upload } from '../config/upload';
import { requireAuth } from '../middleware/auth';
import { uploadRateLimit } from '../middleware/rate-limit';
import { success } from '../utils/response';
import {
  getQiniuToken,
  uploadLocal,
  uploadToCloud,
  uploadMultipleLocal,
  uploadMultipleCloud,
  getUploadConfig,
} from './upload-cloud.controller';

const router = Router();

// 单文件上传（头像/图片）
router.post(
  '/image',
  requireAuth,
  uploadRateLimit,
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          code: 400,
          data: null,
          message: '未上传文件',
        });
      }

      const rawType = typeof req.query.type === 'string' ? req.query.type : req.body.type;
      const { filePath, filename } = await persistUploadedFileAsync(req.file, rawType);
      const url = resolveUploadPublicUrl(filePath);

      success(res, { url, filename }, '上传成功');
    } catch (error) {
      next(error);
    }
  },
);

// 多文件上传（最多 9 张）
router.post(
  '/images',
  requireAuth,
  uploadRateLimit,
  upload.array('files', 9),
  async (req, res, next) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
        code: 400,
        data: null,
        message: '未上传文件',
      });
      }

      const rawType = typeof req.query.type === 'string' ? req.query.type : req.body.type;
      const persistedFiles = await Promise.all(
        (req.files as Express.Multer.File[]).map(async (file) => {
          const { filePath, filename } = await persistUploadedFileAsync(file, rawType);
          return {
            url: resolveUploadPublicUrl(filePath),
            filename,
          };
        }),
      );

      success(res, { files: persistedFiles, count: persistedFiles.length }, '上传成功');
    } catch (error) {
      next(error);
    }
  },
);

// ==================== 七牛云上传接口 ====================

// 获取上传配置信息
router.get('/config', getUploadConfig);

// 获取七牛云上传 Token
router.get('/qiniu/token', requireAuth, getQiniuToken);

// 单文件上传到七牛云（后端代理模式）
router.post('/qiniu/upload', requireAuth, uploadRateLimit, uploadToCloud);

// 多文件上传到七牛云
router.post('/qiniu/uploads', requireAuth, uploadRateLimit, uploadMultipleCloud);

// 本地上传（显式调用）
router.post('/local', requireAuth, uploadRateLimit, uploadLocal);

// 本地多文件上传
router.post('/local/images', requireAuth, uploadRateLimit, uploadMultipleLocal);

export default router;
