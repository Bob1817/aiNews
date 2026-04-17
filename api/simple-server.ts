import express from 'express'
import { ConfigController } from './controllers/ConfigController'

const app = express()
const PORT = 3001

// 基础中间件
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 配置控制器
const configController = new ConfigController()

// 配置路由
app.get('/api/config', (req, res) => configController.getConfig(req, res))
app.post('/api/config', (req, res) => configController.saveConfig(req, res))
app.put('/api/config', (req, res) => configController.saveConfig(req, res))
app.post('/api/config/test-ai', (req, res) => configController.testAIModel(req, res))

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  })
})

// 404 处理
app.use('*', (_req, res) => {
  res.status(404).json({
    error: '未找到资源',
    message: '请求的 API 端点不存在',
    path: _req.originalUrl,
    timestamp: new Date().toISOString(),
  })
})

// 错误处理中间件
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('错误:', err)
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message || '未知错误',
    timestamp: new Date().toISOString(),
  })
})

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 AI News API 服务器启动成功')
  console.log('=' .repeat(50))
  console.log(`端口: ${PORT}`)
  console.log(`环境: development`)
  console.log(`地址: http://localhost:${PORT}`)
  console.log('=' .repeat(50))
  console.log('可用端点:')
  console.log('- GET /api/health - 健康检查')
  console.log('- GET /api/config - 获取配置')
  console.log('- POST /api/config - 保存配置')
  console.log('- POST /api/config/test-ai - 测试AI模型连接')
  console.log('=' .repeat(50))
})
