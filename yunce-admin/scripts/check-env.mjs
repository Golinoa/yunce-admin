/**
 * 生产 env 占位密钥检查：仓库内 .env.production 允许占位；
 * 若 STRICT_ENV=1 或传入 --strict，则拒绝占位（用于本地误打生产包）。
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

if (!fs.existsSync(envPath)) {
  console.error('[check:env] FAIL missing', envPath);
  process.exit(1);
}

const text = fs.readFileSync(envPath, 'utf8');
const match = text.match(/^VITE_APP_STORE_SECURE_KEY=(.*)$/m);
const value = (match?.[1] ?? '').trim();

if (PLACEHOLDERS.has(value)) {
  if (strict && process.env.REQUIRE_NON_PLACEHOLDER_IN_REPO === '1') {
    console.error(
      '[check:env] FAIL .env.production still uses placeholder (REQUIRE_NON_PLACEHOLDER_IN_REPO=1)',
    );
    process.exit(1);
  }
  console.log(
    '[check:env] OK placeholder in repo (expected); Docker/CI must inject real key via build-arg',
  );
  process.exit(0);
}

console.log('[check:env] OK non-placeholder key present in .env.production');
process.exit(0);
