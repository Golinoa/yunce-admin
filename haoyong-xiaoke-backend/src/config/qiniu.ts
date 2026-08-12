/**
 * 七牛云对象存储服务
 *
 * 使用方法：
 * 1. 注册七牛云账号并完成实名认证
 * 2. 创建对象存储空间（存储桶）
 * 3. 获取 AccessKey 和 SecretKey
 * 4. 配置 .env 文件
 * 5. 可选：配置自定义域名
 */

import qiniu from 'qiniu';
import { createId } from '../utils/id';
import env from './env';

// 七牛云配置验证
const validateConfig = () => {
  if (!env.QINIU_ACCESS_KEY || !env.QINIU_SECRET_KEY || !env.QINIU_BUCKET) {
    throw new Error('七牛云配置不完整，请在 .env 中配置 QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_BUCKET');
  }
};

// 获取上传 Token
export const getUploadToken = (): string => {
  validateConfig();

  const mac = new qiniu.auth.digest.Mac(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY);
  const options = {
    scope: env.QINIU_BUCKET,
    expires: 3600,
  };
  const putPolicy = new qiniu.rs.PutPolicy(options);
  return putPolicy.uploadToken(mac);
};

// 存储区域映射
const zoneMap: Record<string, typeof qiniu.zone.Zone_z0> = {
  '0': qiniu.zone.Zone_z0,
  '1': qiniu.zone.Zone_z1,
  '2': qiniu.zone.Zone_z2,
  'na0': qiniu.zone.Zone_na0,
};

// 上传文件到七牛云
export const uploadToQiniu = async (
  buffer: Buffer,
  filename: string,
  mimeType: string = 'image/jpeg'
): Promise<{ key: string; url: string }> => {
  validateConfig();

  const mac = new qiniu.auth.digest.Mac(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY);
  const config = new qiniu.conf.Config();
  
  // 设置存储区域
  const region = env.QINIU_REGION || '0';
  if (zoneMap[region]) {
    config.zone = zoneMap[region];
  }

  const formUploader = new qiniu.form_up.FormUploader(config);
  const putExtra = new qiniu.form_up.PutExtra();
  putExtra.mimeType = mimeType;

  const key = `${env.QINIU_PREFIX || ''}${createId()}_${filename}`;

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formUploader.put(getUploadToken(), key, buffer, putExtra, (err: any, ret: any, info: any) => {
      if (err) {
        reject(err);
        return;
      }

      if (info.statusCode === 200 && ret && ret.key) {
        const url = getFileUrl(ret.key);
        resolve({ key: ret.key, url });
      } else {
        reject(new Error(`上传失败: ${info.statusCode}`));
      }
    });
  });
};

// 获取文件访问 URL
export const getFileUrl = (key: string): string => {
  if (env.QINIU_CUSTOM_DOMAIN) {
    return `https://${env.QINIU_CUSTOM_DOMAIN}/${key}`;
  }

  return `https://${env.QINIU_BUCKET}.${env.QINIU_DOMAIN || 'qiniudn.com'}/${key}`;
};

// 删除文件
export const deleteFromQiniu = async (key: string): Promise<boolean> => {
  validateConfig();

  const mac = new qiniu.auth.digest.Mac(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY);
  const bucketManager = new qiniu.rs.BucketManager(mac);
  const bucket = env.QINIU_BUCKET as string;

  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bucketManager.delete(bucket, key, (err: any, ret: any, info: any) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(info.statusCode === 200);
    });
  });
};

// 获取私有空间下载 Token
export const getDownloadToken = (key: string, expiresIn: number = 3600): string | null => {
  if (!env.QINIU_IS_PRIVATE) {
    return null;
  }

  validateConfig();

  const mac = new qiniu.auth.digest.Mac(env.QINIU_ACCESS_KEY, env.QINIU_SECRET_KEY);
  const deadline = Math.floor(Date.now() / 1000) + expiresIn;
  const baseUrl = getFileUrl(key);

  // 生成带签名的下载 URL
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (qiniu.auth as any).createDownloadUrl(baseUrl, mac, deadline);
};

// 生成缩略图 URL
export const getThumbnailUrl = (key: string, width: number = 200, height: number = 200): string => {
  const baseUrl = getFileUrl(key);
  return `${baseUrl}?imageView2/2/w/${width}/h/${height}`;
};

// 生成水印 URL
export const getWatermarkUrl = (
  key: string,
  watermarkText: string,
  dissolve: number = 50,
  gravity: string = 'SouthEast'
): string => {
  const baseUrl = getFileUrl(key);
  const encodedText = encodeURIComponent(watermarkText);
  return `${baseUrl}?watermark/2/text/${encodedText}/dissolve/${dissolve}/gravity/${gravity}`;
};
