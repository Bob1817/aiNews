import express from 'express'
import { CategoryController } from '../controllers/CategoryController'

const router = express.Router()
const categoryController = new CategoryController()

// 获取所有分类
router.get('/', (req, res) => categoryController.getCategories(req, res))

// 根据ID获取分类
router.get('/:id', (req, res) => categoryController.getCategoryById(req, res))

// 创建分类
router.post('/', (req, res) => categoryController.createCategory(req, res))

// 更新分类
router.put('/:id', (req, res) => categoryController.updateCategory(req, res))

// 删除分类
router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res))

export { router as categoryRoutes }
