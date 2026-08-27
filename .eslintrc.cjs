module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'next/typescript'],
  ignorePatterns: ['.next/', 'node_modules/', 'coverage/', 'phase*-evidence/', '.playwright-mcp/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': 'warn',
    '@next/next/no-img-element': 'warn',
    '@next/next/no-html-link-for-pages': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
    'import/no-anonymous-default-export': 'warn',
    'prefer-const': 'warn',
  },
};
