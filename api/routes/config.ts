import express from 'express'
import { ConfigController } from '../controllers/ConfigController'

const router = express.Router()
const configController = new ConfigController()

// 获取配置
router.get('/', (req, res) => configController.getConfig(req, res))

// 保存配置
router.post('/', (req, res) => configController.saveConfig(req, res))
router.put('/', (req, res) => configController.saveConfig(req, res))

export { router as configRoutes }
