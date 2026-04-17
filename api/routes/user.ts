import express from 'express'
import { UserController } from '../controllers/UserController'

const router = express.Router()
const userController = new UserController()

// 获取用户资料
router.get('/profile', (req, res) => userController.getProfile(req, res))

// 更新用户资料
router.put('/profile', (req, res) => userController.updateProfile(req, res))

// 注册新用户
router.post('/register', (req, res) => userController.register(req, res))

// 用户登录
router.post('/login', (req, res) => userController.login(req, res))

export { router as userRoutes }
