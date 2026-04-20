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
  Chat: () => <h1>新建任务</h1>,
}))

jest.mock('../pages/Workflows', () => ({
  Workflows: () => <h1>工作流库</h1>,
}))

jest.mock('../pages/NewsList', () => ({
  NewsList: () => <h1>任务结果</h1>,
}))

jest.mock('../pages/Settings', () => ({
  Settings: () => <h1>设置</h1>,
}))

jest.mock('../pages/Config', () => ({
  Config: () => <h1>系统配置</h1>,
}))

jest.mock('../pages/History', () => ({
  History: () => <h1>任务历史</h1>,
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

    expect(screen.getByText('AI 助手')).toBeInTheDocument()
  })

  test('认证用户应该默认重定向到聊天页面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    render(<App />)

    expect(screen.getByRole('heading', { name: /新建任务/i })).toBeInTheDocument()
  })

  test('认证用户应该能够导航到不同页面', () => {
    (authService.isAuthenticated as jest.Mock).mockReturnValue(true)
    window.history.pushState({}, '', '/chat')
    render(<App />)

    fireEvent.click(screen.getByText('任务结果'))
    expect(screen.getByRole('heading', { name: /任务结果/i })).toBeInTheDocument()

    fireEvent.click(screen.getByText('任务历史'))
    expect(screen.getByRole('heading', { name: /任务历史/i })).toBeInTheDocument()

    fireEvent.click(screen.getByText('新建任务'))
    expect(screen.getByRole('heading', { name: /新建任务/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /设置/i }))
    fireEvent.click(screen.getByText('工作流库'))
    expect(screen.getByRole('heading', { name: /工作流库/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /设置/i }))
    fireEvent.click(screen.getByText('系统配置'))
    expect(screen.getByRole('heading', { name: /系统配置/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /设置/i }))
    fireEvent.click(screen.getByText('任务结果'))
    expect(screen.getByRole('heading', { name: /任务结果/i })).toBeInTheDocument()
  })
})
