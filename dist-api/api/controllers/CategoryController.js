"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryController = void 0;
const CategoryService_1 = require("../services/CategoryService");
class CategoryController {
    constructor() {
        this.categoryService = new CategoryService_1.CategoryService();
    }
    // 获取所有分类
    async getCategories(_req, res) {
        try {
            const categories = await this.categoryService.getCategories();
            res.json(categories);
        }
        catch (error) {
            res.status(500).json({ error: '获取分类失败' });
        }
    }
    // 根据ID获取分类
    async getCategoryById(req, res) {
        try {
            const { id } = req.params;
            const category = await this.categoryService.getCategoryById(id);
            if (!category) {
                res.status(404).json({ error: '分类不存在' });
                return;
            }
            res.json(category);
        }
        catch (error) {
            res.status(500).json({ error: '获取分类失败' });
        }
    }
    // 创建分类
    async createCategory(req, res) {
        try {
            const { name, description } = req.body;
            const category = await this.categoryService.createCategory({ name, description });
            res.json(category);
        }
        catch (error) {
            res.status(400).json({ error: error.message || '创建分类失败' });
        }
    }
    // 更新分类
    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            const category = await this.categoryService.updateCategory(id, { name, description });
            res.json(category);
        }
        catch (error) {
            res.status(400).json({ error: error.message || '更新分类失败' });
        }
    }
    // 删除分类
    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const result = await this.categoryService.deleteCategory(id);
            res.json({ success: result });
        }
        catch (error) {
            res.status(400).json({ error: error.message || '删除分类失败' });
        }
    }
}
exports.CategoryController = CategoryController;
//# sourceMappingURL=CategoryController.js.map