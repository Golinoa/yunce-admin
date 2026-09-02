import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const srcRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
const routesIndex = path.resolve(srcRoot, 'router/routes/index.ts');
const coreRoutes = path.resolve(srcRoot, 'router/routes/core.ts');

describe('product route boundary', () => {
  it('registers only dashboard + organization (no demos/vben glob)', () => {
    const src = fs.readFileSync(routesIndex, 'utf8');
    expect(src).toContain("from './modules/dashboard'");
    expect(src).toContain("from './modules/organization'");
    expect(src).not.toMatch(/import\.meta\.glob\(\s*['"]\.\/modules\/\*\*/);
    expect(src).not.toMatch(/modules\/demos/);
    expect(src).not.toMatch(/modules\/vben/);
  });

  it('does not register Register / CodeLogin / QrCodeLogin core routes', () => {
    const src = fs.readFileSync(coreRoutes, 'utf8');
    expect(src).toContain("name: 'Login'");
    expect(src).toContain("name: 'ForgetPassword'");
    expect(src).not.toContain("name: 'Register'");
    expect(src).not.toContain("name: 'CodeLogin'");
    expect(src).not.toContain("name: 'QrCodeLogin'");
  });
});
