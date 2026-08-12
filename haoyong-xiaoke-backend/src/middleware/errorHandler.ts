import { Prisma } from '@prisma/client';
import { Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { ZodError } from 'zod';
import multer from 'multer';
import logger from '../utils/logger';
import env from '../config/env';
import { redact } from '../utils/redact';
import type { AuthRequest } from './auth';

export const errorHandler = (
  err: Error,
  req: AuthRequest,
  res: Response,
  _next: NextFunction,
) => {
  // 记录错误日志
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: redact(req.body),
    query: redact(req.query),
    user: redact(req.user),
  });

  // Zod 校验错误
  if (err instanceof ZodError) {
    const firstError = err.errors[0];
    return res.status(400).json({
      code: 400,
      data: null,
      message: `参数校验失败：${firstError.path.join('.')} ${firstError.message}`,
    });
  }

  // 自定义业务错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      code: err.code,
      data: null,
      message: err.message,
    });
  }

  // Prisma 错误处理
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // 唯一约束冲突
    if (err.code === 'P2002') {
      const field = Array.isArray(err.meta?.target)
        ? err.meta.target.map((item) => String(item)).join(', ')
        : undefined;
      return res.status(409).json({
        code: 409,
        data: null,
        message: `数据已存在：${field}`,
      });
    }

    // 外键约束失败
    if (err.code === 'P2003') {
      return res.status(422).json({
        code: 422,
        data: null,
        message: '关联数据不存在',
      });
    }

    // 记录未找到
    if (err.code === 'P2025') {
      return res.status(404).json({
        code: 404,
        data: null,
        message: '记录不存在',
      });
    }
  }

  // Multer 文件上传错误
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        code: 413,
        data: null,
        message: '文件大小超过限制',
      });
    }
    return res.status(400).json({
      code: 400,
      data: null,
      message: `上传错误：${err.message}`,
    });
  }

  // 未知错误
  return res.status(500).json({
    code: 500,
    data: null,
    message: env.NODE_ENV === 'production'
      ? '服务器内部错误'
      : err.message,
  });
};
