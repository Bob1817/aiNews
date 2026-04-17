"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
class CategoryService {
    constructor() {
        // 初始化一些模拟数据
        if (CategoryService.categories.length === 0) {
            this.initializeMockData();
        }
    }
    initializeMockData() {
        CategoryService.categories = [
            {
                id: '1',
                name: '科技',
                description: '科技相关新闻',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '2',
                name: '医疗',
                description: '医疗健康相关新闻',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '3',
                name: '汽车',
                description: '汽车行业相关新闻',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '4',
                name: '新能源',
                description: '新能源相关新闻',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '5',
                name: '云计算',
                description: '云计算相关新闻',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
        ];
    }
    // 获取所有分类
    async getCategories() {
        return CategoryService.categories;
    }
    // 根据ID获取分类
    async getCategoryById(id) {
        return CategoryService.categories.find((category) => category.id === id) || null;
    }
    // 创建分类
    async createCategory(data) {
        const newCategory = {
            id: Date.now().toString(),
            name: data.name,
            description: data.description,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        CategoryService.categories.push(newCategory);
        return newCategory;
    }
    // 更新分类
    async updateCategory(id, data) {
        const category = CategoryService.categories.find((c) => c.id === id);
        if (!category) {
            throw new Error('分类不存在');
        }
        if (data.name !== undefined)
            category.name = data.name;
        if (data.description !== undefined)
            category.description = data.description;
        category.updatedAt = new Date().toISOString();
        return category;
    }
    // 删除分类
    async deleteCategory(id) {
        const index = CategoryService.categories.findIndex((c) => c.id === id);
        if (index === -1) {
            throw new Error('分类不存在');
        }
        CategoryService.categories.splice(index, 1);
        return true;
    }
}
exports.CategoryService = CategoryService;
CategoryService.categories = [];
//# sourceMappingURL=CategoryService.js.map