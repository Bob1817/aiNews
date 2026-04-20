import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import * as authService from '../lib/auth'

jest.mock('../lib/auth', () => ({
  isAuthenticated: jest.fn(),
  subscribeToAuthChange: jest.fn(),
  clearAuthSession: jest.fn(),
}))

jest.mock('../pages/Login', () => ({
  Login: () => <h1>登录</h1>,
}))

jest.mock('../pages/Register', () => ({
  Register: () => <h1>注册</h1>,
}))

jest.mock('../pages/Chat', () => ({
  Chat: () => <h1>对话创作</h1>,
}))

jest.mock('../pages/NewsList', () => ({
  NewsList: () => <h1>新闻管理</h1>,
}))

jest.mock('../pages/Settings', () => ({
  Settings: () => <h1>设置</h1>,
}))

jest.mock('../pages/Config', () => ({
  Config: () => <h1>系统配置</h1>,
}))

jest.mock('../pages/NewsEdit', () => ({
  NewsEdit: () => <h1>新闻编辑</h1>,
}))

describe('集成测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    window.history.pushState({}, '', '/')
    ;(authService.subscribeToAuthChange as jest.Mock).mockReturnValue(() => {})
  })

  test('未认证用户应该被重定向到登录页面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(false)
    render(<App />)

    expect(screen.getByRole('heading', { name: /登录/i })).toBeInTheDocument()
  })

  test('认证用户应该看到主应用界面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    render(<App />)

    expect(screen.getByText('AI 新闻助手')).toBeInTheDocument()
  })

  test('认证用户应该默认重定向到聊天页面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    render(<App />)

    expect(screen.getByRole('heading', { name: /对话创作/i })).toBeInTheDocument()
  })

  test('认证用户应该能够导航到不同页面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    window.history.pushState({}, '', '/chat')
    render(<App />)

    fireEvent.click(screen.getByText('新闻管理'))
    expect(screen.getByRole('heading', { name: /新闻管理/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /设置/i }))
    fireEvent.click(screen.getByText('用户设置'))
    expect(screen.getByRole('heading', { name: /^设置$/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /设置/i }))
    fireEvent.click(screen.getByText('系统配置'))
    expect(screen.getByRole('heading', { name: /系统配置/i })).toBeInTheDocument()

    fireEvent.click(screen.getByText('对话创作'))
    expect(screen.getByRole('heading', { name: /对话创作/i })).toBeInTheDocument()
  })
})
