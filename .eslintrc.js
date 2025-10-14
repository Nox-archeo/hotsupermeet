module.exports = {
  env: {
    browser: true,
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // Règles de base
    'no-unused-vars': 'warn',
    'no-console': 'warn',
    'no-debugger': 'error',

    // Style de code
    indent: ['error', 2],
    quotes: ['error', 'single'],
    semi: ['error', 'always'],

    // Bonnes pratiques
    eqeqeq: 'error',
    curly: 'error',
    'no-multiple-empty-lines': ['error', { max: 1 }],
  },
  globals: {
    // Variables globales spécifiques au projet
    process: 'readonly',
    io: 'readonly',
  },
};
