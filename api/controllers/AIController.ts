import { Request, Response } from 'express'
import { AIService } from '../services/AIService'

export class AIController {
  private aiService: AIService

  constructor() {
    this.aiService = new AIService()
  }

  // AI 对话
  async chat(req: Request, res: Response) {
    try {
      const { userId, message, referencedNewsId, history } = req.body
      const response = await this.aiService.chat(userId, message, referencedNewsId, history)
      res.json(response)
    } catch (error) {
      res.status(500).json({ error: 'AI 对话失败' })
    }
  }

  // AI 新闻创作
  async compose(req: Request, res: Response) {
    try {
      const { userId, prompt, referencedNewsIds } = req.body
      const response = await this.aiService.compose(userId, prompt, referencedNewsIds)
      res.json(response)
    } catch (error) {
      res.status(500).json({ error: 'AI 创作失败' })
    }
  }
}
