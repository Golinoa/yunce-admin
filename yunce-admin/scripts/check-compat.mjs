/**
 * Admin 兼容性 / 运行时基线检查（对齐后端 check:compat）
 * - Node 与 engines.node 主版本一致（期望 24）
 * - package.json engines / packageManager 存在
 * - 关键部署与产品入口文件存在
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const errors = [];
const warnings = [];

const nodeMajor = Number(process.versions.node.split('.')[0]);
const enginesNode = String(pkg.engines?.node ?? '');
const requiredMajor = Number(enginesNode.split('.')[0]) || 24;
const inCi = process.env.GITHUB_ACTIONS === 'true' || process.env.STRICT_COMPAT === '1';

if (nodeMajor < 20) {
  errors.push(`Node ${process.versions.node} < 20（最低基线）`);
} else if (inCi && nodeMajor !== requiredMajor) {
  errors.push(
    `CI Node ${process.versions.node} 与 engines.node(${enginesNode}) 主版本不一致（要求 ${requiredMajor}.x）`,
  );
} else if (nodeMajor !== requiredMajor) {
  warnings.push(
    `本地 Node ${process.versions.node} ≠ engines ${enginesNode}；CI 将使用 ${requiredMajor}.x`,
  );
}

if (!pkg.engines?.node) {
  errors.push('package.json 未声明 engines.node');
}
if (!pkg.engines?.pnpm) {
  warnings.push('package.json 未声明 engines.pnpm');
}
if (!pkg.packageManager) {
  warnings.push('package.json 未声明 packageManager');
}

const mustExist = [
  'apps/web-antd/package.json',
  'apps/web-antd/src/main.ts',
  'scripts/deploy/Dockerfile',
  'scripts/deploy/nginx.conf',
];
for (const rel of mustExist) {
  if (!fs.existsSync(path.join(root, rel))) {
    errors.push(`缺少部署/产品基线文件: ${rel}`);
  }
}

console.log('[compat-check] Node', process.versions.node);
console.log('[compat-check] packageManager', pkg.packageManager ?? '(none)');
if (warnings.length) {
  for (const w of warnings) console.warn('[compat-check] WARN', w);
}
if (errors.length) {
  for (const e of errors) console.error('[compat-check] FAIL', e);
  process.exit(1);
}
console.log('[compat-check] OK');
