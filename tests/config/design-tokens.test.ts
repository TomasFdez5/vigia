import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { parse } from 'yaml';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile } from 'tailwindcss';
import { root } from './helpers';

type Theme = 'light' | 'dark';
type Tokens = Record<string, string>;

const read = (path: string): string =>
  readFileSync(resolve(root, path), 'utf8');

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const record = (value: unknown): Record<string, unknown> => {
  if (!isRecord(value))
    throw new Error('expected a mapping in the design file');
  return value;
};

const text = (value: unknown): string => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error('expected a scalar in the design file');
  }
  return String(value);
};

// Expected tokens, scale and thresholds come from the design document, never
// from the stylesheet under test.
const design = record(
  parse(/^---\n([\s\S]*?)\n---/.exec(read('DESIGN.md'))?.[1] ?? ''),
);
const colors = record(design['colors']);
const typography = record(design['typography']);
const scale = record(typography['scale']);
const spacing = record(design['spacing']);
const radius = record(design['radius']);
const spacingUnitPx = parseInt(text(spacing['unit']), 10);
const scalePx = Array.isArray(spacing['scale'])
  ? spacing['scale'].map(Number)
  : [];

const designTokens = (theme: Theme): Tokens =>
  Object.fromEntries(
    Object.entries(record(colors[theme])).map(([name, value]) => [
      name,
      text(value).toLowerCase(),
    ]),
  );

// Contrast minimums of the design document: text and status text at least
// 4.5:1, interactive control borders at least 3:1.
const TEXT_RATIO = 4.5;
const CONTROL_RATIO = 3;

const css = read('src/app/globals.css');

const declarations = (block: string): Tokens =>
  Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*([^;]+);/g)].map((match) => [
      match[1] ?? '',
      (match[2] ?? '').trim().toLowerCase(),
    ]),
  );

const blockOf = (pattern: RegExp): Tokens => {
  const body = pattern.exec(css)?.[1];
  return body === undefined ? {} : declarations(body);
};

const ROOT_BLOCK = /(?:^|\n):root\s*\{([^}]*)\}/;
const DARK_CLASS_BLOCK = /\n\.dark\s*\{([^}]*)\}/;

// The system preference applies by default; the classes force a theme.
const sources: Record<string, { theme: Theme; tokens: () => Tokens }> = {
  'the default (root) block': {
    theme: 'light',
    tokens: () => blockOf(ROOT_BLOCK),
  },
  'the system dark preference': {
    theme: 'dark',
    tokens: () =>
      blockOf(
        /@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\.light\)\s*\{([^}]*)\}/,
      ),
  },
  'the manual dark class': {
    theme: 'dark',
    tokens: () => blockOf(DARK_CLASS_BLOCK),
  },
};

const WEIGHTS = [0.2126, 0.7152, 0.0722];

const themeTokens: Record<Theme, () => Tokens> = {
  light: () => blockOf(ROOT_BLOCK),
  dark: () => blockOf(DARK_CLASS_BLOCK),
};

const luminance = (hex: string): number => {
  return [1, 3, 5].reduce((sum, start, channel) => {
    const value = parseInt(hex.slice(start, start + 2), 16) / 255;
    const linear =
      value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return sum + (WEIGHTS[channel] ?? 0) * linear;
  }, 0);
};

const contrast = (foreground: string, background: string): number => {
  const [lighter = 0, darker = 0] = [
    luminance(foreground),
    luminance(background),
  ].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
};

describe('theme color tokens', () => {
  describe.each(Object.entries(sources))('%s', (_label, source) => {
    it('defines exactly the tokens of the design document, with its values', () => {
      expect(source.tokens()).toEqual(designTokens(source.theme));
    });
  });
});

interface Requirement {
  foreground: string;
  background: string;
  minimum: number;
}

const statuses = ['ok', 'warn', 'err', 'unknown'] as const;

