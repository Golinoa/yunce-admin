/**
 * SSL 证书自动管理模块
 *
 * 功能：
 * 1. 监控本地 SSL 证书状态
 * 2. 证书即将过期时自动触发续期
 * 3. 将新证书同步上传到七牛云
 * 4. 提供证书状态查询接口
 *
 * 使用场景：
 * - 七牛云自定义域名需要 HTTPS
 * - 使用 Let's Encrypt 免费证书
 * - 通过 acme.sh 自动管理证书
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { env } from './env';
import { logger } from '../utils/logger';

// 七牛云 SDK
let qiniuSDK: any = null;
try {
  const qiniu = require('qiniu');
  qiniuSDK = qiniu;
} catch (e) {
  logger.warn('七牛云 SDK 未安装，跳过七牛云证书同步功能');
}

interface CertInfo {
  domain: string;
  certPath: string;
  keyPath: string;
  expiresAt: Date;
  daysRemaining: number;
  isValid: boolean;
}

interface CertSyncResult {
  success: boolean;
  message: string;
  certInfo?: CertInfo;
  qiniuUploadResult?: any;
}

/**
 * 获取本地 SSL 证书信息
 */
function getLocalCertInfo(): CertInfo | null {
  const { SSL_CERT_PATH, SSL_DOMAIN } = env;

  const certPath = path.join(SSL_CERT_PATH, `${SSL_DOMAIN}.crt`);
  const keyPath = path.join(SSL_CERT_PATH, `${SSL_DOMAIN}.key`);

  // 检查证书文件是否存在
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    logger.warn(`SSL 证书文件不存在: ${certPath}`);
    return null;
  }

  // 读取证书过期时间
  let expiresAt: Date | null = null;
  let daysRemaining = 0;

  try {
    // 使用 openssl 解析证书获取过期时间
    const certContent = fs.readFileSync(certPath, 'utf-8');
    const expiresMatch = certContent.match(/notAfter=(.+)/m);

    if (!expiresMatch) {
      // 尝试另一种方式
      const result = execSync(
        `openssl x509 -in "${certPath}" -noout -enddate 2>/dev/null || echo ""`,
        { encoding: 'utf-8' }
      );

      const enddateMatch = result.match(/notAfter=(.+)/);
      if (enddateMatch) {
        expiresAt = new Date(enddateMatch[1].trim());
      }
    } else {
      expiresAt = new Date(expiresMatch[1].trim());
    }

    if (expiresAt) {
      const now = new Date();
      daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
  } catch (error) {
    logger.error('解析 SSL 证书过期时间失败', error);
    return null;
  }

  const isValid = daysRemaining > 0;

  return {
    domain: SSL_DOMAIN,
    certPath,
    keyPath,
    expiresAt: expiresAt || new Date(),
    daysRemaining,
    isValid,
  };
}

/**
 * 强制续期 SSL 证书（调用 acme.sh）
 */
