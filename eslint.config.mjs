import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import tseslint from 'typescript-eslint';

const boundaryLayers = [
  'src/shared/**/*.ts',
  'src/domain/**/*.ts',
  'src/application/**/*.ts',
  'src/infrastructure/**/*.ts',
  'src/composition/**/*.ts',
];

// Every extension a bundler may pick up, so a stray .mts or .js file cannot
// sit outside the layer rules.
const ext = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}';
const inSrc = (folder) => `src/${folder}/**/*.${ext}`;
const testFiles = `**/*.test.${ext}`;

// --- Imports ---------------------------------------------------------------
// Flat config does not merge the options of a rule across config objects: the
// last matching object wins. So every zone below gets ONE entry per rule, built
// by `zone`. Patterns are matched against the specifier as written: `@/x` for
// the alias, `**/x` for relative paths.
const layerGroup = (layer, message) => ({
  group: [`@/${layer}`, `@/${layer}/**`, `**/${layer}`, `**/${layer}/**`],
  message,
});

const noUpward = (layer) =>
  layerGroup(layer, `This layer may not import ${layer} (SPEC §2.1).`);

// app may reach composition through the container only (ADR 0001). No bare
// pattern here: an excluded parent directory cannot be re-included.
const appCompositionGroup = {
  group: [
    '@/composition/**',
    '**/composition/**',
    '!@/composition/container',
    '!**/composition/container',
  ],
  message:
    'app reaches composition only through the container (ADR 0001, SPEC §2.1).',
};

// shared, domain and application stay free of frameworks and I/O (SPEC §3.2).
// Exact names go in `paths`: a bare pattern such as `next` would also match a
// local `./next` module.
const purePaths = ['next', 'react', 'zod'].map((name) => ({
  name,
  message: `Core layers may not import ${name} (SPEC §3.2).`,
}));
const purePatterns = [
  {
    group: ['next/**', 'react/**', 'zod/**', '@supabase/**', 'node:*'],
    message:
      'Core layers may not import next, react, @supabase/*, zod or node: modules (SPEC §3.2).',
  },
];
const pure = (patterns) => ({
  patterns: [...patterns, ...purePatterns],
  paths: purePaths,
});

// The admin client is importable only from composition and from its own
// adapter folder, with no exception for cron route handlers (ADR 0001).
const adminClientGroup = {
  group: [
    '@/infrastructure/supabase/admin',
    '@/infrastructure/supabase/admin.*',
    '@/infrastructure/supabase/admin/**',
    '**/supabase/admin',
    '**/supabase/admin.*',
    '**/supabase/admin/**',
  ],
  message:
    'The admin client is importable only from composition and infrastructure/supabase (SPEC §3.2).',
};
const infrastructurePatterns = [noUpward('composition'), noUpward('app')];

// --- Environment, clock, network -------------------------------------------
const envProperty = {
  object: 'process',
  property: 'env',
  message:
    'Read the environment only in src/composition (SPEC §3.2). Use the validated env accessor.',
};
const noFetch = 'Core layers do not call fetch (SPEC §3.2).';
const deterministicProperties = [
  {
    object: 'Date',
    property: 'now',
    message: 'Inject a Clock instead of Date.now (SPEC §3.1).',
  },
  {
    object: 'globalThis',
    property: 'Date',
    message: 'Inject a Clock instead of globalThis.Date (SPEC §3.1).',
  },
  ...['globalThis', 'window', 'self'].map((object) => ({
    object,
    property: 'fetch',
    message: noFetch,
  })),
];

// --- Syntax ----------------------------------------------------------------
// esquery regexes cannot contain `/`, hence \\W for path separators.
const globalProcess = {
  selector:
    "MemberExpression[object.name='globalThis'][property.name='process']",
  message: 'Read the environment only in src/composition (SPEC §3.2).',
};
const styleSpread = {
  selector:
    "JSXSpreadAttribute > ObjectExpression > Property:matches([key.name='style'], [key.value='style'])",
  message: 'Inline styles break the CSP. Use Tailwind classes.',
};
// Arbitrary values are blocked only in the families the design tokens own
// (color, radius, shadow). Layout measures such as w-[240px] stay allowed.
// esquery regexes cannot contain `/`, so the pattern is spelled out here.
const tokenFamilies =
  'bg|text|border|ring|outline|fill|stroke|accent|caret|decoration|divide|placeholder|from|via|to|rounded|shadow|drop-shadow|inset-shadow';
const arbitraryTokenValue = `(^|[\\s:!])(${tokenFamilies})(-[a-z]{1,2})?-\\[`;
const arbitraryTokenMessage =
  'Arbitrary values are not allowed for color, text, radius or shadow families. Use a design token.';
