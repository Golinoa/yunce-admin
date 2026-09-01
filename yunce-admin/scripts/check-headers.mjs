/**
 * 发版后安全响应头抽检（verify:sop:post）
 */
const url =
  process.env.DASHBOARD_HEADERS_URL ||
  'https://dashboard.chancore.cn/';

const required = [
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
];

const timeoutMs = Number(process.env.HEADERS_TIMEOUT_MS || 15_000);
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
  clearTimeout(timer);
  const missing = required.filter((h) => !res.headers.get(h));
  if (missing.length) {
    console.error(`[headers] FAIL missing: ${missing.join(', ')}`);
    for (const [k, v] of res.headers.entries()) {
      console.error(`  ${k}: ${v}`);
    }
    process.exit(1);
  }
  console.log(`[headers] OK ${url}`);
  for (const h of required) {
    console.log(`  ${h}: ${res.headers.get(h)}`);
  }
} catch (err) {
  clearTimeout(timer);
  console.error(`[headers] FAIL ${url}`, err?.message || err);
  process.exit(1);
}
