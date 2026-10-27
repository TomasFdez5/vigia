// @vitest-environment node
import { resolve } from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, expect, it } from 'vitest';
import { root } from './helpers';

// The real eslint.config.mjs is loaded; only type-aware linting is switched
// off because the simulated files do not exist in the tsconfig project.
const eslint = new ESLint({
  cwd: root,
  overrideConfig: [
    {
      files: ['**/*.{ts,tsx,mts}'],
      languageOptions: { parserOptions: { projectService: false } },
    },
    tseslint.configs.disableTypeChecked,
  ],
});

/** Rule ids of the violations found when linting `code` as if it lived at `filePath`. */
async function violations(filePath: string, code: string): Promise<string[]> {
  const [result] = await eslint.lintText(code, {
    filePath: resolve(root, filePath),
  });
  const messages = result?.messages ?? [];
  const fatal = messages.filter((m) => m.fatal);
  expect(fatal, 'fixture must parse').toEqual([]);
  return messages.flatMap((m) => (m.ruleId === null ? [] : [m.ruleId]));
}

const importsRule = 'no-restricted-imports';

type Layer =
  | 'shared'
  | 'domain'
  | 'application'
  | 'infrastructure'
  | 'composition'
  | 'app';

// Allowed imports per layer, written by hand rather than derived from the lint config.
const allowed: Record<Layer, readonly string[]> = {
  shared: [],
  domain: ['domain', 'shared'],
  application: ['domain', 'shared', 'application'],
  infrastructure: ['domain', 'shared', 'application', 'infrastructure'],
  app: ['domain', 'shared', 'application', 'composition/container'],
  composition: [
    'domain',
    'shared',
    'application',
    'infrastructure',
    'composition/container',
    'composition/env',
    'app',
  ],
};

const targets = [
  'shared',
  'domain',
  'application',
  'infrastructure',
  'composition/container',
  'composition/env',
  'app',
] as const;

const layers = Object.keys(allowed) as Layer[];

// A layer may always import its own modules; the table above lists the others.
function isAllowed(source: Layer, target: string): boolean {
  return (
    target === source ||
    target.startsWith(`${source}/`) ||
    allowed[source].includes(target)
  );
}

describe('layer dependency matrix', () => {
  // Every forbidden pair, plus the permitted pairs that prove the rule does
  // not over-block: a layer importing itself and the shared layer.
  const cases = layers
    .flatMap((source) =>
      targets.map((target) => ({
        source,
        target,
        ok: isAllowed(source, target),
      })),
    )
    .filter(
      ({ source, target, ok }) =>
        !ok || source === target || target === 'shared',
    );

  describe.each(['relative', 'alias'] as const)('by %s path', (style) => {
    it.each(cases)(
      '$source -> $target is allowed: $ok',
      async ({ source, target, ok }) => {
        // composition targets are single modules (container.ts, env.ts).
        const modulePath = target.startsWith('composition/')
          ? target
          : `${target}/mod`;
        const specifier =
          style === 'alias' ? `@/${modulePath}` : `../../${modulePath}`;
        const found = await violations(
          `src/${source}/sub/file.ts`,
          `import { x } from '${specifier}';\nexport const y: unknown = x;\n`,
        );
        expect(found.includes(importsRule)).toBe(!ok);
      },
    );
  });
});

describe('core layers stay framework-free', () => {
  const core = ['shared', 'domain', 'application'] as const;
  const forbidden = [
    'next',
    'next/headers',
    'react',
    'react/jsx-runtime',
    '@supabase/supabase-js',
    '@supabase/ssr',
    'zod',
    'node:fs',
    'node:crypto',
  ];

  describe.each(core)('%s', (layer) => {
    it.each(forbidden)('rejects importing %s', async (specifier) => {
      const found = await violations(
        `src/${layer}/file.ts`,
        `import * as x from '${specifier}';\nexport const y: unknown = x;\n`,
      );
      expect(found).toContain(importsRule);
    });

    it('accepts a local import', async () => {
      const found = await violations(
        `src/${layer}/file.ts`,
        `import { x } from './other';\nexport const y: unknown = x;\n`,
      );
      expect(found).not.toContain(importsRule);
    });
  });

  describe.each(['infrastructure', 'composition'] as const)('%s', (layer) => {
    it.each(['zod', '@supabase/supabase-js', 'node:fs', 'next/headers'])(
      'accepts importing %s',
      async (specifier) => {
        const found = await violations(
          `src/${layer}/file.ts`,
          `import * as x from '${specifier}';\nexport const y: unknown = x;\n`,
        );
        expect(found).not.toContain(importsRule);
      },
    );
  });
});