function renewCertificate(): { success: boolean; message: string } {
  try {
    logger.info('开始续期 SSL 证书...');

    // 执行 acme.sh 续期命令
    const result = execSync(
      `acme.sh --renew -d ${env.SSL_DOMAIN} --force`,
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    logger.info('SSL 证书续期成功', { output: result });

    // 重新加载 Nginx
    try {
      execSync('sudo systemctl reload nginx', { encoding: 'utf-8' });
      logger.info('Nginx 已重新加载');
    } catch (nginxError) {
      logger.warn('Nginx 重载失败，请手动检查', nginxError);
    }

    return { success: true, message: '证书续期成功' };
  } catch (error: any) {
    const errorMessage = error.stdout || error.message || '未知错误';
    logger.error('SSL 证书续期失败', { error: errorMessage });
    return { success: false, message: `续期失败: ${errorMessage}` };
  }
}

/**
 * 上传证书到七牛云
 */
async function uploadCertToQiniu(certInfo: CertInfo): Promise<{ success: boolean; message: string; result?: any }> {
  const { QINIU_ACCESS_KEY, QINIU_SECRET_KEY, QINIU_SSL_CERT_BUCKET } = env;

  if (!QINIU_ACCESS_KEY || !QINIU_SECRET_KEY || !QINIU_SSL_CERT_BUCKET) {
    return { success: false, message: '七牛云配置不完整，跳过上传' };
  }

  if (!qiniuSDK) {
    return { success: false, message: '七牛云 SDK 未安装' };
  }

  try {
    // 生成上传 Token
    const mac = new qiniuSDK.auth.digest.Mac(QINIU_ACCESS_KEY, QINIU_SECRET_KEY);
    const putPolicy = new qiniuSDK.rs.PutPolicy({
      scope: QINIU_SSL_CERT_BUCKET,
    });
    const uploadToken = putPolicy.uploadToken(mac);

    // 读取证书文件
    const certContent = fs.readFileSync(certInfo.certPath);
    const keyContent = fs.readFileSync(certInfo.keyPath);

    // 上传证书和私钥
    const certKey = `ssl/${certInfo.domain}/certificate.crt`;
    const keyKey = `ssl/${certInfo.domain}/private.key`;

    const config = new qiniuSDK.conf.Config();
    // 区域配置（根据实际情况选择）
    // config.zone = qiniuSDK.zone.Zone_z0;
    // config.zone = qiniuSDK.zone.Zone_z1;
    // config.zone = qiniuSDK.zone.Zone_z2;

    const formUploader = new qiniuSDK.formup.FormUploader(config);

    // 上传证书
    const certResult = await new Promise<any>((resolve, reject) => {
      formUploader.put(uploadToken, certKey, certContent, null, (err: any, ret: any) => {
        if (err) reject(err);
        else resolve(ret);
      });
    });

    // 上传私钥
    const keyResult = await new Promise<any>((resolve, reject) => {
      formUploader.put(uploadToken, keyKey, keyContent, null, (err: any, ret: any) => {
        if (err) reject(err);
        else resolve(ret);
      });
    });

    logger.info('SSL 证书已上传到七牛云', {
      certKey,
      keyKey,
      certResult,
      keyResult,
    });

    return {
      success: true,
      message: '证书已上传到七牛云',
      result: { certKey, keyKey, certResult, keyResult },
    };
  } catch (error: any) {
    logger.error('上传证书到七牛云失败', error);
    return { success: false, message: `上传失败: ${error.message}` };
  }
}

/**
 * 同步证书到七牛云（读取本地证书后上传）
 */
async function syncCertToQiniu(): Promise<{ success: boolean; message: string; result?: any }> {
  const certInfo = getLocalCertInfo();

  if (!certInfo) {
    return { success: false, message: '本地证书不存在' };
  }

  return uploadCertToQiniu(certInfo);
}

/**
 * 自动检查并续期证书
 * 建议通过 cron 任务定期执行（如每天凌晨检查）
 */
async function autoCheckAndRenew(): Promise<CertSyncResult> {
  const certInfo = getLocalCertInfo();

  if (!certInfo) {
    return {
      success: false,
      message: '本地证书不存在，请先通过 acme.sh 申请证书',
    };
  }

  // 证书已过期或剩余天数少于 30 天，触发续期
  if (certInfo.daysRemaining <= 30) {
    logger.warn(`SSL 证书即将过期，剩余 ${certInfo.daysRemaining} 天，开始续期...`);

    const renewResult = renewCertificate();
    if (!renewResult.success) {
      return {
        success: false,
        message: renewResult.message,
        certInfo,
      };
    }

    // 重新获取证书信息
    const newCertInfo = getLocalCertInfo();

    // 同步到七牛云
    const qiniuResult = await syncCertToQiniu();

    return {
      success: true,
      message: `证书已续期，剩余 ${newCertInfo?.daysRemaining || 0} 天${qiniuResult.success ? '，已同步到七牛云' : ''}`,
      certInfo: newCertInfo || undefined,
      qiniuUploadResult: qiniuResult.result,
    };
  }

  // 证书有效，返回状态
  return {
    success: true,
    message: `证书状态正常，剩余 ${certInfo.daysRemaining} 天`,
    certInfo,
  };
}

/**
 * 获取证书状态（供外部调用）
 */
export async function getCertStatus(): Promise<CertSyncResult> {
  return autoCheckAndRenew();
}

/**
 * 手动触发证书续期并同步（供 API 调用）
 */
export async function forceRenewAndSync(): Promise<CertSyncResult> {
  // 1. 续期证书
  const renewResult = renewCertificate();
  if (!renewResult.success) {
    return {
      success: false,
      message: renewResult.message,
    };
  }

  // 2. 获取新证书信息
  const certInfo = getLocalCertInfo();

  // 3. 同步到七牛云
  const qiniuResult = await syncCertToQiniu();

  return {
    success: true,
    message: `证书已续期并${qiniuResult.success ? '同步到七牛云' : '保存到本地'}`,
    certInfo: certInfo || undefined,
    qiniuUploadResult: qiniuResult.result,
  };
}

/**
 * 仅同步本地证书到七牛云
 */
export async function syncToQiniuOnly(): Promise<{ success: boolean; message: string; result?: any }> {
  return syncCertToQiniu();
}

// 启动时自动检查（仅在生产环境）
if (env.NODE_ENV === 'production' && env.SSL_ENABLED) {
  // 延迟 30 秒启动，让服务先完全启动
  setTimeout(() => {
    logger.info('启动 SSL 证书自动检查...');
    autoCheckAndRenew()
      .then((result) => {
        if (result.success) {
          logger.info('SSL 证书检查完成', result.message);
        } else {
          logger.warn('SSL 证书检查异常', result.message);
        }
      })
      .catch((error) => {
        logger.error('SSL 证书检查失败', error);
      });
  }, 30000);

  // 每 12 小时自动检查一次
  setInterval(() => {
    autoCheckAndRenew()
      .then((result) => {
        if (!result.success || (result.certInfo && result.certInfo.daysRemaining <= 7)) {
          logger.warn('SSL 证书状态', result.message);
        }
      })
      .catch((error) => {
        logger.error('SSL 证书自动检查失败', error);
      });
  }, 12 * 60 * 60 * 1000); // 12 小时
}

export default {
  getCertStatus,
  forceRenewAndSync,
  syncToQiniuOnly,
  getLocalCertInfo,
};
