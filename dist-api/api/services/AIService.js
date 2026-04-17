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
    async chat(userId, message, referencedNewsId, _history) {
        let fullPrompt = message;
        if (referencedNewsId) {
            const news = await this.newsService.getNewsById(referencedNewsId);
            if (news) {
                fullPrompt = `请基于以下新闻内容进行创作：\n\n新闻标题：${news.title}\n\n新闻内容：${news.content}\n\n用户请求：${message}`;
            }
        }
        const systemPrompt = '你是一个专业的新闻创作助手，擅长基于新闻内容进行二次创作，生成专业、准确的新闻稿件。';
        try {
            const config = await this.getAIConfig(userId);
            let response;
            console.log('AI 配置:', { provider: config.provider, hasApiKey: !!config.apiKey, modelName: config.modelName });
            if (config.provider === 'ollama') {
                console.log('使用 Ollama API');
                response = await this.callOllamaAPI(config, fullPrompt, systemPrompt);
            }
            else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
                console.log('使用 OpenAI API');
                response = await this.callOpenAIAPI(config, fullPrompt, systemPrompt);
            }
            else {
                console.log('没有有效配置，使用模拟响应');
                // 如果没有配置API Key或使用其他提供商，使用模拟响应
                throw new Error('使用模拟响应');
            }
            return { content: response };
        }
        catch (error) {
            console.error('AI 对话调用失败:', error);
            // API调用失败时使用模拟响应
            let response = '';
            if (referencedNewsId) {
                const news = await this.newsService.getNewsById(referencedNewsId);
                if (news) {
                    response = `基于您引用的新闻"${news.title}"，我为您创作了一篇新闻稿...\n\n这是一篇关于${news.relatedKeywords.join('、')}的深度报道，详细分析了该领域的最新发展趋势和未来展望。文章从多个角度探讨了相关技术的应用场景和潜在影响，为读者提供了全面的行业洞察。`;
                }
            }
            else {
                response = '您好！我是 AI 新闻助手。您可以从上方选择新闻引用，然后让我帮您进行二次创作。我可以基于最新的新闻内容，为您生成专业、准确的新闻稿件。';
            }
            return { content: response };
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
        const systemPrompt = '你是一个专业的新闻创作者，擅长撰写深度报道和分析文章。请确保文章结构清晰、观点准确、内容丰富。';
        try {
            const config = await this.getAIConfig(userId);
            let response;
            console.log('AI 创作配置:', { provider: config.provider, hasApiKey: !!config.apiKey, modelName: config.modelName });
            if (config.provider === 'ollama') {
                console.log('使用 Ollama API 进行创作');
                response = await this.callOllamaAPI(config, fullPrompt, systemPrompt);
            }
            else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
                console.log('使用 OpenAI API 进行创作');
                response = await this.callOpenAIAPI(config, fullPrompt, systemPrompt);
            }
            else {
                console.log('没有有效配置，使用模拟响应进行创作');
                throw new Error('使用模拟响应');
            }
            // 尝试从响应中提取标题
            const titleMatch = response.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : `AI 创作：${prompt}`;
            return { title, content: response };
        }
        catch (error) {
            console.error('AI 创作调用失败:', error);
            // API调用失败时使用模拟响应
            const title = `AI 创作：${prompt}`;
            const content = `# ${title}\n\n${prompt}\n\n${referencedContent ? `## 参考信息\n\n${referencedContent}` : ''}\n\n本文由 AI 基于最新新闻内容创作，提供了对相关话题的深度分析和见解。`;
            return { title, content };
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=AIService.js.map