"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigController = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const ConfigService_1 = require("../services/ConfigService");
class ConfigController {
    constructor() {
        this.configService = new ConfigService_1.ConfigService();
    }
    sanitizeFileName(fileName) {
        const ext = node_path_1.default.extname(fileName);
        const baseName = node_path_1.default.basename(fileName, ext);
        const safeBaseName = baseName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim() || 'workspace-file';
        return {
            ext: ext || '',
            safeBaseName,
        };
    }
    async resolveOllamaModelName(aiModel) {
        if (aiModel.modelName?.trim()) {
            return aiModel.modelName.trim();
        }
        const baseUrl = (aiModel.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
        try {
            const response = await fetch(`${baseUrl}/api/tags`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (response.ok) {
                const data = await response.json();
                const firstModel = data.models?.[0];
                const resolvedModelName = firstModel?.model || firstModel?.name;
                if (resolvedModelName) {
                    return resolvedModelName;
                }
            }
        }
        catch (error) {
            console.warn('解析 Ollama 实际模型名失败:', error);
        }
        return process.env.OLLAMA_MODEL || 'gemma4:latest';
    }
    getActiveConfiguredModel(config) {
        if (this.hasConfiguredAIModel(config.aiModel)) {
            return {
                id: config.aiModel.id,
                name: config.aiModel.name,
                provider: config.aiModel.provider,
                apiKey: config.aiModel.apiKey,
                modelName: config.aiModel.modelName,
                baseUrl: config.aiModel.baseUrl,
                source: 'primary',
            };
        }
        const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0];
        if (!activeModel) {
            return null;
        }
        return {
            id: activeModel.id,
            name: activeModel.name,
            provider: activeModel.provider,
            apiKey: activeModel.apiKey,
            modelName: activeModel.modelName,
            baseUrl: activeModel.baseUrl,
            source: 'fallback',
        };
    }
    hasConfiguredAIModel(aiModel) {
        switch (aiModel.provider) {
            case 'ollama':
            case 'llamacpp':
                return Boolean(aiModel.modelName || aiModel.baseUrl);
            case 'openai':
            case 'anthropic':
            case 'google':
                return Boolean(aiModel.apiKey || aiModel.modelName || aiModel.baseUrl);
            default:
                return false;
        }
    }
    async testCloudAIConnection(aiModel) {
        if (!aiModel.provider || !aiModel.apiKey) {
            return {
                success: false,
                message: '请提供有效的 API Key',
            };
        }
        const baseUrl = (aiModel.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${aiModel.apiKey}`,
                },
                body: JSON.stringify({
                    model: aiModel.modelName,
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 5,
                }),
            });
            const contentType = response.headers.get('content-type') || '';
            const isJson = contentType.includes('application/json');
            const data = isJson ? await response.json() : await response.text();
            if (!response.ok) {
                const message = typeof data === 'object' && data !== null && 'error' in data
                    ? JSON.stringify(data.error)
                    : `模型连接失败: ${response.status}`;
                return {
                    success: false,
                    message,
                };
            }
            return {
                success: true,
                message: 'AI 模型连接成功',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : '无法连接到云端 AI 模型',
            };
        }
    }
    async testOllamaConnection(aiModel) {
        const baseUrl = (aiModel.baseUrl || 'http://localhost:11434').replace(/\/$/, '');
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
            const resolvedModelName = await this.resolveOllamaModelName(aiModel);
            const hasModel = data.models?.some((model) => {
                const candidate = model.model || model.name || '';
                return candidate === resolvedModelName || candidate.includes(resolvedModelName);
            });
            if (!hasModel) {
                return {
                    success: false,
                    message: `未找到 ${resolvedModelName} 模型，请确保已在 Ollama 中安装该模型`,
                };
            }
            const generateResponse = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: resolvedModelName,
                    prompt: 'ping',
                    stream: false,
                }),
            });
            if (!generateResponse.ok) {
                const contentType = generateResponse.headers.get('content-type') || '';
                const isJson = contentType.includes('application/json');
                const data = isJson ? await generateResponse.json() : await generateResponse.text();
                const message = typeof data === 'object' && data !== null && 'error' in data
                    ? String(data.error)
                    : `Ollama generate 调用失败: ${generateResponse.status}`;
                return {
                    success: false,
                    message,
                };
            }
            return {
                success: true,
                message: 'Ollama 模型连接成功',
            };
        }
        catch (error) {
            console.error('Ollama 连接测试错误:', error);
            return {
                success: false,
                message: 'Ollama 服务不可用，请确保 Ollama 正在运行并安装了相应模型',
            };
        }
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
    async getActiveAIModel(req, res) {
        try {
            const { userId } = req.query;
            const config = await this.configService.getConfig(userId);
            const activeModel = this.getActiveConfiguredModel(config);
            if (!activeModel) {
                return res.json({
                    configured: false,
                    provider: null,
                    configuredName: '',
                    configuredModelName: '',
                    effectiveModelName: '',
                    baseUrl: '',
                    source: null,
                });
            }
            const effectiveModelName = activeModel.provider === 'ollama'
                ? await this.resolveOllamaModelName(activeModel)
                : activeModel.modelName || '';
            return res.json({
                configured: true,
                provider: activeModel.provider,
                configuredName: activeModel.name || '',
                configuredModelName: activeModel.modelName || '',
                effectiveModelName,
                baseUrl: activeModel.baseUrl || '',
                source: activeModel.source,
            });
        }
        catch (error) {
            console.error('获取当前生效 AI 模型失败:', error);
            res.status(500).json({ error: '获取当前生效 AI 模型失败' });
        }
    }
    async uploadWorkspaceAsset(req, res) {
        try {
            const { userId, fileName, contentBase64, mimeType } = req.body;
            if (!userId || !fileName || !contentBase64) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供 userId、fileName 和 contentBase64',
                });
            }
            const config = await this.configService.getConfig(userId);
            const uploadsDir = node_path_1.default.join(config.workspace.rootPath, 'uploads');
            await (0, promises_1.mkdir)(uploadsDir, { recursive: true });
            const { ext, safeBaseName } = this.sanitizeFileName(fileName);
            const savedFileName = `${safeBaseName}-${Date.now()}${ext}`;
            const savedFilePath = node_path_1.default.join(uploadsDir, savedFileName);
            await (0, promises_1.writeFile)(savedFilePath, Buffer.from(contentBase64, 'base64'));
            return res.json({
                success: true,
                message: '文件上传成功',
                data: {
                    fileName: savedFileName,
                    filePath: savedFilePath,
                    relativePath: `uploads/${savedFileName}`,
                    assetUrl: `/api/config/workspace/asset?userId=${encodeURIComponent(userId)}&path=${encodeURIComponent(`uploads/${savedFileName}`)}`,
                    mimeType: mimeType || 'application/octet-stream',
                },
            });
        }
        catch (error) {
            console.error('上传工作文件失败:', error);
            return res.status(500).json({
                error: '上传工作文件失败',
                message: error instanceof Error ? error.message : '未知错误',
            });
        }
    }
    async getWorkspaceAsset(req, res) {
        try {
            const userId = String(req.query.userId || '');
            const requestedPath = String(req.query.path || '');
            if (!userId || !requestedPath) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '请提供 userId 和 path',
                });
            }
            if (!requestedPath.startsWith('uploads/')) {
                return res.status(400).json({
                    error: '参数错误',
                    message: '仅支持访问 uploads 目录中的文件',
                });
            }
            const config = await this.configService.getConfig(userId);
            const uploadsDir = node_path_1.default.resolve(config.workspace.rootPath, 'uploads');
            const absolutePath = node_path_1.default.resolve(config.workspace.rootPath, requestedPath);
            if (!absolutePath.startsWith(`${uploadsDir}${node_path_1.default.sep}`) && absolutePath !== uploadsDir) {
                return res.status(403).json({
                    error: '访问被拒绝',
                    message: '无权访问该文件',
                });
            }
            return res.sendFile(absolutePath);
        }
        catch (error) {
            console.error('读取工作文件失败:', error);
            return res.status(500).json({
                error: '读取工作文件失败',
                message: error instanceof Error ? error.message : '未知错误',
            });
        }
    }
    // 保存配置
    async saveConfig(req, res) {
        try {
            const { userId, aiModel, publishPlatforms, aiModels, workspace } = req.body;
            // 仅在用户实际配置了 AI 模型时才校验，避免保存其他设置被空白模型配置阻塞
            if (aiModel && this.hasConfiguredAIModel(aiModel)) {
                if (aiModel.provider === 'ollama') {
                    const ollamaTest = await this.testOllamaConnection(aiModel);
                    if (!ollamaTest.success) {
                        return res.status(400).json({
                            error: 'AI 模型测试失败',
                            message: ollamaTest.message
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
                    const cloudTest = await this.testCloudAIConnection(aiModel);
                    if (!cloudTest.success) {
                        return res.status(400).json({
                            error: 'AI 模型测试失败',
                            message: cloudTest.message,
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
                publishPlatforms,
                aiModels,
                workspace,
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
                testResult = await this.testOllamaConnection(aiModel);
            }
            else if (aiModel.provider === 'llamacpp') {
                testResult = await this.testLlamaCppConnection(aiModel);
            }
            else if (aiModel.provider === 'openai' || aiModel.provider === 'anthropic' || aiModel.provider === 'google') {
                testResult = await this.testCloudAIConnection(aiModel);
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