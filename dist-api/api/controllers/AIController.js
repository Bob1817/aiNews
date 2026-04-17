"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIController = void 0;
const AIService_1 = require("../services/AIService");
class AIController {
    constructor() {
        Object.defineProperty(this, "aiService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.aiService = new AIService_1.AIService();
    }
    // AI 对话
    async chat(req, res) {
        try {
            const { userId, message, referencedNewsId, history } = req.body;
            const response = await this.aiService.chat(userId, message, referencedNewsId, history);
            res.json(response);
        }
        catch (error) {
            res.status(500).json({ error: 'AI 对话失败' });
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
            res.status(500).json({ error: 'AI 创作失败' });
        }
    }
}
exports.AIController = AIController;