const arbitraryTokenClassNames = [
  {
    selector: `JSXAttribute[name.name='className'] Literal[value=/${arbitraryTokenValue}/]`,
    message: arbitraryTokenMessage,
  },
  {
    selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${arbitraryTokenValue}/]`,
    message: arbitraryTokenMessage,
  },
];
const newDateWithoutArguments = {
  selector: "NewExpression[callee.name='Date'][arguments.length=0]",
  message: 'Inject a Clock instead of new Date() (SPEC §3.1).',
};

// no-restricted-imports does not see import(). Core layers have no use for it.
const anyDynamicImport = {
  selector: 'ImportExpression',
  message: 'Core layers do not use dynamic import() (SPEC §3.2).',
};
// infrastructure may not reach composition or app that way either.
const infrastructureDynamicImports = [
  {
    selector: 'ImportExpression[source.value=/(^|\\W)(composition|app)\\W/]',
    message: 'infrastructure may not import() composition or app (SPEC §2.1).',
  },
];
// In app import() stays available (next/dynamic) except toward infrastructure,
// any composition module but the container, or a specifier that cannot be
// checked.
const appDynamicImports = [
  {
    selector: "ImportExpression[source.type!='Literal']",
    message: 'app may not import() a specifier that cannot be checked.',
  },
  {
    selector: 'ImportExpression[source.value=/(^|\\W)infrastructure(\\W|$)/]',
    message: 'app may not import() infrastructure (ADR 0001).',
  },
  {
    selector:
      'ImportExpression[source.value=/(^|\\W)composition\\W(?!container$)/]',
    message: 'app may import() only the composition container (ADR 0001).',
  },
];

// --- Zones -----------------------------------------------------------------
// One config object per zone with the complete set of restricted-* rules.
// Everything under src/ except composition shares the environment rules.
const zone = ({
  files,
  ignores,
  imports,
  properties = [],
  globals = [],
  syntax = [],
}) => ({
  files,
  ...(ignores && { ignores }),
  rules: {
    ...(imports && { 'no-restricted-imports': ['error', imports] }),
    'no-restricted-properties': ['error', envProperty, ...properties],
    ...(globals.length > 0 && {
      'no-restricted-globals': ['error', ...globals],
    }),
    'no-restricted-syntax': [
      'error',
      ...syntax,
      globalProcess,
      styleSpread,
      ...arbitraryTokenClassNames,
    ],
  },
});

const coreLayers = {
  shared: pure([
    noUpward('domain'),
    noUpward('application'),
    noUpward('infrastructure'),
    noUpward('composition'),
    noUpward('app'),
  ]),
  domain: pure([
    noUpward('application'),
    noUpward('infrastructure'),
    noUpward('composition'),
    noUpward('app'),
  ]),
  application: pure([
    noUpward('infrastructure'),
    noUpward('composition'),
    noUpward('app'),
  ]),
};

const coreZones = Object.entries(coreLayers).flatMap(([layer, imports]) => [
  // Test files are exempt from the determinism rules only.
  zone({ files: [inSrc(layer)], imports, syntax: [anyDynamicImport] }),
  zone({
    files: [inSrc(layer)],
    ignores: [testFiles],
    imports,
    properties: deterministicProperties,
    globals: [{ name: 'fetch', message: noFetch }],
    syntax: [anyDynamicImport, newDateWithoutArguments],
  }),
]);

const infrastructureZone = (files, patterns) =>
  zone({
    files: [files],
    imports: { patterns },
    syntax: infrastructureDynamicImports,
  });

const layerZones = [
  // Anything else under src/ (outside composition) still may not read env.
  zone({ files: [inSrc('')], ignores: [inSrc('composition')] }),
  ...coreZones,
  // The supabase folder re-declares the restrictions without the admin group
  // (a later entry replaces the earlier one).
  infrastructureZone(inSrc('infrastructure'), [
    ...infrastructurePatterns,
    adminClientGroup,
  ]),
  infrastructureZone(inSrc('infrastructure/supabase'), infrastructurePatterns),
  zone({
    files: [inSrc('app')],
    imports: { patterns: [noUpward('infrastructure'), appCompositionGroup] },
    syntax: appDynamicImports,
  }),
];

// A comment must not be able to switch the rules off.
const noInlineConfig = {
  files: [inSrc('')],
  linterOptions: { noInlineConfig: true },
};

// Keeps the CSP planned for Step 5 enforceable: no HTML injection, no inline
// styles (DESIGN §10). Zones above also carry the styleSpread selector.
const cspConfig = {
  files: ['**/*.{jsx,tsx}'],
  rules: {
    'react/no-danger': 'error',
    'react/forbid-dom-props': [
      'error',
      {
        forbid: [
          {
            propName: 'style',
            message: 'Inline styles break the CSP. Use Tailwind classes.',
          },
        ],
      },
    ],
    'react/forbid-elements': [
      'error',
      {
        forbid: [
          {
            element: 'style',
            message: 'Style elements break the CSP. Use the global stylesheet.',
          },
        ],
      },
    ],
    'no-restricted-syntax': ['error', styleSpread, ...arbitraryTokenClassNames],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: ['**/*.{ts,tsx,mts}'],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-ignore': true,
          'ts-nocheck': true,
          'ts-expect-error': 'allow-with-description',
        },
      ],
    },
  },
  {
    files: boundaryLayers,
    rules: {
      '@typescript-eslint/explicit-module-boundary-types': 'error',
    },
  },
  noInlineConfig,
  cspConfig,
  ...layerZones,
  globalIgnores([
    '.next/**',
    'coverage/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
