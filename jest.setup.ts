// Jest 全局设置文件
import '@testing-library/jest-dom'

// 全局测试配置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test'
  process.env.JWT_SECRET = 'test-secret-key-for-jest-tests-only'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_ainews'
  process.env.API_BASE_URL = 'http://localhost:3001'
  process.env.VITE_API_BASE_URL = 'http://localhost:3001'
})

// 全局 afterAll 钩子
afterAll(() => {
  // 清理测试环境
  jest.clearAllMocks()
})

// 全局 beforeEach 钩子
beforeEach(() => {
  // 重置所有 mock
  jest.resetAllMocks()

  // 清除所有定时器
  jest.clearAllTimers()
})

// 自定义匹配器
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },
})

// 全局类型扩展
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R
    }
  }
}

// 模拟 console 方法
const originalConsole = { ...console }
const mockConsole = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}

// 在测试中替换 console
beforeEach(() => {
  Object.assign(console, mockConsole)
})

afterEach(() => {
  Object.assign(console, originalConsole)
})

// 模拟 fetch
global.fetch = jest.fn()

// 模拟 localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.localStorage = localStorageMock as any

// 模拟 sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
global.sessionStorage = sessionStorageMock as any

// 模拟 matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// 模拟 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// 模拟 IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(),
}))

// 导出测试工具
export const testUtils = {
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockFetchResponse: (data: any, status: number = 200, ok: boolean = true) => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    })
  },
  mockFetchError: (error: Error) => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(error)
  },
  clearMocks: () => {
    jest.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
  },
}