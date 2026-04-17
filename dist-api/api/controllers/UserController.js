"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const UserService_1 = require("../services/UserService");
class UserController {
    constructor() {
        this.userService = new UserService_1.UserService();
    }
    // 获取用户资料
    async getProfile(req, res) {
        try {
            const { userId } = req.query;
            const profile = await this.userService.getProfile(userId);
            res.json(profile);
        }
        catch (error) {
            res.status(500).json({ error: '获取用户资料失败' });
        }
    }
    // 更新用户资料
    async updateProfile(req, res) {
        try {
            const profile = await this.userService.updateProfile(req.body);
            res.json(profile);
        }
        catch (error) {
            res.status(500).json({ error: '更新用户资料失败' });
        }
    }
    // 注册新用户
    async register(req, res) {
        try {
            const { name, email, password } = req.body;
            const result = await this.userService.register({ name, email, password });
            res.json(result);
        }
        catch (error) {
            res.status(400).json({ error: error.message || '注册失败' });
        }
    }
    // 用户登录
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await this.userService.login({ email, password });
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: error.message || '登录失败' });
        }
    }
}
exports.UserController = UserController;
//# sourceMappingURL=UserController.js.map