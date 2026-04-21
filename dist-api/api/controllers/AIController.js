"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const AIService_1 = require("../services/AIService");
const WorkflowExecutionService_1 = require("../services/WorkflowExecutionService");
class AIController {
    constructor() {
        this.aiService = new AIService_1.AIService();
        this.workflowExecutionService = new WorkflowExecutionService_1.WorkflowExecutionService();
    }
    // AI 对话
    async chat(req, res) {
        try {
            const { userId, message, referencedNewsId, history } = req.body;
            const parsed = await this.workflowExecutionService.parseCommand(message);
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