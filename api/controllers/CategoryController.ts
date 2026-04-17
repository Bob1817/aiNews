import { Request, Response } from 'express'
import { CategoryService } from '../services/CategoryService'

export class CategoryController {
  private categoryService: CategoryService

  constructor() {
    this.categoryService = new CategoryService()
  }

  // 获取所有分类
  async getCategories(_req: Request, res: Response) {
    try {
      const categories = await this.categoryService.getCategories()
      res.json(categories)
    } catch (error) {
      res.status(500).json({ error: '获取分类失败' })
    }
  }

  // 根据ID获取分类
  async getCategoryById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const category = await this.categoryService.getCategoryById(id)
      if (!category) {
        res.status(404).json({ error: '分类不存在' })
        return
      }
      res.json(category)
    } catch (error) {
      res.status(500).json({ error: '获取分类失败' })
    }
  }

  // 创建分类
  async createCategory(req: Request, res: Response) {
    try {
      const { name, description } = req.body
      const category = await this.categoryService.createCategory({ name, description })
      res.json(category)
    } catch (error: any) {
      res.status(400).json({ error: error.message || '创建分类失败' })
    }
  }

  // 更新分类
  async updateCategory(req: Request, res: Response) {
    try {
      const { id } = req.params
      const { name, description } = req.body
      const category = await this.categoryService.updateCategory(id, { name, description })
      res.json(category)
    } catch (error: any) {
      res.status(400).json({ error: error.message || '更新分类失败' })
    }
  }

  // 删除分类
  async deleteCategory(req: Request, res: Response) {
    try {
      const { id } = req.params
      const result = await this.categoryService.deleteCategory(id)
      res.json({ success: result })
    } catch (error: any) {
      res.status(400).json({ error: error.message || '删除分类失败' })
    }
  }
}
