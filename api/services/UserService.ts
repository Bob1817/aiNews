import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { User, UserProfile } from '../../shared/types'
import { UserRepository } from '../repositories/UserRepository'

export class UserService {
  private static users: User[] = []
  private static userProfiles: UserProfile[] = []
  private userRepository: UserRepository
  private useDatabase: boolean

  constructor() {
    this.userRepository = new UserRepository()
    this.useDatabase = false // 默认使用模拟数据，数据库连接成功后可以切换
    // 初始化一些模拟数据
    if (UserService.users.length === 0 && UserService.userProfiles.length === 0) {
      this.initializeMockData()
    }
  }

  private initializeMockData() {
    // 初始化用户数据
    UserService.users = [
      {
        id: '1',
        name: '测试用户',
        email: 'test@example.com',
        password: this.hashPassword('123456'),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]

    // 初始化用户资料数据
    UserService.userProfiles = [
      {
        id: '1',
        userId: '1',
        industries: ['科技', '医疗', '汽车', '新能源'],
        keywords: ['人工智能', '医疗诊断', '新能源汽车', '云计算', '数字化转型'],
        isOnboardingComplete: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ]
  }

  // 获取用户资料
  async getProfile(userId: string): Promise<UserProfile> {
    if (this.useDatabase) {
      const profile = await this.userRepository.getProfile(userId)
      if (profile) {
        return profile
      }
    }

    // 使用模拟数据
    const profile = UserService.userProfiles.find((p) => p.userId === userId)
    if (profile) {
      return profile
    }

    // 如果用户不存在，创建一个新的
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      userId,
      industries: [],
      keywords: [],
      isOnboardingComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    UserService.userProfiles.push(newProfile)
    return newProfile
  }

  // 更新用户资料
  async updateProfile(data: {
    userId: string
    industries?: string[]
    keywords?: string[]
    isOnboardingComplete?: boolean
  }): Promise<UserProfile> {
    if (this.useDatabase) {
      const profile = await this.userRepository.updateProfile(data.userId, data)
      if (profile) {
        return profile
      }
    }

    // 使用模拟数据
    const profile = UserService.userProfiles.find((p) => p.userId === data.userId)
    if (!profile) {
      throw new Error('用户不存在')
    }

    if (data.industries !== undefined) profile.industries = data.industries
    if (data.keywords !== undefined) profile.keywords = data.keywords
    if (data.isOnboardingComplete !== undefined) profile.isOnboardingComplete = data.isOnboardingComplete
    profile.updatedAt = new Date().toISOString()

    return profile
  }

  // 根据邮箱获取用户
  async getUserByEmail(email: string): Promise<User | null> {
    return UserService.users.find((user) => user.email === email) || null
  }

  private hashPassword(password: string): string {
    const salt = randomBytes(16).toString('hex')
    const derivedKey = scryptSync(password, salt, 64).toString('hex')
    return `${salt}:${derivedKey}`
  }

  private verifyPassword(password: string, storedPassword?: string): boolean {
    if (!storedPassword) {
      return false
    }

    const [salt, storedHash] = storedPassword.split(':')
    if (!salt || !storedHash) {
      return false
    }

    const derivedKey = scryptSync(password, salt, 64)
    const storedBuffer = Buffer.from(storedHash, 'hex')

    if (derivedKey.length !== storedBuffer.length) {
      return false
    }

    return timingSafeEqual(derivedKey, storedBuffer)
  }

  private toSafeUser(user: User): User {
    const safeUser = { ...user }
    delete safeUser.password
    return safeUser
  }

  // 注册新用户
  async register(data: {
    name: string
    email: string
    password: string
  }): Promise<{ user: User; profile: UserProfile }> {
    // 检查邮箱是否已存在
    const existingUser = await this.getUserByEmail(data.email)
    if (existingUser) {
      throw new Error('邮箱已被注册')
    }

    // 创建新用户
    const newUser: User = {
      id: Date.now().toString(),
      name: data.name,
      email: data.email,
      password: this.hashPassword(data.password),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    UserService.users.push(newUser)

    // 创建用户资料
    const newProfile: UserProfile = {
      id: Date.now().toString(),
      userId: newUser.id,
      industries: [],
      keywords: [],
      isOnboardingComplete: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    UserService.userProfiles.push(newProfile)

    return { user: this.toSafeUser(newUser), profile: newProfile }
  }

  // 用户登录
  async login(data: {
    email: string
    password: string
  }): Promise<{ user: User; profile: UserProfile }> {
    // 查找用户
    const user = await this.getUserByEmail(data.email)
    if (!user) {
      throw new Error('用户不存在')
    }

    // 验证密码
    if (!this.verifyPassword(data.password, user.password)) {
      throw new Error('密码错误')
    }

    // 获取用户资料
    const profile = await this.getProfile(user.id)

    return { user: this.toSafeUser(user), profile }
  }
}
