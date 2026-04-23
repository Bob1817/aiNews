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

// 下载已保存文件
router.get('/saved/:id/download', (req, res) => newsController.downloadSavedNewsFile(req, res))

// 读取/保存工作簿
router.get('/saved/:id/workbook', (req, res) => newsController.getSavedWorkbook(req, res))
router.put('/saved/:id/workbook', (req, res) => newsController.updateSavedWorkbook(req, res))

// 发布新闻
router.post('/publish/:id', (req, res) => newsController.publishNews(req, res))

// 删除新闻
router.delete('/saved/:id', (req, res) => newsController.deleteNews(req, res))

// 手动触发新闻更新
router.post('/update', (req, res) => newsController.updateNewsFeeds(req, res))

export { router as newsRoutes }
