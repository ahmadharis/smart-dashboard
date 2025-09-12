const { FlatCompat } = require('@eslint/eslintrc');
const path = require('path');

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend Next.js ESLint configuration
  ...compat.extends('next/core-web-vitals'),
  
  {
    // Apply to all JavaScript/TypeScript files
    files: ['**/*.{js,jsx,ts,tsx}'],
    
    rules: {
      'no-unused-vars': 'off',
      'no-console': 'off',
      'prefer-const': 'error',
      'react/no-unescaped-entities': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      'import/no-anonymous-default-export': 'off',
    },
  },
  
  {
    // Ignore patterns
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      '__tests__/**',
      'coverage/**',
      'jest.setup.js',
      'jest.config.js',
      'playwright.config.js',
      'test-phase1.js',
    ],
  },
];

module.exports = eslintConfig;