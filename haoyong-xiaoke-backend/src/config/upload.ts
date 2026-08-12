import multer from 'multer';
import path from 'path';
import { BadRequestError } from '../utils/errors';
import fs from 'fs';
import env from './env';
import { createId } from '../utils/id';

// 允许的上传类型白名单
const ALLOWED_TYPES = new Set(['avatar', 'student', 'lesson', 'other']);

export const resolveUploadType = (rawType: unknown): string => {
  const type = typeof rawType === 'string' && rawType.trim() ? rawType.trim() : 'avatar';

  if (!ALLOWED_TYPES.has(type)) {
    throw new BadRequestError('非法的上传类型');
  }

  return type;
};

export const resolveUploadDestination = (
  rawType: unknown,
  uploadRoot: string = env.UPLOAD_DIR,
): string => {
  const type = resolveUploadType(rawType);
  const rootDir = path.resolve(uploadRoot);
  const destination = path.resolve(rootDir, type);
  const relativePath = path.relative(rootDir, destination);

  // 使用 relative 而不是 startsWith，避免前缀相似目录造成误判
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new BadRequestError('非法的上传类型');
  }

  return destination;
};

export const resolveUploadPublicUrl = (
  filePath: string,
  uploadRoot: string = env.UPLOAD_DIR,
): string => {
  const rootDir = path.resolve(uploadRoot);
  const absoluteFilePath = path.resolve(filePath);
  const relativePath = path.relative(rootDir, absoluteFilePath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new BadRequestError('非法的上传文件路径');
  }

  return `/uploads/${relativePath.split(path.sep).join('/')}`;
};

export const persistUploadedFileAsync = async (
  file: Express.Multer.File,
  rawType: unknown,
  uploadRoot: string = env.UPLOAD_DIR,
): Promise<{ filePath: string; filename: string }> => {
  const dir = resolveUploadDestination(rawType, uploadRoot);

  if (!file.buffer) {
    throw new BadRequestError('上传文件内容不能为空');
  }

  await fs.promises.mkdir(dir, { recursive: true });

  const ext = path.extname(file.originalname);
  const filename = `${createId()}${ext}`;
  const filePath = path.join(dir, filename);

  await fs.promises.writeFile(filePath, file.buffer);

  return { filePath, filename };
};

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = env.ALLOWED_IMAGE_TYPES.split(',');
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new BadRequestError(`不支持的文件类型：${file.mimetype}`));
  }
};

export const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: env.MAX_FILE_SIZE,
  },
});

export default upload;
