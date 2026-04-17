import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../pages/Login'
import { Register } from '../pages/Register'
import * as authService from '../lib/auth'

// 模拟 auth 模块
jest.mock('../lib/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  isAuthenticated: jest.fn(),
  subscribeToAuthChange: jest.fn(),
}))

describe('认证功能测试', () => {
  describe('登录页面', () => {
    test('应该显示登录表单', () => {
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      )
      
      expect(screen.getByRole('heading', { name: /登录/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入邮箱')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
      expect(screen.getByText(/注册账号/i)).toBeInTheDocument()
    })

    test('应该处理表单提交', async () => {
      const mockLogin = authService.login as jest.Mock
      mockLogin.mockResolvedValue({ success: true })
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      )
      
      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      })
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))
      
      // 验证登录函数被调用
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    test('应该显示登录错误', async () => {
      const mockLogin = authService.login as jest.Mock
      mockLogin.mockRejectedValue({ message: '邮箱或密码错误' })
      
      render(
        <MemoryRouter>
          <Login />
        </MemoryRouter>
      )
      
      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'test@example.com' },
      })
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'wrongpassword' },
      })
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /登录/i }))
      
      // 验证错误消息显示
      await waitFor(() => {
        expect(screen.getByText('邮箱或密码错误')).toBeInTheDocument()
      })
    })
  })

  describe('注册页面', () => {
    test('应该显示注册表单', () => {
      render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      )
      
      expect(screen.getByRole('heading', { name: /注册/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入邮箱')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请输入密码')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('请再次输入密码')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /注册/i })).toBeInTheDocument()
      expect(screen.getByText(/登录账号/i)).toBeInTheDocument()
    })

    test('应该处理表单提交', async () => {
      const mockRegister = authService.register as jest.Mock
      mockRegister.mockResolvedValue({ success: true })
      
      render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      )
      
      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'newuser@example.com' },
      })
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), {
        target: { value: 'password123' },
      })
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /注册/i }))
      
      // 验证注册函数被调用
      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('newuser@example.com', 'password123')
      })
    })

    test('应该显示密码不匹配错误', async () => {
      render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      )
      
      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'newuser@example.com' },
      })
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), {
        target: { value: 'differentpassword' },
      })
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /注册/i }))
      
      // 验证错误消息显示
      await waitFor(() => {
        expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument()
      })
    })

    test('应该显示注册错误', async () => {
      const mockRegister = authService.register as jest.Mock
      mockRegister.mockRejectedValue({ message: '邮箱已被注册' })
      
      render(
        <MemoryRouter>
          <Register />
        </MemoryRouter>
      )
      
      // 填写表单
      fireEvent.change(screen.getByPlaceholderText('请输入邮箱'), {
        target: { value: 'existing@example.com' },
      })
      fireEvent.change(screen.getByPlaceholderText('请输入密码'), {
        target: { value: 'password123' },
      })
      fireEvent.change(screen.getByPlaceholderText('请再次输入密码'), {
        target: { value: 'password123' },
      })
      
      // 提交表单
      fireEvent.click(screen.getByRole('button', { name: /注册/i }))
      
      // 验证错误消息显示
      await waitFor(() => {
        expect(screen.getByText('邮箱已被注册')).toBeInTheDocument()
      })
    })
  })
})
