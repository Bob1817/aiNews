"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const NewsService_1 = require("./NewsService");
const ConfigService_1 = require("./ConfigService");
class AIService {
    constructor() {
        this.newsService = new NewsService_1.NewsService();
        this.configService = new ConfigService_1.ConfigService();
    }
    // 调用 Ollama API
    async callOllamaAPI(config, prompt, systemPrompt) {
        const baseUrl = config.baseUrl || 'http://localhost:11434';
        try {
            const response = await fetch(`${baseUrl}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: config.modelName,
                    prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama API 调用失败: ${response.status}`);
            }
            const data = await response.json();
            return data.response || '抱歉，未能生成回复。';
        }
        catch (error) {
            console.error('Ollama API 调用错误:', error);
            throw new Error('调用 Ollama API 失败，请检查 Ollama 是否正在运行');
        }
    }
    // 调用 llama.cpp API
    async callLlamaCppAPI(config, prompt, systemPrompt) {
        const baseUrl = config.baseUrl || 'http://localhost:8080';
        const headers = {
            'Content-Type': 'application/json',
        };
        if (config.apiKey) {
            headers.Authorization = `Bearer ${config.apiKey}`;
        }
        try {
            // 首先尝试 v1/chat/completions 端点（兼容 OpenAI API 格式）
            const chatResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    model: config.modelName || 'llama.cpp',
                    messages: [
                        ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 1000,
                    stream: false,
                }),
            });
            if (chatResponse.ok) {
                const data = await chatResponse.json();
                return data.choices?.[0]?.message?.content || '抱歉，未能生成回复。';
            }
        }
        catch (error) {
            console.warn('llama.cpp chat/completions 测试失败，尝试 completion 回退:', error);
        }
        try {
            // 尝试 completion 端点
            const completionResponse = await fetch(`${baseUrl}/completion`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
                    n_predict: 1000,
                    stream: false,
                }),
            });
            if (completionResponse.ok) {
                const data = await completionResponse.json();
                return data.content || '抱歉，未能生成回复。';
            }
            throw new Error(`llama.cpp API 调用失败: ${completionResponse.status}`);
        }
        catch (error) {
            console.error('llama.cpp API 调用错误:', error);
            throw new Error('调用 llama.cpp API 失败，请检查 llama.cpp 服务是否正在运行');
        }
    }
    // 调用 OpenAI API
    async callOpenAIAPI(config, prompt, systemPrompt) {
        const baseUrl = config.baseUrl || 'https://api.openai.com/v1';
        try {
            const messages = [];
            if (systemPrompt) {
                messages.push({ role: 'system', content: systemPrompt });
            }
            messages.push({ role: 'user', content: prompt });
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.apiKey}`,
                },
                body: JSON.stringify({
                    model: config.modelName,
                    messages,
                    temperature: 0.7,
                }),
            });
            if (!response.ok) {
                throw new Error(`OpenAI API 调用失败: ${response.status}`);
            }
            const data = await response.json();
            return data.choices?.[0]?.message?.content || '抱歉，未能生成回复。';
        }
        catch (error) {
            console.error('OpenAI API 调用错误:', error);
            throw new Error('调用 OpenAI API 失败，请检查 API Key 和网络连接');
        }
    }
    // 获取 AI 配置
    async getAIConfig(userId) {
        try {
            const config = await this.configService.getConfig(userId);
            return {
                provider: config.aiModel.provider,
                apiKey: config.aiModel.apiKey,
                modelName: config.aiModel.modelName,
                baseUrl: config.aiModel.baseUrl,
            };
        }
        catch (error) {
            // 如果获取配置失败，使用默认配置
            return {
                provider: 'openai',
                apiKey: '',
                modelName: 'gpt-3.5-turbo',
                baseUrl: '',
            };
        }
    }
    // AI 对话
    async chat(userId, message, referencedNewsId, history) {
        let fullPrompt = message;
        if (referencedNewsId) {
            const news = await this.newsService.getNewsById(referencedNewsId);
            if (news) {
                fullPrompt = `请基于以下新闻内容进行创作：\n\n新闻标题：${news.title}\n\n新闻内容：${news.content}\n\n用户请求：${message}`;
            }
        }
        // 不使用系统提示，直接传递用户的原话
        try {
            const config = await this.getAIConfig(userId);
            let response;
            console.log('AI 配置:', {
                provider: config.provider,
                hasApiKey: !!config.apiKey,
                modelName: config.modelName,
                baseUrl: config.baseUrl
            });
            if (config.provider === 'ollama') {
                console.log('使用 Ollama API');
                response = await this.callOllamaAPI(config, fullPrompt);
            }
            else if (config.provider === 'llamacpp') {
                console.log('使用 llama.cpp API');
                console.log('llama.cpp 配置:', { baseUrl: config.baseUrl || 'http://localhost:8080' });
                response = await this.callLlamaCppAPI(config, fullPrompt);
            }
            else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
                console.log('使用 OpenAI API');
                response = await this.callOpenAIAPI(config, fullPrompt);
            }
            else {
                console.log('没有有效配置');
                throw new Error('没有有效的 AI 模型配置');
            }
            return { content: response };
        }
        catch (error) {
            console.error('AI 对话调用失败:', error);
            throw error;
        }
    }
    // AI 新闻创作
    async compose(userId, prompt, referencedNewsIds) {
        let referencedContent = '';
        let fullPrompt = prompt;
        if (referencedNewsIds && referencedNewsIds.length > 0) {
            const newsItems = await Promise.all(referencedNewsIds.map((id) => this.newsService.getNewsById(id)));
            const validNews = newsItems.filter((news) => news !== null);
            if (validNews.length > 0) {
                referencedContent = validNews.map((news, index) => `参考新闻 ${index + 1}：\n标题：${news.title}\n内容：${news.content}`).join('\n\n');
                fullPrompt = `${referencedContent}\n\n请基于以上参考新闻，完成以下创作任务：${prompt}`;
            }
        }
        // 不使用系统提示，直接传递用户的原话
        try {
            const config = await this.getAIConfig(userId);
            let response;
            console.log('AI 创作配置:', { provider: config.provider, hasApiKey: !!config.apiKey, modelName: config.modelName });
            if (config.provider === 'ollama') {
                console.log('使用 Ollama API 进行创作');
                response = await this.callOllamaAPI(config, fullPrompt);
            }
            else if (config.provider === 'llamacpp') {
                console.log('使用 llama.cpp API 进行创作');
                response = await this.callLlamaCppAPI(config, fullPrompt);
            }
            else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
                console.log('使用 OpenAI API 进行创作');
                response = await this.callOpenAIAPI(config, fullPrompt);
            }
            else {
                console.log('没有有效配置');
                throw new Error('没有有效的 AI 模型配置');
            }
            // 尝试从响应中提取标题
            const titleMatch = response.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : `AI 创作：${prompt}`;
            return { title, content: response };
        }
        catch (error) {
            console.error('AI 创作调用失败:', error);
            throw error;
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=AIService.js.map