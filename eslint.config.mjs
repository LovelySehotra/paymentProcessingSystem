// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import eslintPluginPrettier from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'scripts/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: eslintPluginPrettier,
    },
    files: ['src/**/*.ts'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'semi': ['error', 'always'],
    //   'quotes': ['error', 'single', { allowTemplateLiterals: true }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
      '@typescript-eslint/no-namespace': 'off',
      'no-useless-escape': 'off',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  }
);