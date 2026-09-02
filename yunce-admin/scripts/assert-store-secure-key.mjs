/**
 * 生产 store 加密密钥门禁：拒绝空值与仓库占位值。
 * Docker builder / 本地镜像脚本 / 发版 CI 共用。
 *
 * 用法：
 *   VITE_APP_STORE_SECURE_KEY=... node scripts/assert-store-secure-key.mjs
 */
const PLACEHOLDERS = new Set([
  '',
  'please-replace-me-with-your-own-key',
]);

const MIN_LEN = 16;
const key = String(process.env.VITE_APP_STORE_SECURE_KEY ?? '').trim();

if (PLACEHOLDERS.has(key)) {
  console.error(
    '[assert-store-secure-key] FAIL: VITE_APP_STORE_SECURE_KEY 为空或仍是仓库占位值。',
  );
  console.error(
    '  发版：配置 GitHub Secret VITE_APP_STORE_SECURE_KEY 后打 vX.Y.Z。',
  );
  console.error(
    '  本地镜像：export VITE_APP_STORE_SECURE_KEY=<非占位≥16字符> 后再跑 build-local-docker-image.sh',
  );
  process.exit(1);
}

if (key.length < MIN_LEN) {
  console.error(
    `[assert-store-secure-key] FAIL: 密钥过短（${key.length} < ${MIN_LEN}），拒绝进入生产构建。`,
  );
  process.exit(1);
}

console.log(
  `[assert-store-secure-key] OK (len=${key.length}, non-placeholder)`,
);
process.exit(0);
