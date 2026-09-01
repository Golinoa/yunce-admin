import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const routesIndex = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../router/routes/index.ts',
);

describe('product route boundary', () => {
  it('registers only dashboard + organization (no demos/vben glob)', () => {
    const src = fs.readFileSync(routesIndex, 'utf8');
    expect(src).toContain("from './modules/dashboard'");
    expect(src).toContain("from './modules/organization'");
    expect(src).not.toMatch(/import\.meta\.glob\(\s*['"]\.\/modules\/\*\*/);
    expect(src).not.toMatch(/modules\/demos/);
    expect(src).not.toMatch(/modules\/vben/);
  });
});
