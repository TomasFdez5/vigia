import path from 'node:path';

import { defineConfig } from 'vitest/config';

// Each glob needs its own perFile: globs do not inherit the top-level one.
const strict = {
  statements: 100,
  branches: 100,
  functions: 100,
  lines: 100,
  perFile: true,
};

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path in tsconfig.json so runtime imports resolve.
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: [
        'src/shared/**/*.ts',
        'src/domain/**/*.ts',
        'src/application/**/*.ts',
      ],
      exclude: ['**/*.test.ts', '**/*.d.ts', '**/index.ts'],
      thresholds: {
        'src/shared/**/*.ts': strict,
        'src/domain/**/*.ts': strict,
        'src/application/**/*.ts': { ...strict, branches: 95 },
      },
    },
  },
});
