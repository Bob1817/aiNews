import express from 'express'
import { ConfigController } from '../controllers/ConfigController'

const router = express.Router()
const configController = new ConfigController()

// 获取配置
router.get('/', (req, res) => configController.getConfig(req, res))
router.get('/active-model', (req, res) => configController.getActiveAIModel(req, res))
router.get('/workspace/asset', (req, res) => configController.getWorkspaceAsset(req, res))
router.post('/workspace/upload', (req, res) => configController.uploadWorkspaceAsset(req, res))

// 保存配置
router.post('/', (req, res) => configController.saveConfig(req, res))
router.put('/', (req, res) => configController.saveConfig(req, res))

// 测试 AI 模型连通性
router.post('/test-ai', (req, res) => configController.testAIModel(req, res))

// 切换 AI 模型
router.post('/switch-model', (req, res) => configController.switchAIModel(req, res))

// 删除 AI 模型
router.post('/delete-model', (req, res) => configController.deleteAIModel(req, res))

export { router as configRoutes }
