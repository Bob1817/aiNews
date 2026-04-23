"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const AIService_1 = require("../services/AIService");
const ConfigService_1 = require("../services/ConfigService");
const WorkflowExecutionService_1 = require("../services/WorkflowExecutionService");
class AIController {
    constructor() {
        this.aiService = new AIService_1.AIService();
        this.configService = new ConfigService_1.ConfigService();
        this.workflowExecutionService = new WorkflowExecutionService_1.WorkflowExecutionService();
    }
    hasConfiguredAIModel(aiModel) {
        if (!aiModel?.provider) {
            return false;
        }
        switch (aiModel.provider) {
            case 'ollama':
            case 'llamacpp':
                return Boolean(aiModel.modelName || aiModel.baseUrl);
            case 'openai':
            case 'anthropic':
            case 'google':
                return Boolean(aiModel.apiKey && aiModel.modelName);
            default:
                return false;
        }
    }
    hasUsableAiModel(config) {
        const aiModel = config.aiModel;
        const aiModels = config.aiModels || [];
        if (this.hasConfiguredAIModel(aiModel)) {
            return true;
        }
        const fallbackModel = aiModels.find((item) => item.isActive) || aiModels[0];
        return this.hasConfiguredAIModel(fallbackModel);
    }
    // AI 对话
    async chat(req, res) {
        try {
            const { userId, message, referencedNewsId, history } = req.body;
            const parsed = await this.workflowExecutionService.parseCommand(message);
            if (!parsed.matched) {
                const config = await this.configService.getConfig(userId);
                if (config.workspace.localWorkflowOnly || !this.hasUsableAiModel(config)) {
                    return res.json({
                        content: '当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。',
                    });
                }
            }
            const response = parsed.matched
                ? await this.workflowExecutionService.executeParsedCommand({
                    userId,
                    parsed,
                    message,
                    referencedNewsId,
                    history,
                })
                : await this.aiService.chat(userId, message, referencedNewsId, history);
            res.json(response);
        }
        catch (error) {
            console.error('AI 对话错误:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'AI 对话失败'
            });
        }
    }
    // AI 新闻创作
    async compose(req, res) {
        try {
            const { userId, prompt, referencedNewsIds } = req.body;
            const response = await this.aiService.compose(userId, prompt, referencedNewsIds);
            res.json(response);
        }
        catch (error) {
            console.error('AI 创作错误:', error);
            res.status(500).json({
                error: error instanceof Error ? error.message : 'AI 创作失败'
            });
        }
    }
}
exports.AIController = AIController;
//# sourceMappingURL=AIController.js.map