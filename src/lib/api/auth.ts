import type { User, UserProfile } from '@/types'

interface AuthResponse {
  user: User
  profile: UserProfile
}

export function login(payload: { email: string; password: string }) {
  // 返回模拟数据，让用户可以成功登录
  return Promise.resolve({
    user: {
      id: '1',
      email: payload.email,
      name: '测试用户'
    },
    profile: {
      id: '1',
      userId: '1',
      name: '测试用户',
      avatar: '',
      bio: '',
      keywords: ['人工智能', '科技', '财经'],
      industries: ['科技', '财经'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}

export function register(payload: { name: string; email: string; password: string }) {
  // 返回模拟数据，让用户可以成功注册
  return Promise.resolve({
    user: {
      id: '1',
      email: payload.email,
      name: payload.name
    },
    profile: {
      id: '1',
      userId: '1',
      name: payload.name,
      avatar: '',
      bio: '',
      keywords: ['人工智能', '科技', '财经'],
      industries: ['科技', '财经'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  })
}