const requirements: readonly Requirement[] = [
  ...['text', 'text-secondary', 'accent', ...statuses].map((foreground) => ({
    foreground,
    background: 'surface',
    minimum: TEXT_RATIO,
  })),
  ...statuses.map((status) => ({
    foreground: status,
    background: `${status}-bg`,
    minimum: TEXT_RATIO,
  })),
  { foreground: 'on-accent', background: 'accent', minimum: TEXT_RATIO },
  { foreground: 'border-input', background: 'surface', minimum: CONTROL_RATIO },
  // Page text sits directly on the canvas.
  ...['text', 'text-secondary', 'accent'].map((foreground) => ({
    foreground,
    background: 'canvas',
    minimum: TEXT_RATIO,
  })),
  { foreground: 'focus', background: 'surface', minimum: CONTROL_RATIO },
  { foreground: 'focus', background: 'canvas', minimum: CONTROL_RATIO },
];

describe('theme contrast', () => {
  describe.each(['light', 'dark'] as const)('%s theme', (theme) => {
    // Computed from the stylesheet, so a drifting token cannot hide.
    const tokens = themeTokens[theme]();

    it.each(requirements)(
      '$foreground on $background',
      ({ foreground, background, minimum }) => {
        expect(
          contrast(tokens[foreground] ?? '', tokens[background] ?? ''),
        ).toBeGreaterThanOrEqual(minimum);
      },
    );
  });
});

const tailwindDir = dirname(
  createRequire(import.meta.url).resolve('tailwindcss/package.json'),
);

// Resolves imports the way the test needs: the framework entry point from the
// installed package, anything else relative to the importing file.
const loadStylesheet = (id: string, base: string) => {
  const path =
    id === 'tailwindcss'
      ? resolve(tailwindDir, 'index.css')
      : resolve(base, id);
  return Promise.resolve({ path, base: dirname(path), content: read(path) });
};

const compileSource = (source: string) =>
  compile(source, { base: resolve(root, 'src/app'), loadStylesheet });

// A fresh compiler per call: build() accumulates candidates across calls.
const buildCandidate = async (
  source: string,
  candidate: string,
): Promise<string> => (await compileSource(source)).build([candidate]);

// True when the output declares a rule whose whole selector is the candidate,
// so a neighbor such as `.rounded-lg` cannot stand in for `.rounded`.
const declaresUtility = (output: string, candidate: string): boolean =>
  new RegExp(
    `^\\s*\\.${candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`,
    'm',
  ).test(output);

