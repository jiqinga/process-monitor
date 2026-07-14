import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src-tauri/**',
      'coverage/**',
      '*.config.js',
      '*.config.ts',
      'src/test/setup.ts',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
    },
  },

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      // TypeScript / safety
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-unsafe-function-type': 'warn',
      'no-unused-vars': 'off', // delegated to @typescript-eslint
      'no-undef': 'off', // TS handles this

      // Vue style
      'vue/multi-word-component-names': 'off',
      'vue/no-v-html': 'warn',
      'vue/component-name-in-template-casing': ['warn', 'PascalCase'],
      'vue/component-definition-name-casing': ['warn', 'PascalCase'],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
    },
  },

  {
    files: ['**/__tests__/**/*.{ts,vue}', '**/*.{test,spec}.{ts,vue}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },

  {
    // Rule-form sub-components intentionally share reactive form/state
    // proxies with their parent <RuleFormModal> and mutate them in place
    // (template v-model + nested-field assignment). Forbidding this would
    // force ceremony around per-field emit events without changing the
    // one-way ownership (parent owns state, children edit through the proxy).
    files: ['src/components/rule-form/**/*.vue'],
    rules: {
      'vue/no-mutating-props': 'off',
    },
  },

  prettier,
];
