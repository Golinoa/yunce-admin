/**
 * 将 Docker/CI 注入的 VITE_APP_STORE_SECURE_KEY（及可选版本号）
 * 写回 apps/web-antd/.env.production，避免 Vite 只读到仓库占位值。
 *
 * 背景：turbo 默认不透传任意 env；即便透传，双保险写入 .env.production
 * 可保证 import.meta.env 打进真实密钥。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../apps/web-antd/.env.production');

const PLACEHOLDERS = new Set([
  '',
  'please-replace-me-with-your-own-key',
]);

const key = String(process.env.VITE_APP_STORE_SECURE_KEY ?? '').trim();
if (PLACEHOLDERS.has(key) || key.length < 16) {
  console.error(
    '[inject-env-production] FAIL: VITE_APP_STORE_SECURE_KEY 无效（空/占位/过短）',
  );
  process.exit(1);
}

if (!fs.existsSync(envPath)) {
  console.error('[inject-env-production] FAIL missing', envPath);
  process.exit(1);
}

let text = fs.readFileSync(envPath, 'utf8');
if (!/^VITE_APP_STORE_SECURE_KEY=/m.test(text)) {
  console.error(
    '[inject-env-production] FAIL: .env.production 缺少 VITE_APP_STORE_SECURE_KEY 行',
  );
  process.exit(1);
}

text = text.replace(
  /^VITE_APP_STORE_SECURE_KEY=.*$/m,
  `VITE_APP_STORE_SECURE_KEY=${key}`,
);

const version = String(process.env.VITE_DASHBOARD_VERSION ?? '').trim();
if (version && /^VITE_DASHBOARD_VERSION=/m.test(text)) {
  text = text.replace(
    /^VITE_DASHBOARD_VERSION=.*$/m,
    `VITE_DASHBOARD_VERSION=${version}`,
  );
}

fs.writeFileSync(envPath, text);
console.log(
  `[inject-env-production] OK wrote store key (len=${key.length}) into .env.production`,
);
if (version) {
  console.log(`[inject-env-production] OK version=${version}`);
}
