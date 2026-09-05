/**
 * 生产 env 门禁：
 * - VITE_APP_TITLE / VITE_APP_NAMESPACE 必须写在 .env.production（Docker 不含未入库 .env）
 * - VITE_APP_STORE_SECURE_KEY 仓库内允许占位；真实值由 Docker build-arg / CI Secret 注入
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const envPath = path.join(root, 'apps/web-antd/.env.production');
const strict =
  process.argv.includes('--strict') ||
  process.env.STRICT_ENV === '1' ||
  process.env.GITHUB_ACTIONS === 'true';

const PLACEHOLDERS = new Set([
  '',
  'please-replace-me-with-your-own-key',
]);

function readEnvValue(text, key) {
  const match = text.match(new RegExp(`^${key}=(.*)$`, 'm'));
  return (match?.[1] ?? '').trim();
}

if (!fs.existsSync(envPath)) {
  console.error('[check:env] FAIL missing', envPath);
  process.exit(1);
}

const text = fs.readFileSync(envPath, 'utf8');

const required = ['VITE_APP_TITLE', 'VITE_APP_NAMESPACE'];
for (const key of required) {
  const value = readEnvValue(text, key);
  if (!value || value.includes(`%${key}%`)) {
    console.error(
      `[check:env] FAIL ${key} 缺失或无效。必须写入 apps/web-antd/.env.production（Docker 构建不会带上本地 .env）。`,
    );
    process.exit(1);
  }
}

const storeKey = readEnvValue(text, 'VITE_APP_STORE_SECURE_KEY');
if (PLACEHOLDERS.has(storeKey)) {
  if (strict && process.env.REQUIRE_NON_PLACEHOLDER_IN_REPO === '1') {
    console.error(
      '[check:env] FAIL .env.production still uses placeholder (REQUIRE_NON_PLACEHOLDER_IN_REPO=1)',
    );
    process.exit(1);
  }
  console.log(
    '[check:env] OK title/namespace present; store key placeholder in repo (expected); Docker/CI must inject real key via build-arg',
  );
  process.exit(0);
}

console.log('[check:env] OK title/namespace + non-placeholder store key present');
process.exit(0);
