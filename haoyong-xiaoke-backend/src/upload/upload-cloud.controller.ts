/**
 * 文件上传控制器
 *
 * 支持两种模式：
 * 1. 本地上传（默认）：文件保存在服务器的 UPLOAD_DIR 目录
 * 2. 七牛云上传：配置七牛云后自动切换
 */

import { Response, NextFunction } from 'express';
import { success, created } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { upload } from '../config/upload';
import { persistUploadedFileAsync, resolveUploadPublicUrl } from '../config/upload';
import { uploadToQiniu, getUploadToken } from '../config/qiniu';
import env from '../config/env';
import path from 'path';

// 判断是否启用七牛云
const isQiniuEnabled = (): boolean => {
  return !!(env.QINIU_ACCESS_KEY && env.QINIU_SECRET_KEY && env.QINIU_BUCKET);
};

// 获取上传 Token（七牛云直传模式）
export const getQiniuToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isQiniuEnabled()) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '未配置七牛云，请使用本地上传',
      });
      return;
    }

    const token = getUploadToken();
    success(res, {
      token,
      domain: env.QINIU_CUSTOM_DOMAIN || `${env.QINIU_BUCKET}.${env.QINIU_DOMAIN || 'qiniudn.com'}`,
      bucket: env.QINIU_BUCKET,
      prefix: env.QINIU_PREFIX || '',
    });
  } catch (error) {
    next(error);
  }
};

// 上传到本地服务器
export const uploadLocal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await new Promise<void>((resolve, reject) => {
      const uploadHandler = upload.single('file');

      uploadHandler(req, res, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    if (!req.file) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '请选择要上传的文件',
      });
      return;
    }

    const { filePath } = await persistUploadedFileAsync(req.file, req.body.type);
    const publicUrl = resolveUploadPublicUrl(filePath);

    created(res, {
      url: publicUrl,
      filename: path.basename(filePath),
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
};

// 上传到七牛云（后端代理模式）
export const uploadToCloud = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isQiniuEnabled()) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '未配置七牛云',
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const uploadHandler = upload.single('file');

      uploadHandler(req, res, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    if (!req.file) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '请选择要上传的文件',
      });
      return;
    }

    const { url } = await uploadToQiniu(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    created(res, {
      url,
      filename: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error) {
    next(error);
  }
};

// 多文件上传到本地
export const uploadMultipleLocal = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await new Promise<void>((resolve, reject) => {
      const uploadHandler = upload.array('files', 10);

      uploadHandler(req, res, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '请选择要上传的文件',
      });
      return;
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const { filePath } = await persistUploadedFileAsync(file, req.body.type);
        const publicUrl = resolveUploadPublicUrl(filePath);
        return {
          url: publicUrl,
          filename: path.basename(filePath),
          size: file.size,
          mimetype: file.mimetype,
        };
      })
    );

    created(res, { files: results });
  } catch (error) {
    next(error);
  }
};

// 多文件上传到七牛云
export const uploadMultipleCloud = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!isQiniuEnabled()) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '未配置七牛云',
      });
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const uploadHandler = upload.array('files', 10);

      uploadHandler(req, res, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });

    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        code: 400,
        data: null,
        message: '请选择要上传的文件',
      });
      return;
    }

    const results = await Promise.all(
      req.files.map(async (file) => {
        const { url } = await uploadToQiniu(file.buffer, file.originalname, file.mimetype);
        return {
          url,
          filename: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        };
      })
    );

    created(res, { files: results });
  } catch (error) {
    next(error);
  }
};

// 获取上传配置信息
export const getUploadConfig = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const qiniuEnabled = isQiniuEnabled();

    success(res, {
      mode: qiniuEnabled ? 'qiniu' : 'local',
      qiniu: qiniuEnabled
        ? {
            domain: env.QINIU_CUSTOM_DOMAIN || `${env.QINIU_BUCKET}.${env.QINIU_DOMAIN || 'qiniudn.com'}`,
            bucket: env.QINIU_BUCKET,
            needToken: true, // 前端直传需要获取 token
          }
        : null,
      local: {
        maxSize: env.MAX_FILE_SIZE,
        allowedTypes: env.ALLOWED_IMAGE_TYPES.split(','),
      },
    });
  } catch (error) {
    next(error);
  }
};
