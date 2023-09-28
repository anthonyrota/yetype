module.exports = {
  env: {
    browser: true,
    amd: true,
    node: true,
  },
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'prettier',
    'plugin:import/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/typescript',
  ],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      parserOptions: {
        project: ['./tsconfig.json'],
      },
    },
  ],
  ignorePatterns: ['*.html'],
  rules: {
    curly: 'error',
    'dot-notation': 'error',
    'max-len': ['warn', { code: 160, ignoreStrings: true }],
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-unused-vars': 'off',
    'no-else-return': ['error', { allowElseIf: false }],
    'no-warning-comments': 'warn',
    'no-fallthrough': 'off',
    'no-empty-function': 'off',
    eqeqeq: ['error', 'always', { null: 'ignore' }],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    '@typescript-eslint/no-empty-interface': ['warn', { allowSingleExtends: true }],
    '@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
    '@typescript-eslint/no-non-null-assertion': 'error',
    'import/no-unresolved': 'off',
    'import/order': [
      'error',
      {
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },
};
