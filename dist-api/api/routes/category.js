"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryRoutes = void 0;
const express_1 = __importDefault(require("express"));
const CategoryController_1 = require("../controllers/CategoryController");
const router = express_1.default.Router();
exports.categoryRoutes = router;
const categoryController = new CategoryController_1.CategoryController();
// 获取所有分类
router.get('/', (req, res) => categoryController.getCategories(req, res));
// 根据ID获取分类
router.get('/:id', (req, res) => categoryController.getCategoryById(req, res));
// 创建分类
router.post('/', (req, res) => categoryController.createCategory(req, res));
// 更新分类
router.put('/:id', (req, res) => categoryController.updateCategory(req, res));
// 删除分类
router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res));
