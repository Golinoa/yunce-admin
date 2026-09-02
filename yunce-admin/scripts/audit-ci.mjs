/**
 * 运营后台生产依赖高危审计。
 *
 * 背景：
 * - 仓库 `.npmrc` 用 npmmirror 加速安装，但镜像 **无** npm audit 端点 →
 *   旧逻辑在 CI（STRICT）直接红、本地却 WARN 跳过，造成「本地绿 / 云端红」。
 * - 修复：审计强制 `registry.npmjs.org`；只对 **web-antd 运行时路径** 的 high/critical 计失败。
 * - 构建链（vite/sass/less/postcss…）与未交付 app（backend-mock / 其它 UI 变体）不计门禁。
 *
 * 跳过（勿用于发版）：AUDIT_ALLOW_SKIP=1 且确属网络不可达。
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allowSkip = process.env.AUDIT_ALLOW_SKIP === '1';
const AUDIT_REGISTRY = 'https://registry.npmjs.org';

/** 未进 dashboard 镜像 / 非运行时的路径 */
const IGNORE_PATH =
  /backend-mock|lint-configs|playground|web-ele|web-naive|web-tdesign|web-antdv-next|docs__|internal__vite-config|internal__lint|internal__tsconfig|internal__tailwind|scripts__/;

/** 构建期工具边（会出现在依赖树里，但不会打进生产静态资源运行时） */
const BUILD_EDGE = />(vite|sass|less|esbuild|rollup|postcss|@vue\/compiler)([>-]|$)/;

const IGNORE_MODULE =
  /^(vite|rollup|esbuild|sass|less|immutable|image-size|nanoid|postcss|nitropack|tar|glob|fast-uri)$/;

function runAuditJson() {
  return spawnSync(
    'pnpm',
    [
      'audit',
      '--prod',
      '--audit-level',
      'high',
      '--json',
      '--registry',
      AUDIT_REGISTRY,
    ],
    {
      encoding: 'utf8',
      shell: true,
      cwd: root,
      env: {
        ...process.env,
        npm_config_registry: AUDIT_REGISTRY,
      },
      maxBuffer: 20 * 1024 * 1024,
    },
  );
}

function isNetworkFail(text) {
  return /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ERR_PNPM_AUDIT|audit endpoint|fetch failed|EAI_AGAIN|NOT_IMPLEMENTED/i.test(
    text,
  );
}

function isProductRuntimePath(depPath) {
  if (!depPath.includes('apps__web-antd')) return false;
  if (IGNORE_PATH.test(depPath)) return false;
  if (BUILD_EDGE.test(depPath)) return false;
  return true;
}

function collectBlockers(advisories) {
  const blockers = [];
  for (const advisory of Object.values(advisories || {})) {
    const severity = advisory.severity;
    if (severity !== 'high' && severity !== 'critical') continue;
    if (IGNORE_MODULE.test(String(advisory.module_name || ''))) continue;

    const paths = (advisory.findings || []).flatMap((f) => f.paths || []);
    const runtimePaths = paths.filter((p) => isProductRuntimePath(String(p)));
    if (runtimePaths.length === 0) continue;

    blockers.push({
      id: advisory.id,
      module: advisory.module_name,
      severity,
      title: advisory.title,
      path: runtimePaths[0],
      url: advisory.url,
    });
  }
  return blockers;
}

const result = runAuditJson();
const out = `${result.stdout || ''}${result.stderr || ''}`;

if (isNetworkFail(out)) {
  if (allowSkip) {
    console.warn(
      '[audit:ci] WARN audit registry unreachable; skipped because AUDIT_ALLOW_SKIP=1',
    );
    process.exit(0);
  }
  console.error(
    `[audit:ci] FAIL：无法访问 ${AUDIT_REGISTRY} 做 audit（勿用 npmmirror 审依赖）。`,
  );
  console.error(
    '  本地复现与 CI 一致：直接 pnpm run audit:ci；临时跳过才设 AUDIT_ALLOW_SKIP=1。',
  );
  process.stderr.write(result.stderr || '');
  process.exit(1);
}

let payload;
try {
  // pnpm 可能在 json 前后夹杂其它行，取最后一个 {…} 对象
  const start = out.indexOf('{');
  const end = out.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('no json object');
  payload = JSON.parse(out.slice(start, end + 1));
} catch {
  console.error('[audit:ci] FAIL：无法解析 pnpm audit --json 输出');
  process.stderr.write(out.slice(0, 2000));
  process.exit(1);
}

const blockers = collectBlockers(payload.advisories);
if (blockers.length === 0) {
  console.log(
    `[audit:ci] OK (registry=${AUDIT_REGISTRY}; web-antd runtime high/critical=0)`,
  );
  process.exit(0);
}

console.error(
  `[audit:ci] FAIL：web-antd 运行时路径存在 ${blockers.length} 个 high/critical：`,
);
for (const item of blockers.slice(0, 20)) {
  console.error(
    `  - [${item.severity}] ${item.module}: ${item.title} @ ${item.path}`,
  );
}
process.exit(1);
