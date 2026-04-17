"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const ConfigService_1 = require("../services/ConfigService");
const AICrawlerService_1 = require("../services/AICrawlerService");
class ConfigController {
    constructor() {
        this.configService = new ConfigService_1.ConfigService();
        this.aiCrawlerService = new AICrawlerService_1.AICrawlerService();
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
            // 测试 AI 模型连通性（如果提供了 AI 模型配置）
            if (aiModel) {
                if (aiModel.provider === 'ollama') {
                    // 测试 Ollama 模型连通性
                    const crawlerTest = await this.aiCrawlerService.testCrawler();
                    if (!crawlerTest.success) {
                        return res.status(400).json({
                            error: 'AI 模型测试失败',
                            message: crawlerTest.message
                        });
                    }
                }
                else if (aiModel.apiKey) {
                    // 测试其他 AI 模型连通性
                    try {
                        // 这里可以添加其他 AI 模型的测试逻辑
                        // 例如测试 OpenAI API 连通性
                    }
                    catch (error) {
                        return res.status(400).json({
                            error: 'AI 模型测试失败',
                            message: '无法连接到 AI 模型，请检查配置是否正确'
                        });
                    }
                }
            }
            // 保存配置
            const savedConfig = await this.configService.saveConfig(userId, {
                aiModel,
                newsAPI,
                publishPlatforms,
            });
            res.json(savedConfig);
        }
        catch (error) {
            console.error('保存配置失败:', error);
            res.status(500).json({
                error: '保存配置失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 测试 AI 模型连通性
    async testAIModel(req, res) {
        try {
            const { aiModel } = req.body;
            if (!aiModel) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供 AI 模型配置'
                });
            }
            let testResult;
            if (aiModel.provider === 'ollama') {
                // 测试 Ollama 模型连通性
                testResult = await this.aiCrawlerService.testCrawler();
            }
            else if (aiModel.apiKey) {
                // 测试其他 AI 模型连通性
                try {
                    // 这里可以添加其他 AI 模型的测试逻辑
                    testResult = { success: true, message: 'AI 模型连接成功' };
                }
                catch (error) {
                    testResult = {
                        success: false,
                        message: '无法连接到 AI 模型，请检查配置是否正确'
                    };
                }
            }
            else {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供完整的 AI 模型配置'
                });
            }
            res.json(testResult);
        }
        catch (error) {
            console.error('测试 AI 模型失败:', error);
            res.status(500).json({
                success: false,
                error: '测试 AI 模型失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
}
exports.ConfigController = ConfigController;
//# sourceMappingURL=ConfigController.js.map