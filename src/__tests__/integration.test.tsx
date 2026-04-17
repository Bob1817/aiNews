import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../App'
import * as authService from '../lib/auth'

// 模拟 auth 模块
jest.mock('../lib/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  isAuthenticated: jest.fn(),
  subscribeToAuthChange: jest.fn(),
}))

describe('集成测试', () => {
  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks()
  })

  test('未认证用户应该被重定向到登录页面', () => {
    // 模拟未认证状态
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false)
    (authService.subscribeToAuthChange as jest.Mock).mockReturnValue(() => {})

    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )

    // 验证是否显示登录页面
    expect(screen.getByRole('heading', { name: /登录/i })).toBeInTheDocument()
  })

  test('认证用户应该看到主应用界面', () => {
    // 模拟认证状态
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    (authService.subscribeToAuthChange as jest.Mock).mockReturnValue(() => {})

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    // 验证是否显示侧边栏（主应用界面的标志）
    expect(screen.getByRole('navigation')).toBeInTheDocument()
  })

  test('认证用户应该默认重定向到聊天页面', () => {
    // 模拟认证状态
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    (authService.subscribeToAuthChange as jest.Mock).mockReturnValue(() => {})

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    // 验证是否在聊天页面
    expect(screen.getByRole('heading', { name: /AI 聊天/i })).toBeInTheDocument()
  })

  test('认证用户应该能够导航到不同页面', () => {
    // 模拟认证状态
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    (authService.subscribeToAuthChange as jest.Mock).mockReturnValue(() => {})

    render(
      <MemoryRouter initialEntries={['/chat']}>
        <App />
      </MemoryRouter>
    )

    // 导航到新闻页面
    fireEvent.click(screen.getByText(/新闻/i))
    expect(screen.getByRole('heading', { name: /新闻列表/i })).toBeInTheDocument()

    // 导航到设置页面
    fireEvent.click(screen.getByText(/设置/i))
    expect(screen.getByRole('heading', { name: /设置/i })).toBeInTheDocument()

    // 导航到配置页面
    fireEvent.click(screen.getByText(/配置/i))
    expect(screen.getByRole('heading', { name: /系统配置/i })).toBeInTheDocument()

    // 导航回聊天页面
    fireEvent.click(screen.getByText(/聊天/i))
    expect(screen.getByRole('heading', { name: /AI 聊天/i })).toBeInTheDocument()
  })
})
