// @ts-check
const eslint = require('@eslint/js');
const { defineConfig, globalIgnores } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  // Generated from openapi.json by `npm run api:generate`: never hand-edited.
  globalIgnores(['src/app/api/**']),
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: 'app',
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-signals': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {
      '@angular-eslint/template/prefer-control-flow': 'error',
      // UI copy must come from assets/i18n/*.json, never from the template.
      '@angular-eslint/template/i18n': [
        'error',
        {
          checkId: false,
          checkText: true,
          checkAttributes: false,
          // Ligature icon names and the static brand <title>, not copy.
          ignoreTags: ['mat-icon', 'title'],
        },
      ],
    },
  },
  {
    // Inline templates of test host components (virtual files under the .spec.ts) aren't UI.
    files: ['**/*.spec.ts/**/*.html'],
    rules: { '@angular-eslint/template/i18n': 'off' },
  },
]);