describe('admin database client is confined', () => {
  const alias = '@/infrastructure/supabase/admin';

  it.each([
    ['application use case', 'src/application/use-cases/Run.ts', alias],
    ['cron route handler', 'src/app/api/cron/health/route.ts', alias],
    ['app page', 'src/app/page.tsx', '../infrastructure/supabase/admin'],
    ['infrastructure/http', 'src/infrastructure/http/Probe.ts', alias],
    [
      'infrastructure/github by relative path',
      'src/infrastructure/github/Source.ts',
      '../supabase/admin',
    ],
    [
      'infrastructure/hosting',
      'src/infrastructure/hosting/vercel/Provider.ts',
      '../../supabase/admin/client',
    ],
  ])('rejects %s', async (_name, filePath, specifier) => {
    const found = await violations(
      filePath,
      `import { admin } from '${specifier}';\nexport const y: unknown = admin;\n`,
    );
    expect(found).toContain(importsRule);
  });

  it.each([
    ['composition', 'src/composition/container.ts', alias],
    [
      'infrastructure/supabase by alias',
      'src/infrastructure/supabase/ProjectRepository.ts',
      alias,
    ],
    [
      'infrastructure/supabase by relative path',
      'src/infrastructure/supabase/ProjectRepository.ts',
      './admin',
    ],
  ])('accepts %s', async (_name, filePath, specifier) => {
    const found = await violations(
      filePath,
      `import { admin } from '${specifier}';\nexport const y: unknown = admin;\n`,
    );
    expect(found).not.toContain(importsRule);
  });
});

describe('core layers are deterministic', () => {
  const core = ['shared', 'domain', 'application'] as const;
  const wrap = (expr: string): string => `export const y: unknown = ${expr};\n`;
  const nonDeterministic = [
    ['Date.now()', 'Date.now()'],
    ['new Date() without arguments', 'new Date()'],
    ['global fetch', "fetch('https://example.test')"],
    ['globalThis.fetch', "globalThis.fetch('https://example.test')"],
  ] as const;
  const deterministic = [
    ['new Date(value)', 'new Date(0)'],
    ['new Date(value) with a variable', 'new Date(String(1))'],
    ['Date.parse', "Date.parse('2026-01-01')"],
  ] as const;

  describe.each(core)('%s', (layer) => {
    it.each(nonDeterministic)(
      'rejects %s in a non-test file',
      async (_n, expr) => {
        const found = await violations(`src/${layer}/file.ts`, wrap(expr));
        expect(
          found.filter((id) => id.startsWith('no-restricted-')),
        ).not.toEqual([]);
      },
    );

    it.each(deterministic)('accepts %s', async (_n, expr) => {
      const found = await violations(`src/${layer}/file.ts`, wrap(expr));
      expect(found.filter((id) => id.startsWith('no-restricted-'))).toEqual([]);
    });

    it.each(nonDeterministic)('accepts %s in a test file', async (_n, expr) => {
      const found = await violations(`src/${layer}/file.test.ts`, wrap(expr));
      expect(found.filter((id) => id.startsWith('no-restricted-'))).toEqual([]);
    });
  });

  it.each(nonDeterministic)(
    'accepts %s in infrastructure',
    async (_n, expr) => {
      const found = await violations(
        'src/infrastructure/http/file.ts',
        wrap(expr),
      );
      expect(found.filter((id) => id.startsWith('no-restricted-'))).toEqual([]);
    },
  );
});

describe('process environment is read only in composition', () => {
  const reads = [
    ['member access', 'export const y: unknown = process.env.SECRET;\n'],
    ['bracket access', "export const y: unknown = process['env'];\n"],
    [
      'destructuring a variable',
      'const { SECRET } = process.env;\nexport const y: unknown = SECRET;\n',
    ],
    [
      'destructuring env',
      'const { env } = process;\nexport const y: unknown = env;\n',
    ],
  ] as const;
  const outside = [
    'shared',
    'domain',
    'application',
    'infrastructure',
    'infrastructure/supabase',
    'app',
  ];

  describe.each(outside)('%s', (folder) => {
    it.each(reads)('rejects %s', async (_n, code) => {
      const found = await violations(`src/${folder}/file.ts`, code);
      expect(found).toContain('no-restricted-properties');
    });
  });

  it('rejects it in a test file outside composition', async () => {
    const found = await violations('src/domain/file.test.ts', reads[0][1]);
    expect(found).toContain('no-restricted-properties');
  });

  it.each(reads)('accepts %s in composition', async (_n, code) => {
    const found = await violations('src/composition/env.ts', code);
    expect(found).not.toContain('no-restricted-properties');
  });
});

