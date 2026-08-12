/**
 * 七牛云直传 Token 服务
 *
 * 提供安全的 Token 生成，避免暴露 SecretKey
 * 前端获取 Token 后直接上传到七牛云
 */

import qiniu from 'qiniu';
import env from './env';

export interface UploadTokenOptions {
  // 文件大小限制（字节），默认 10MB
  maxSize?: number;
  // 文件类型限制，可以是单个字符串或数组
  mimeLimit?: string | string[];
  // 上传路径前缀，如 "avatar/"、"venue/"
  prefix?: string;
  // Token 有效期（秒），默认 3600
  expires?: number;
}

export interface UploadTokenResponse {
  token: string;
  // 实际可用的上传地址
  uploadUrl: string;
  // 文件访问域名
  domain: string;
  // 存储桶
  bucket: string;
  // 存储路径前缀
  prefix: string;
}

/**
 * 生成上传 Token
 */
export const generateUploadToken = (options: UploadTokenOptions = {}): UploadTokenResponse => {
  const {
    expires = 3600,
  } = options;

  // 如果未配置七牛云，抛出错误
  if (!env.QINIU_ACCESS_KEY || !env.QINIU_SECRET_KEY || !env.QINIU_BUCKET) {
    throw new Error('七牛云未配置');
  }

  const mac = new qiniu.auth.digest.Mac(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY);
  
  // 构建上传策略
  const putPolicy: qiniu.rs.PutPolicyOptions = {
    scope: env.QINIU_BUCKET,
    expires,
  };

  // 如果需要限制文件大小
  if (options.maxSize) {
    putPolicy.fsizeLimit = options.maxSize;
  }

  // 如果需要限制文件类型（多个类型用分号分隔）
  if (options.mimeLimit) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (putPolicy as any).mimeLimit = options.mimeLimit;
  }

  const policy = new qiniu.rs.PutPolicy(putPolicy);
  const token = policy.uploadToken(mac);

  return {
    token,
    // 七牛云公共上传节点
    uploadUrl: 'https://upload.qiniu.com',
    // 文件访问域名
    domain: env.QINIU_CUSTOM_DOMAIN 
      ? `https://${env.QINIU_CUSTOM_DOMAIN}` 
      : `https://${env.QINIU_BUCKET}.${env.QINIU_DOMAIN || 'qiniudn.com'}`,
    bucket: env.QINIU_BUCKET,
    prefix: env.QINIU_PREFIX || '',
  };
};

/**
 * 验证文件大小
 */
export const validateFileSize = (size: number, maxSize: number = 10 * 1024 * 1024): boolean => {
  return size <= maxSize;
};

/**
 * 验证文件类型
 */
export const validateFileType = (mimeType: string, allowedTypes: string[]): boolean => {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const category = type.split('/')[0];
      return mimeType.startsWith(category + '/');
    }
    return mimeType === type;
  });
};

/**
 * 从七牛云 URL 提取 key
 */
export const extractKeyFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    // 尝试从路径中提取 key
    let key = urlObj.pathname.slice(1); // 去掉开头的 /
    
    // 如果有前缀配置，需要去掉
    if (env.QINIU_PREFIX && key.startsWith(env.QINIU_PREFIX)) {
      key = key.slice(env.QINIU_PREFIX.length);
    }
    
    return key;
  } catch {
    return null;
  }
};
