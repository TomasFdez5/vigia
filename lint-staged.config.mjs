// Tasks of the pre-commit hook. The hook runs them one at a time
// so the secret scan never reads a file while Prettier rewrites it.
//
// Markdown is deliberately not formatted here: Prettier already flags
// documents that were not touched, so formatting `*.md` on commit would
// rewrite whole files in unrelated commits.
const config = {
  '*': 'secretlint --no-gitignore',
  '*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}': [
    'eslint --fix --max-warnings=0',
    'prettier --write',
  ],
  '*.{json,css,yml,yaml}': 'prettier --write',
};

export default config;
