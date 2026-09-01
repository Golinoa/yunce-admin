/**
 * 发版后健康探活（verify:sop:post）
 * 默认：https://dashboard.chancore.cn/health
 */
const url =
  process.env.DASHBOARD_HEALTH_URL ||
  'https://dashboard.chancore.cn/health';

const timeoutMs = Number(process.env.HEALTH_TIMEOUT_MS || 15_000);

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const res = await fetch(url, { signal: controller.signal, redirect: 'follow' });
  clearTimeout(timer);
  if (!res.ok) {
    console.error(`[health] FAIL ${url} → HTTP ${res.status}`);
    process.exit(1);
  }
  console.log(`[health] OK ${url} → HTTP ${res.status}`);
} catch (err) {
  clearTimeout(timer);
  console.error(`[health] FAIL ${url}`, err?.message || err);
  process.exit(1);
}
