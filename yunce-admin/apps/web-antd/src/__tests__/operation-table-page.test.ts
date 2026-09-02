import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const shellPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../views/operation/components/OperationTablePage.vue',
);

describe('OperationTablePage shell', () => {
  it('exists and declares title prop + filters/actions slots', () => {
    expect(fs.existsSync(shellPath)).toBe(true);
    const src = fs.readFileSync(shellPath, 'utf8');
    expect(src).toContain('title: string');
    expect(src).toContain('name="filters"');
    expect(src).toContain('name="actions"');
    expect(src).toContain('name="summary"');
    expect(src).toContain('operation-table-page');
  });
});
