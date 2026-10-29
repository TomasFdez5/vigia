import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { root } from './helpers';

// One re-export statement: `export * from`, `export { a } from`, `export type { a } from`.
const reExport =
  "export\\s+(?:type\\s+)?(?:\\*(?:\\s+as\\s+\\w+)?|\\{[^}]*\\})\\s+from\\s+'[^']+'\\s*;?";
const onlyReExports = new RegExp(`^(?:\\s*${reExport})*\\s*$`);

/** Source text without block and line comments. */
const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

/** Absolute paths of every `index.ts` / `index.tsx` below `directory`. */
const findBarrels = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return findBarrels(path);
    }
    return entry.name === 'index.ts' || entry.name === 'index.tsx'
      ? [path]
      : [];
  });

// Layers whose coverage thresholds the guard protects.
const measuredLayers = ['src/application', 'src/domain', 'src/shared'];

/**
 * Barrels below `directory` that hold anything other than re-exports. Such
 * files are excluded from coverage, so their logic would go unmeasured.
 */
const barrelsWithLogic = (directory: string): string[] =>
  findBarrels(directory).filter(
    (path) => !onlyReExports.test(stripComments(readFileSync(path, 'utf8'))),
  );

describe('barrel files', () => {
  it('leaves no index file with logic in the measured layers, where coverage would not see it', () => {
    const found = measuredLayers
      .map((layer) => join(root, layer))
      .filter((directory) => existsSync(directory))
      .flatMap((directory) => barrelsWithLogic(directory));
    expect(found).toEqual([]);
  });

  it('flags a barrel with logic and accepts a pure re-export barrel', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'barrels-'));
    try {
      mkdirSync(join(fixture, 'logic'));
      mkdirSync(join(fixture, 'pure'));
      writeFileSync(
        join(fixture, 'logic', 'index.ts'),
        "export { a } from './a';\nexport const b = 1;\n",
      );
      writeFileSync(
        join(fixture, 'pure', 'index.ts'),
        "// Public API.\nexport * from './a';\n/* types */\nexport type { T } from './t';\nexport { x, y } from './xy';\n",
      );
      expect(barrelsWithLogic(fixture)).toEqual([
        join(fixture, 'logic', 'index.ts'),
      ]);
    } finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  });
});
