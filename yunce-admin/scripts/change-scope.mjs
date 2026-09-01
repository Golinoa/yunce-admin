/**
 * 按 git diff 划分改动桶，打印最小建议检查（对齐后端 verify:scope）。
 * 用法：node scripts/change-scope.mjs [baseRef]
 * 默认 baseRef = origin/main 或 HEAD~1
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const adminRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(adminRoot, '..');
const base = process.argv[2] || process.env.SCOPE_BASE || 'HEAD~1';

function sh(cmd, cwd = repoRoot) {
  return execSync(cmd, { cwd, encoding: 'utf8' }).trim();
}

let files = [];
try {
  files = sh(`git diff --name-only ${base}`).split(/\r?\n/).filter(Boolean);
} catch {
  files = sh('git diff --name-only HEAD').split(/\r?\n/).filter(Boolean);
}

const buckets = {
  source: [],
  tests: [],
  docs: [],
  config: [],
  other: [],
};

for (const f of files) {
  const rel = f.replace(/^yunce-admin\//, '');
  if (/\.(test|spec)\.[jt]sx?$/.test(rel) || rel.includes('/__tests__/')) {
    buckets.tests.push(f);
  } else if (
    rel.startsWith('apps/web-antd/docs/') ||
    rel.endsWith('AGENTS.md') ||
    rel.includes('/adr/')
  ) {
    buckets.docs.push(f);
  } else if (
    /lefthook\.yml|package\.json|pnpm-workspace|vitest\.config|tsconfig|\.env|Dockerfile|workflows\//.test(
      rel,
    ) ||
    rel.startsWith('scripts/')
  ) {
    buckets.config.push(f);
  } else if (rel.startsWith('apps/web-antd/src/') || rel.includes('web-antd')) {
    buckets.source.push(f);
  } else {
    buckets.other.push(f);
  }
}

const commands = new Set();
if (buckets.source.length || buckets.tests.length) {
  commands.add('pnpm run check:type:antd');
  commands.add('pnpm run test:ci:antd');
}
if (buckets.config.length) {
  commands.add('pnpm run check:compat');
  commands.add('pnpm run check:env');
}
if (buckets.source.length + buckets.tests.length + buckets.config.length > 8) {
  commands.add('pnpm run verify:sop:fast');
}
if (commands.size === 0 && buckets.docs.length) {
  commands.add('# docs only — no mandatory gate');
}

console.log('[verify:scope] base =', base);
console.log('[verify:scope] files =', files.length);
for (const [k, v] of Object.entries(buckets)) {
  if (v.length) console.log(`  ${k}(${v.length}):`, v.slice(0, 8).join(', '));
}
console.log('[verify:scope] recommended:');
for (const c of commands) console.log(' ', c);
console.log('[verify:scope] OK');
