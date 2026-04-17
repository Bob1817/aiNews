import { Request, Response } from 'express'
import { UserService } from '../services/UserService'

export class UserController {
  private userService: UserService

  constructor() {
    this.userService = new UserService()
  }

  // 获取用户资料
  async getProfile(req: Request, res: Response) {
    try {
      const { userId } = req.query
      const profile = await this.userService.getProfile(userId as string)
      res.json(profile)
    } catch (error) {
      res.status(500).json({ error: '获取用户资料失败' })
    }
  }

  // 更新用户资料
  async updateProfile(req: Request, res: Response) {
    try {
      const profile = await this.userService.updateProfile(req.body)
      res.json(profile)
    } catch (error) {
      res.status(500).json({ error: '更新用户资料失败' })
    }
  }

  // 注册新用户
  async register(req: Request, res: Response) {
    try {
      const { name, email, password } = req.body
      const result = await this.userService.register({ name, email, password })
      res.json(result)
    } catch (error: any) {
      res.status(400).json({ error: error.message || '注册失败' })
    }
  }

  // 用户登录
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body
      const result = await this.userService.login({ email, password })
      res.json(result)
    } catch (error: any) {
      res.status(401).json({ error: error.message || '登录失败' })
    }
  }
}
