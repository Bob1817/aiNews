import express from 'express'
import { env } from '../shared/config/index'

import { newsRoutes } from './routes/news'
import { aiRoutes } from './routes/ai'
import { userRoutes } from './routes/user'
import { configRoutes } from './routes/config'
import { categoryRoutes } from './routes/category'
import { ScheduledService } from './services/ScheduledService'

const app = express()
const PORT = env.PORT

// 基础中间件
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 路由
app.use('/api/news', newsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/user', userRoutes)
app.use('/api/config', configRoutes)
app.use('/api/categories', categoryRoutes)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: env.NODE_ENV
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

// 初始化定时任务服务
new ScheduledService()

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 AI News API 服务器启动成功')
  console.log('=' .repeat(50))
  console.log(`端口: ${PORT}`)
  console.log(`环境: ${env.NODE_ENV}`)
  console.log(`地址: http://${env.HOST}:${PORT}`)
  console.log('=' .repeat(50))
})

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error)
  // 这里可以添加错误上报逻辑
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的 Promise 拒绝:', { reason, promise })
  // 这里可以添加错误上报逻辑
})

export default app
