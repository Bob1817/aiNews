import express from 'express'
import { AIController } from '../controllers/AIController'

const router = express.Router()
const aiController = new AIController()

// AI 对话
router.post('/chat', (req, res) => aiController.chat(req, res))

// AI 新闻创作
router.post('/compose', (req, res) => aiController.compose(req, res))

export { router as aiRoutes }
