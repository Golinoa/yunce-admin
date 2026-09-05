/**
 * 构建产物门禁：dist 里不得把仓库占位密钥当作 VITE_APP_STORE_SECURE_KEY 打进包。
 * （代码里的「禁止占位 Set」会包含该字符串，故只匹配 env 嵌入形态。）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, '../apps/web-antd/dist');

const BAD =
  /VITE_APP_STORE_SECURE_KEY\s*[:=]\s*[`'"]please-replace-me-with-your-own-key[`'"]/;

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|mjs|css|html)$/i.test(name)) out.push(p);
  }
  return out;
}

if (!fs.existsSync(distDir)) {
  console.error('[assert-dist-store-key] FAIL missing dist', distDir);
  process.exit(1);
}

const files = walk(distDir);
let hit = null;
for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  if (BAD.test(text)) {
    hit = file;
    break;
  }
}

if (hit) {
  console.error(
    '[assert-dist-store-key] FAIL: dist 仍嵌入占位 VITE_APP_STORE_SECURE_KEY：',
    path.relative(distDir, hit),
  );
  console.error(
    '  检查 turbo env 透传与 scripts/inject-env-production.mjs 是否在 build 前执行。',
  );
  process.exit(1);
}

console.log(
  `[assert-dist-store-key] OK scanned ${files.length} files, no placeholder embed`,
);
