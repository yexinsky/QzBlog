/** @type {import('jest').Config} */
const config = {
  // 测试环境
  testEnvironment: 'jsdom',

  // 测试根目录
  roots: ['<rootDir>/tests'],

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js|jsx)',
    '**/?(*.)+(spec|test).+(ts|tsx|js|jsx)',
  ],

  // 转换器配置
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        },
      },
    ],
  },

  // 模块路径别名
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },

  // 转换忽略列表
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$',
  ],

  // 模拟模块
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // 测试覆盖率配置
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/types/**',
    '!**/node_modules/**',
  ],

  coverageDirectory: '<rootDir>/coverage',

  coverageReporters: ['text', 'lcov', 'clover', 'html'],

  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // 测试超时
  testTimeout: 10000,

  // 报告器
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: '<rootDir>/coverage',
      outputName: 'junit.xml',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' > ',
      usePathForSuiteName: true,
    }],
  ],

  // 全局设置
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // 清理模拟
  clearMocks: true,
  restoreMocks: true,
  resetMocks: true,

  // 并行测试
  maxWorkers: '50%',

  // 详细输出
  verbose: true,
};

module.exports = config;