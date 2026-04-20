import type { Config } from 'jest'

const config: Config = {
  // 测试环境
  testEnvironment: 'jsdom',

  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)'
  ],

  // 忽略的测试路径
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/dist-api/',
    '/dist-electron/'
  ],

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // 模块名称映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@api/(.*)$': '<rootDir>/api/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js'
  },

  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  },

  // 测试覆盖率配置
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'api/**/*.{ts,tsx}',
    'shared/**/*.{ts,tsx}',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/dist-api/**',
    '!**/dist-electron/**',
    '!**/__tests__/**',
    '!**/*.d.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // 测试前执行的脚本
  setupFilesAfterEnv: [
    '<rootDir>/jest.setup.ts'
  ],

  // 测试超时时间
  testTimeout: 10000,

  // 清除 mock
  clearMocks: true,

  // 重置模块
  resetModules: true,

  // 恢复 mock
  restoreMocks: true,

  // 显示测试结果
  verbose: true,

  // 测试运行器
  runner: 'jest-runner',

  // 测试位置
  roots: ['<rootDir>/src', '<rootDir>/api', '<rootDir>/shared']
}

export default config
