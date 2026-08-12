/**
 * SSL 证书管理路由
 *
 * 提供以下接口：
 * GET  /ssl-cert/status    - 获取证书状态
 * POST /ssl-cert/renew     - 手动触发证书续期
 * POST /ssl-cert/sync      - 同步证书到七牛云
 */

import { Router, Request, Response } from 'express';
import { getCertStatus, forceRenewAndSync, syncToQiniuOnly } from '../config/ssl-cert';
import { env } from '../config/env';
import { requireAuth } from '../middleware/auth';

const router = Router();

/**
 * 获取 SSL 证书状态
 * GET /ssl-cert/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    // 仅管理员可查看
    const result = await getCertStatus();

    res.json({
      code: result.success ? 200 : 500,
      data: {
        enabled: env.SSL_ENABLED,
        domain: env.SSL_DOMAIN,
        ...result,
      },
      message: result.message,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      data: null,
      message: `获取证书状态失败: ${error.message}`,
    });
  }
});

/**
 * 手动触发证书续期并同步到七牛云
 * POST /ssl-cert/renew
 */
router.post('/renew', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await forceRenewAndSync();

    res.json({
      code: result.success ? 200 : 500,
      data: result,
      message: result.message,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      data: null,
      message: `证书续期失败: ${error.message}`,
    });
  }
});

/**
 * 仅同步证书到七牛云（不续期）
 * POST /ssl-cert/sync
 */
router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const result = await syncToQiniuOnly();

    res.json({
      code: result.success ? 200 : 500,
      data: result.result || null,
      message: result.message,
    });
  } catch (error: any) {
    res.status(500).json({
      code: 500,
      data: null,
      message: `同步失败: ${error.message}`,
    });
  }
});

export default router;
