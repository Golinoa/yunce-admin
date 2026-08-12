import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  SERVER_PUBLIC_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, '数据库连接字符串不能为空'),
  JWT_SECRET: z.string().min(32, 'JWT 密钥至少 32 位'),
  JWT_EXPIRES_IN: z.string().default('2h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  ADMIN_INIT_USERNAME: z.string().default('admin'),
  ADMIN_INIT_PASSWORD: z.string().min(6, '后台默认密码至少 6 位').default('Admin123456'),
  ENABLE_API_DOCS: z.string().default('true').transform((value) => value === 'true'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('5242880').transform(Number),
  ALLOWED_IMAGE_TYPES: z.string().default('image/jpeg,image/png,image/webp'),
  CORS_ORIGINS: z.string()
    .default('http://localhost:10086,http://localhost:3000')
    .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean)),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  WECHAT_APP_ID: z.string().optional(),
  WECHAT_APP_SECRET: z.string().optional(),

  // SSL 证书配置
  SSL_ENABLED: z.string().default('true').transform(v => v === 'true'),
  SSL_CERT_PATH: z.string().default('/etc/nginx/ssl'),
  SSL_DOMAIN: z.string().default('api.youche.com'),

  // 七牛云配置
  QINIU_ACCESS_KEY: z.string().optional(),
  QINIU_SECRET_KEY: z.string().optional(),
  QINIU_BUCKET: z.string().optional(),
  QINIU_REGION: z.string().default('0'), // 0=华东, 1=华北, 2=华南
  QINIU_DOMAIN: z.string().optional(), // 七牛云默认域名
  QINIU_CUSTOM_DOMAIN: z.string().optional(), // 自定义域名（CDN）
  QINIU_PREFIX: z.string().optional(), // 文件路径前缀
  QINIU_IS_PRIVATE: z.string().default('false').transform(v => v === 'true'), // 是否私有空间
  QINIU_SSL_CERT_BUCKET: z.string().optional(), // 用于存放 SSL 证书的七牛云 Bucket
});

export type EnvConfig = z.infer<typeof envSchema>;

let cachedEnv: EnvConfig | null = null;

export const getEnv = (): EnvConfig => {
  if (!cachedEnv) {
    cachedEnv = envSchema.parse(process.env);
  }

  return cachedEnv;
};

export const resetEnvCache = (): void => {
  cachedEnv = null;
};

const env = new Proxy({} as EnvConfig, {
  get: (_target, prop: keyof EnvConfig) => getEnv()[prop],
  ownKeys: () => Reflect.ownKeys(getEnv()),
  getOwnPropertyDescriptor: (_target, prop: keyof EnvConfig) => ({
    configurable: true,
    enumerable: true,
    value: getEnv()[prop],
  }),
});

export { env };

export default env;
