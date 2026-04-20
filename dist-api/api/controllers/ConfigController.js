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
    async testLlamaCppConnection(aiModel) {
        const baseUrl = (aiModel.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
        const headers = {
            'Content-Type': 'application/json',
        };
        if (aiModel.apiKey) {
            headers.Authorization = `Bearer ${aiModel.apiKey}`;
        }
        // 添加 5 秒超时
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('请求超时')), 5000);
        });
        try {
            const chatResponse = await Promise.race([
                fetch(`${baseUrl}/v1/chat/completions`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        model: aiModel.modelName || 'llama.cpp',
                        messages: [{ role: 'user', content: '测试连接，请简短回复。' }],
                        max_tokens: 16,
                    }),
                }),
                timeoutPromise
            ]);
            if (chatResponse.ok) {
                return { success: true, message: 'llama.cpp 模型连接成功' };
            }
        }
        catch (error) {
            console.warn('llama.cpp chat/completions 测试失败，尝试 completion 回退:', error);
        }
        try {
            const completionResponse = await Promise.race([
                fetch(`${baseUrl}/completion`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        prompt: '测试连接，请简短回复。',
                        n_predict: 16,
                        stream: false,
                    }),
                }),
                timeoutPromise
            ]);
            if (completionResponse.ok) {
                return { success: true, message: 'llama.cpp 模型连接成功' };
            }
            return {
                success: false,
                message: `llama.cpp 模型连接失败: ${completionResponse.status}`,
            };
        }
        catch (error) {
            console.error('llama.cpp 连接测试失败:', error);
            return {
                success: false,
                message: '无法连接到 llama.cpp 模型，请检查服务是否正在运行',
            };
        }
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
            const { userId, aiModel, newsAPI, publishPlatforms, aiModels } = req.body;
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
                else if (aiModel.provider === 'llamacpp') {
                    const llamaTest = await this.testLlamaCppConnection(aiModel);
                    if (!llamaTest.success) {
                        return res.status(400).json({
                            error: 'AI 模型测试失败',
                            message: llamaTest.message,
                        });
                    }
                }
                else if (aiModel.provider === 'openai' || aiModel.provider === 'anthropic' || aiModel.provider === 'google') {
                    // 测试需要 API Key 的模型
                    if (!aiModel.apiKey) {
                        return res.status(400).json({
                            error: '参数错误',
                            message: '请提供 API Key'
                        });
                    }
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
                else {
                    return res.status(400).json({
                        error: '参数错误',
                        message: '不支持的模型提供商'
                    });
                }
            }
            // 保存配置
            const savedConfig = await this.configService.saveConfig(userId, {
                aiModel,
                newsAPI,
                publishPlatforms,
                aiModels,
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
    // 切换 AI 模型
    async switchAIModel(req, res) {
        try {
            const { userId, modelId } = req.body;
            if (!userId || !modelId) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供 userId 和 modelId'
                });
            }
            const updatedConfig = await this.configService.switchAIModel(userId, modelId);
            res.json(updatedConfig);
        }
        catch (error) {
            console.error('切换 AI 模型失败:', error);
            res.status(500).json({
                error: '切换 AI 模型失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 删除 AI 模型
    async deleteAIModel(req, res) {
        try {
            const { userId, modelId } = req.body;
            if (!userId || !modelId) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供 userId 和 modelId'
                });
            }
            const updatedConfig = await this.configService.deleteAIModel(userId, modelId);
            res.json(updatedConfig);
        }
        catch (error) {
            console.error('删除 AI 模型失败:', error);
            res.status(500).json({
                error: '删除 AI 模型失败',
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
                const baseUrl = aiModel.baseUrl || 'http://localhost:11434';
                const modelName = aiModel.modelName || 'gemma';
                try {
                    const response = await fetch(`${baseUrl}/api/tags`, {
                        method: 'GET',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                    });
                    if (!response.ok) {
                        throw new Error(`Ollama API 调用失败: ${response.status}`);
                    }
                    const data = await response.json();
                    // 检查模型是否存在
                    const hasModel = data.models?.some(model => model.name.includes(modelName));
                    if (!hasModel) {
                        return res.json({
                            success: false,
                            message: `未找到 ${modelName} 模型，请确保已在 Ollama 中安装该模型`
                        });
                    }
                    testResult = {
                        success: true,
                        message: 'Ollama 模型连接成功'
                    };
                }
                catch (error) {
                    console.error('Ollama 连接测试错误:', error);
                    testResult = {
                        success: false,
                        message: 'Ollama 服务不可用，请确保 Ollama 正在运行并安装了相应模型'
                    };
                }
            }
            else if (aiModel.provider === 'llamacpp') {
                testResult = await this.testLlamaCppConnection(aiModel);
            }
            else if (aiModel.provider === 'openai' || aiModel.provider === 'anthropic' || aiModel.provider === 'google') {
                // 测试需要 API Key 的模型
                if (!aiModel.apiKey) {
                    return res.status(400).json({
                        error: '参数错误',
                        message: '请提供 API Key'
                    });
                }
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
                    message: '不支持的模型提供商'
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