describe('rules that protect the future content security policy', () => {
  const component = (jsx: string): string =>
    `export function C(): JSX.Element {\n  return ${jsx};\n}\n`;

  it.each([
    [
      'dangerouslySetInnerHTML',
      '<div dangerouslySetInnerHTML={{ __html: "x" }} />',
      'react/no-danger',
    ],
    [
      'the style prop',
      '<div style={{ color: "red" }} />',
      'react/forbid-dom-props',
    ],
    [
      'the style prop with a string',
      '<p style="color: red" />',
      'react/forbid-dom-props',
    ],
    [
      'the style element',
      '<style>{"p { color: red }"}</style>',
      'react/forbid-elements',
    ],
  ])('rejects %s', async (_name, jsx, ruleId) => {
    const found = await violations('src/app/page.tsx', component(jsx));
    expect(found).toContain(ruleId);
  });

  it('accepts class names', async () => {
    const found = await violations(
      'src/app/page.tsx',
      component('<div className="text-ok" />'),
    );
    expect(found.filter((id) => id.startsWith('react/'))).toEqual([]);
  });
});

describe('dynamic import() cannot bypass the layer rules', () => {
  const dyn = (specifier: string): string =>
    `export const y: unknown = import('${specifier}');\n`;
  const syntaxRule = 'no-restricted-syntax';

  it.each([
    'src/shared/file.ts',
    'src/domain/file.ts',
    'src/application/file.ts',
    'src/domain/file.test.ts',
  ])('rejects any import() in %s', async (filePath) => {
    const found = await violations(filePath, dyn('./other'));
    expect(found).toContain(syntaxRule);
  });

  it.each([
    '@/infrastructure/supabase/admin',
    '../../infrastructure/http/Probe',
    '@/composition/env',
    '../composition/env',
  ])('rejects import(%s) in app', async (specifier) => {
    const found = await violations('src/app/api/cron/route.ts', dyn(specifier));
    expect(found).toContain(syntaxRule);
  });

  it('rejects an import() in app whose specifier is not a literal', async () => {
    const found = await violations(
      'src/app/page.tsx',
      'const name = String(1);\nexport const y: unknown = import(name);\n',
    );
    expect(found).toContain(syntaxRule);
  });

  it.each(['./Chart', '@/composition/container', '@/domain/health/Status'])(
    'accepts import(%s) in app',
    async (specifier) => {
      const found = await violations('src/app/page.tsx', dyn(specifier));
      expect(found).not.toContain(syntaxRule);
    },
  );
});