describe('Tailwind exposure', () => {
  let build: (candidates: string[]) => string;

  beforeAll(async () => {
    const compiler = await compileSource(css);
    build = (candidates) => compiler.build(candidates);
  });

  const normalized = (value: string): string => value.replace(/\s+/g, ' ');

  it('exposes every color token as a utility', () => {
    const names = Object.keys(designTokens('light'));
    const output = normalized(build(names.map((name) => `bg-${name}`)));
    expect(names.filter((name) => !output.includes(`var(--${name})`))).toEqual(
      [],
    );
  });

  it.each(Object.entries(scale))('exposes the %s type style', (name, entry) => {
    const style = record(entry);
    const output = normalized(build([`text-${name}`]));
    expect(output).toContain(`--text-${name}: ${text(style['size'])}`);
    expect(output).toContain(
      `--text-${name}--line-height: ${text(style['line'])}`,
    );
    expect(output).toContain(
      `--text-${name}--font-weight: ${text(style['weight'])}`,
    );
    if (style['tracking'] !== undefined) {
      expect(output).toContain(
        `--text-${name}--letter-spacing: ${text(style['tracking'])}`,
      );
    }
  });

  // The stacks name the Geist families, but next/font registers them under
  // generated names and exposes them through one CSS variable per family, so
  // the first family of each stack is that variable.
  const withLoaderFamily = (stack: string, variable: string): string =>
    [`var(${variable})`, ...stack.split(',').slice(1)]
      .map((part) => part.trim())
      .join(', ');

  it('exposes the sans and mono font stacks', () => {
    const output = normalized(build(['font-sans', 'font-mono']));
    expect(output).toContain(
      `font-family: ${withLoaderFamily(text(typography['sans']), '--font-geist-sans')}`,
    );
    expect(output).toContain(
      `font-family: ${withLoaderFamily(text(typography['mono']), '--font-geist-mono')}`,
    );
  });

  it('uses the spacing unit of the design document', () => {
    const steps = scalePx.map((px) => String(px / spacingUnitPx));
    const output = normalized(build(steps.map((step) => `p-${step}`)));
    expect(output).toContain(`--spacing: ${text(spacing['unit'])}`);
    for (const step of steps) {
      // Tailwind emits a single unit without the multiplication.
      expect(output).toContain(
        `.p-${step} { padding: ${
          step === '1' ? 'var(--spacing)' : `calc(var(--spacing) * ${step})`
        }; }`,
      );
    }
  });

  describe('Tailwind defaults outside the design document', () => {
    // Each group is one reset namespace of the stylesheet.
    const resetNamespaces = {
      '--color-*': ['bg-red-500', 'bg-white', 'bg-black', 'text-red-500'],
      '--text-*': ['text-4xl', 'text-base', 'text-xs', 'text-sm'],
      '--radius-*': ['rounded-lg', 'rounded'],
      '--shadow-*': ['shadow-md', 'shadow-sm', 'shadow'],
      '--inset-shadow-*': ['inset-shadow-sm'],
      '--drop-shadow-*': ['drop-shadow-md'],
      '--text-shadow-*': ['text-shadow-sm'],
      '--blur-*': ['blur-sm'],
      '--backdrop-blur-*': ['backdrop-blur-sm'],
      '--tracking-*': ['tracking-tight', 'tracking-wide'],
      '--leading-*': ['leading-tight', 'leading-snug'],
      '--font-serif': ['font-serif'],
      '--font-weight-*': ['font-bold', 'font-semibold', 'font-medium'],
    };

    const cases = Object.entries(resetNamespaces).flatMap(
      ([namespace, candidates]) =>
        candidates.map((candidate) => ({ namespace, candidate })),
    );

    // One control per namespace proves the utility exists with the default
    // theme, so the negative cases below cannot pass for the wrong reason.
    const controls = Object.entries(resetNamespaces).map(
      ([namespace, [candidate = '']]) => ({ namespace, candidate }),
    );

    it.each(controls)(
      'resolves $candidate with the default theme (control for $namespace)',
      async ({ candidate }) => {
        expect(
          declaresUtility(
            await buildCandidate("@import 'tailwindcss';", candidate),
            candidate,
          ),
        ).toBe(true);
      },
    );

    it.each(cases)(
      'does not resolve $candidate once $namespace is reset',
      async ({ candidate }) => {
        expect(
          declaresUtility(await buildCandidate(css, candidate), candidate),
        ).toBe(false);
      },
    );

    it('keeps the sans and mono font families', async () => {
      const output = await buildCandidate(css, 'font-sans');
      expect(declaresUtility(output, 'font-sans')).toBe(true);
    });
  });

  // Layout sizes of the design document, in pixels.
  const layoutSizes = [
    { utility: 'w', property: 'width', px: 240 },
    { utility: 'h', property: 'height', px: 56 },
    { utility: 'h', property: 'height', px: 40 },
    { utility: 'h', property: 'height', px: 44 },
  ] as const;

  it.each(layoutSizes)(
    'keeps $utility of $px px expressible',
    ({ utility, property, px }) => {
      const step = String(px / spacingUnitPx);
      expect(normalized(build([`${utility}-${step}`]))).toContain(
        `.${utility}-${step} { ${property}: calc(var(--spacing) * ${step}); }`,
      );
    },
  );

  it.each(Object.entries(radius))('exposes the %s radius', (name, value) => {
    expect(normalized(build([`rounded-${name}`]))).toContain(
      `--radius-${name}: ${text(value)}`,
    );
  });
});
