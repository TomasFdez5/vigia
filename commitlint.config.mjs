// Conventional types unchanged; header limited to 72 characters; scope free
// and optional.
const config = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 72],
  },
};

export default config;
