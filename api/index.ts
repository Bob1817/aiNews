import express from 'express'
import cors from 'cors'
import { newsRoutes } from './routes/news'
import { aiRoutes } from './routes/ai'
import { userRoutes } from './routes/user'
import { configRoutes } from './routes/config'
import { categoryRoutes } from './routes/category'
import { ScheduledService } from './services/ScheduledService'

const app = express()
const PORT = process.env.PORT || 3001

// 中间件
app.use(cors())
app.use(express.json())

// 路由
app.use('/api/news', newsRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/user', userRoutes)
app.use('/api/config', configRoutes)
app.use('/api/categories', categoryRoutes)

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// 初始化定时任务服务
new ScheduledService()

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

export default app
