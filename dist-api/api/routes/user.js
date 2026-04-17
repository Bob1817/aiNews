"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRoutes = void 0;
const express_1 = __importDefault(require("express"));
const UserController_1 = require("../controllers/UserController");
const router = express_1.default.Router();
exports.userRoutes = router;
const userController = new UserController_1.UserController();
// 获取用户资料
router.get('/profile', (req, res) => userController.getProfile(req, res));
// 更新用户资料
router.put('/profile', (req, res) => userController.updateProfile(req, res));
// 注册新用户
router.post('/register', (req, res) => userController.register(req, res));
// 用户登录
router.post('/login', (req, res) => userController.login(req, res));
