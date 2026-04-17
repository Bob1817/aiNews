"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const ConfigService_1 = require("../services/ConfigService");
class ConfigController {
    constructor() {
        Object.defineProperty(this, "configService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.configService = new ConfigService_1.ConfigService();
    }
    // 获取配置
    async getConfig(req, res) {
        try {
            const { userId } = req.query;
            const config = await this.configService.getConfig(userId);
            res.json(config);
        }
        catch (error) {
            res.status(500).json({ error: '获取配置失败' });
        }
    }
    // 保存配置
    async saveConfig(req, res) {
        try {
            const { userId, aiModel, newsAPI, publishPlatforms } = req.body;
            const savedConfig = await this.configService.saveConfig(userId, {
                aiModel,
                newsAPI,
                publishPlatforms,
            });
            res.json(savedConfig);
        }
        catch (error) {
            res.status(500).json({ error: '保存配置失败' });
        }
    }
}
exports.ConfigController = ConfigController;