describe('hardening against known bypasses', () => {
  const ruleIds = (found: string[]): string[] =>
    found.filter(
      (id) => id.startsWith('no-restricted-') || id.startsWith('react/'),
    );

  it.each([
    [
      'a layer import',
      'src/domain/a.ts',
      "// eslint-disable-next-line no-restricted-imports\nimport { z } from 'zod';\nexport { z };\n",
      'no-restricted-imports',
    ],
    [
      'an environment read',
      'src/app/a.ts',
      '/* eslint-disable no-restricted-properties */\nexport const y = process.env.X;\n',
      'no-restricted-properties',
    ],
    [
      'a determinism rule',
      'src/application/a.ts',
      '// eslint-disable-next-line no-restricted-syntax\nexport const y = new Date();\n',
      'no-restricted-syntax',
    ],
    [
      'react/no-danger',
      'src/app/a.tsx',
      "// eslint-disable-next-line react/no-danger\nexport const C = () => <div dangerouslySetInnerHTML={{ __html: 'x' }} />;\n",
      'react/no-danger',
    ],
  ])(
    'ignores inline eslint-disable of %s in src',
    async (_n, filePath, code, ruleId) => {
      expect(await violations(filePath, code)).toContain(ruleId);
    },
  );

  it.each(['mts', 'cts', 'js', 'jsx', 'mjs'])(
    'applies the layer rules to .%s files',
    async (extension) => {
      const found = await violations(
        `src/domain/a.${extension}`,
        "import { z } from 'zod';\nexport { z };\n",
      );
      expect(found).toContain(importsRule);
    },
  );

  it('applies the environment rule to .cjs files', async () => {
    const found = await violations(
      'src/domain/a.cjs',
      'module.exports = process.env.X;\n',
    );
    expect(found).toContain('no-restricted-properties');
  });

  it('rejects globalThis.process.env outside composition', async () => {
    const found = await violations(
      'src/domain/a.ts',
      'export const y = globalThis.process.env.X;\n',
    );
    expect(ruleIds(found)).not.toEqual([]);
  });

  it('accepts globalThis.process.env in composition', async () => {
    const found = await violations(
      'src/composition/env.ts',
      'export const y = globalThis.process.env.X;\n',
    );
    expect(ruleIds(found)).toEqual([]);
  });

  it.each([
    'window.fetch("x")',
    'self.fetch("x")',
    'globalThis.Date.now()',
    'new globalThis.Date()',
  ])('rejects %s in the core layers', async (expr) => {
    const found = await violations(
      'src/domain/a.ts',
      `export const y: unknown = ${expr};\n`,
    );
    expect(ruleIds(found)).not.toEqual([]);
  });

  it.each([
    '../supabase/admin.ts',
    '@/infrastructure/supabase/admin.ts',
    '../supabase/admin/index',
  ])(
    'rejects the admin client as %s from infrastructure/http',
    async (specifier) => {
      const found = await violations(
        'src/infrastructure/http/a.ts',
        `import { a } from '${specifier}';\nexport { a };\n`,
      );
      expect(found).toContain(importsRule);
    },
  );

  it('rejects the style prop through an object spread', async () => {
    const found = await violations(
      'src/app/a.tsx',
      'export const C = () => <div {...{ style: {} }} />;\n',
    );
    expect(found).toContain('no-restricted-syntax');
  });

  it('rejects the style prop through an object spread outside the layers', async () => {
    const found = await violations(
      'src/components/a.tsx',
      'export const C = () => <div {...{ style: {} }} />;\n',
    );
    expect(found).toContain('no-restricted-syntax');
  });

  it.each([
    '@/composition/env',
    '../composition/env',
    '@/app/page',
    '../../app/page',
  ])('rejects import(%s) in infrastructure', async (specifier) => {
    const found = await violations(
      'src/infrastructure/a.ts',
      `export const y: unknown = import('${specifier}');\n`,
    );
    expect(found).toContain('no-restricted-syntax');
  });

  it('accepts import() of its own folder in infrastructure', async () => {
    const found = await violations(
      'src/infrastructure/a.ts',
      "export const y: unknown = import('./Other');\n",
    );
    expect(found).not.toContain('no-restricted-syntax');
  });

  it.each([
    ['domain', '../infrastructure'],
    ['domain', '@/infrastructure'],
    ['application', '../../app'],
    ['infrastructure', '../composition'],
    ['app', '../infrastructure'],
  ])('rejects a bare layer import from %s: %s', async (layer, specifier) => {
    const found = await violations(
      `src/${layer}/sub/a.ts`,
      `import { c } from '${specifier}';\nexport { c };\n`,
    );
    expect(found).toContain(importsRule);
  });
});

describe('arbitrary values in design token families', () => {
  const component = (className: string): string =>
    `export function C(): JSX.Element {\n  return <div className=${className} />;\n}\n`;
  const syntaxRule = 'no-restricted-syntax';

  it.each([
    ['a color', '"bg-[#f00]"'],
    ['a text size', '"text-[2rem]"'],
    ['a radius', '"rounded-[10px]"'],
    ['a shadow', '"shadow-[0_1px_2px_black]"'],
    ['a directional radius', '"rounded-t-[10px]"'],
    ['a color behind a variant', '"p-4 hover:bg-[#f00]"'],
    ['a color in an expression', '{"bg-[#f00]"}'],
    ['a color in a template literal', '{`flex bg-[#f00] ${"p-4"}`}'],
    ['a color in a function call', '{cx("p-4", "border-[#f00]")}'],
  ])('rejects %s', async (_name, className) => {
    const found = await violations('src/app/page.tsx', component(className));
    expect(found).toContain(syntaxRule);
  });

  it.each([
    ['a layout measure', '"w-[240px]"'],
    ['a grid template', '"grid-cols-[1fr_240px]"'],
    ['a token color', '"bg-surface"'],
    ['a token radius', '"rounded-md"'],
    ['a neighbor ending in a family name', '"auto-[x] w-[240px]"'],
  ])('accepts %s', async (_name, className) => {
    const found = await violations('src/app/page.tsx', component(className));
    expect(found).not.toContain(syntaxRule);
  });

  it('does not look at strings outside class names', async () => {
    const found = await violations(
      'src/app/page.tsx',
      "export const label = 'bg-[#f00]';\n",
    );
    expect(found).not.toContain(syntaxRule);
  });
});
