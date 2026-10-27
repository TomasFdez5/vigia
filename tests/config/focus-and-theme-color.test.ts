import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';
import { compile } from 'tailwindcss';
import { describe, expect, it } from 'vitest';
import { viewport } from '../../src/app/viewport';
import { root } from './helpers';

interface Design {
  colors: Record<'light' | 'dark', { canvas: string; focus: string }>;
}

const read = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

// Expected colors come from the design document, never from the stylesheet.
const design = parse(
  /^---\n([\s\S]*?)\n---/.exec(read('DESIGN.md'))?.[1] ?? '',
) as Design;

// The focus ring is 2 px wide, 2 px away from the element, in the focus color.
const RING_WIDTH = '2px';
const RING_OFFSET = '2px';

const css = read('src/app/globals.css');

const tailwindDir = dirname(
  createRequire(import.meta.url).resolve('tailwindcss/package.json'),
);

const compiled = async (): Promise<string> => {
  const compiler = await compile(css, {
    base: resolve(root, 'src/app'),
    loadStylesheet: (id, base) => {
      const path =
        id === 'tailwindcss'
          ? resolve(tailwindDir, 'index.css')
          : resolve(base, id);
      return Promise.resolve({
        path,
        base: dirname(path),
        content: read(path),
      });
    },
  });
  return compiler.build([]).replace(/\s+/g, ' ');
};

describe('base focus ring', () => {
  it('draws the ring on every focus-visible element in the focus color', async () => {
    expect(await compiled()).toContain(
      `:focus-visible { outline: ${RING_WIDTH} solid var(--focus); outline-offset: ${RING_OFFSET}; }`,
    );
  });

  it('removes no outline without a replacement', () => {
    expect(css).not.toMatch(/outline\s*:\s*(none|0)\b/);
    expect(css).not.toMatch(/outline-style\s*:\s*none/);
  });
});

describe('theme-color meta', () => {
  it('follows the system preference with the canvas of each theme', () => {
    expect(viewport.themeColor).toEqual([
      {
        media: '(prefers-color-scheme: light)',
        color: design.colors.light.canvas,
      },
      {
        media: '(prefers-color-scheme: dark)',
        color: design.colors.dark.canvas,
      },
    ]);
  });
});
