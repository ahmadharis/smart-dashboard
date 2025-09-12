import { FlatCompat } from '@eslint/eslintrc';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default eslintConfig;