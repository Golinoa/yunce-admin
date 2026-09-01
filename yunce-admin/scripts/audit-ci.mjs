/**
 * 生产依赖高危漏洞审计（对齐后端 audit:ci）。
 * CI / STRICT_AUDIT=1 时失败即红；本地 registry 不可达则警告跳过。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const strict =
  process.env.GITHUB_ACTIONS === 'true' || process.env.STRICT_AUDIT === '1';

const result = spawnSync('pnpm', ['audit', '--prod', '--audit-level', 'high'], {
  encoding: 'utf8',
  shell: true,
  cwd: root,
});

const out = `${result.stdout || ''}${result.stderr || ''}`;
process.stdout.write(result.stdout || '');
process.stderr.write(result.stderr || '');

if (result.status === 0) {
  console.log('[audit:ci] OK');
  process.exit(0);
}

const networkFail =
  /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_PNPM_AUDIT|audit endpoint returned an error|fetch failed/i.test(
    out,
  );

if (networkFail && !strict) {
  console.warn(
    '[audit:ci] WARN audit registry unreachable; skip locally (CI will enforce)',
  );
  process.exit(0);
}

console.error('[audit:ci] FAIL');
process.exit(result.status || 1);
