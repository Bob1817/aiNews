import express from 'express'
import { NewsController } from '../controllers/NewsController'

const router = express.Router()
const newsController = new NewsController()

// 获取最近新闻
router.get('/recent', (req, res) => newsController.getRecentNews(req, res))

// 获取保存的新闻
router.get('/saved', (req, res) => newsController.getSavedNews(req, res))

// 保存新闻
router.post('/saved', (req, res) => newsController.saveNews(req, res))

// 更新新闻
router.put('/saved/:id', (req, res) => newsController.updateNews(req, res))

// 发布新闻
router.post('/publish/:id', (req, res) => newsController.publishNews(req, res))

// 删除新闻
router.delete('/saved/:id', (req, res) => newsController.deleteNews(req, res))

// 手动触发新闻更新
router.post('/update', (req, res) => newsController.updateNewsFeeds(req, res))

// 测试新闻API连接
router.post('/test-api', (req, res) => newsController.testNewsAPI(req, res))

export { router as newsRoutes }
