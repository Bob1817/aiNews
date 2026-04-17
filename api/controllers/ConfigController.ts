import { Request, Response } from 'express'
import { ConfigService } from '../services/ConfigService'

export class ConfigController {
  private configService: ConfigService

  constructor() {
    this.configService = new ConfigService()
  }

  // 获取配置
  async getConfig(req: Request, res: Response) {
    try {
      const { userId } = req.query
      const config = await this.configService.getConfig(userId as string)
      res.json(config)
    } catch (error) {
      res.status(500).json({ error: '获取配置失败' })
    }
  }

  // 保存配置
  async saveConfig(req: Request, res: Response) {
    try {
      const { userId, aiModel, newsAPI, publishPlatforms } = req.body
      const savedConfig = await this.configService.saveConfig(userId, {
        aiModel,
        newsAPI,
        publishPlatforms,
      })
      res.json(savedConfig)
    } catch (error) {
      res.status(500).json({ error: '保存配置失败' })
    }
  }
}
