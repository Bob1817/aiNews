"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const NewsService_1 = require("./NewsService");
const ConfigService_1 = require("./ConfigService");
const chatContext_1 = require("./chatContext");
class AIService {
    constructor() {
        this.workspaceTextExtensions = new Set([
            '.txt',
            '.md',
            '.markdown',
            '.json',
            '.csv',
            '.ts',
            '.tsx',
            '.js',
            '.jsx',
            '.py',
            '.java',
            '.html',
            '.css',
            '.yaml',
            '.yml',
        ]);
        this.newsService = new NewsService_1.NewsService();
        this.configService = new ConfigService_1.ConfigService();
    }
    isUsableConfig(config) {
        if (!config?.provider) {
            return false;
        }
        if (config.provider === 'ollama' || config.provider === 'llamacpp') {
            return Boolean(config.modelName || config.baseUrl);
        }
        return Boolean(config.apiKey && config.modelName);
    }
    prefersFallbackModel(primary, fallback) {
        if (!fallback || !this.isUsableConfig(fallback)) {
            return false;
        }
        if (primary.provider !== fallback.provider) {
            return false;
        }
        if ((primary.provider === 'ollama' || primary.provider === 'llamacpp') && !primary.modelName && !!fallback.modelName) {
            return true;
        }
        return false;
    }
    buildOllamaBaseUrlCandidates(baseUrl) {
        const normalized = (baseUrl || 'http://localhost:11434').replace(/\/$/, '');
        const candidates = [normalized];
        if (normalized.includes('://localhost')) {
            candidates.push(normalized.replace('://localhost', '://127.0.0.1'));
        }
        return Array.from(new Set(candidates));
    }
    async collectWorkspaceFiles(rootPath, relativePath = '', depth = 0) {
        if (depth > 2) {
            return [];
        }
        const directoryPath = relativePath ? node_path_1.default.join(rootPath, relativePath) : rootPath;
        const entries = await (0, promises_1.readdir)(directoryPath, { withFileTypes: true });
        const results = [];
        for (const entry of entries.slice(0, 30)) {
            const nextRelativePath = relativePath ? node_path_1.default.join(relativePath, entry.name) : entry.name;
            const absolutePath = node_path_1.default.join(rootPath, nextRelativePath);
            const metadata = await (0, promises_1.stat)(absolutePath);
            results.push({
                absolutePath,
                relativePath: nextRelativePath,
                isDirectory: entry.isDirectory(),
                size: metadata.size,
                modifiedAt: metadata.mtime.toISOString(),
            });
            if (entry.isDirectory()) {
                results.push(...(await this.collectWorkspaceFiles(rootPath, nextRelativePath, depth + 1)));
            }
        }
        return results;
    }
    sanitizeFileSnippet(content) {
        return content
            .replace(/\0/g, '')
            .replace(/\r/g, '')
            .replace(/\n{3,}/g, '\n\n')
            .slice(0, 1200)
            .trim();
    }
    async buildWorkspaceContext(userId) {
        try {
            const config = await this.configService.getConfig(userId);
            const workspace = config.workspace;
            if (!workspace?.allowAiAccess || !workspace.rootPath) {
                return '';
            }
            const fileEntries = await this.collectWorkspaceFiles(workspace.rootPath);
            if (fileEntries.length === 0) {
                return `工程文件夹信息：\n根目录：${workspace.rootPath}\n当前目录为空。`;
            }
            const fileList = fileEntries
                .slice(0, 24)
                .map((entry) => {
                const typeLabel = entry.isDirectory ? '目录' : '文件';
                const sizeLabel = entry.isDirectory ? '-' : `${Math.max(1, Math.round(entry.size / 1024))}KB`;
                return `- ${typeLabel}：${entry.relativePath}（大小：${sizeLabel}，更新于：${entry.modifiedAt.slice(0, 10)}）`;
            })
                .join('\n');
            const readableFiles = fileEntries
                .filter((entry) => !entry.isDirectory && this.workspaceTextExtensions.has(node_path_1.default.extname(entry.relativePath).toLowerCase()))
                .slice(0, 6);
            const snippets = await Promise.all(readableFiles.map(async (entry) => {
                try {
                    const content = await (0, promises_1.readFile)(entry.absolutePath, 'utf-8');
                    const snippet = this.sanitizeFileSnippet(content);
                    if (!snippet) {
                        return '';
                    }
                    return `文件：${entry.relativePath}\n内容摘要：\n${snippet}`;
                }
                catch (_error) {
                    return '';
                }
            }));
            const snippetSection = snippets.filter(Boolean).join('\n\n');
            return [
                '工程文件夹上下文：',
                `根目录：${workspace.rootPath}`,
                '目录内容概览：',
                fileList,
                snippetSection ? `\n可读文件摘要：\n${snippetSection}` : '',
            ]
                .filter(Boolean)
                .join('\n');
        }
        catch (error) {
            console.warn('读取工程文件夹上下文失败:', error);
            return '';
        }
    }
    async resolveOllamaModelName(config) {
        if (config.modelName?.trim()) {
            return config.modelName.trim();
        }
        for (const baseUrl of this.buildOllamaBaseUrlCandidates(config.baseUrl)) {
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
                    const resolved = firstModel?.model || firstModel?.name;
                    if (resolved) {
                        return resolved;
                    }
                }
            }
            catch (error) {
                console.warn(`自动解析 Ollama 模型失败 (${baseUrl}):`, error);
            }
        }
        return process.env.OLLAMA_MODEL || 'gemma4:latest';
    }
    // 调用 Ollama API
    async callOllamaAPI(config, prompt, systemPrompt) {
        const modelName = await this.resolveOllamaModelName(config);
        try {
            const promptContent = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;
            let lastError = null;
            for (const baseUrl of this.buildOllamaBaseUrlCandidates(config.baseUrl)) {
                try {
                    let response = await fetch(`${baseUrl}/api/generate`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            model: modelName,
                            prompt: promptContent,
                            stream: false,
                        }),
                    });
                    if (response.status === 404) {
                        response = await fetch(`${baseUrl}/api/chat`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                model: modelName,
                                messages: [{ role: 'user', content: promptContent }],
                                stream: false,
                            }),
                        });
                    }
                    if (!response.ok) {
                        const contentType = response.headers.get('content-type') || '';
                        const isJson = contentType.includes('application/json');
                        const data = isJson ? await response.json() : await response.text();
                        const message = typeof data === 'object' && data !== null && 'error' in data
                            ? String(data.error)
                            : `Ollama API 调用失败: ${response.status}`;
                        throw new Error(message);
                    }
                    const data = await response.json();
                    return data.response || data.message?.content || '抱歉，未能生成回复。';
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error('未知错误');
                    console.warn(`Ollama API 调用失败 (${baseUrl}):`, lastError);
                }
            }
            throw lastError || new Error('未能连接到 Ollama 服务');
        }
        catch (error) {
            console.error('Ollama API 调用错误:', error);
            const message = error instanceof Error ? error.message : '未知错误';
            throw new Error(`调用 Ollama API 失败：${message}`);
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
            const primaryConfig = {
                provider: config.aiModel.provider,
                apiKey: config.aiModel.apiKey,
                modelName: config.aiModel.modelName,
                baseUrl: config.aiModel.baseUrl,
            };
            const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0];
            const fallbackConfig = activeModel
                ? {
                    provider: activeModel.provider,
                    apiKey: activeModel.apiKey,
                    modelName: activeModel.modelName,
                    baseUrl: activeModel.baseUrl,
                }
                : undefined;
            if (this.prefersFallbackModel(primaryConfig, fallbackConfig)) {
                return fallbackConfig;
            }
            if (this.isUsableConfig(primaryConfig)) {
                return primaryConfig;
            }
            if (this.isUsableConfig(fallbackConfig)) {
                return fallbackConfig;
            }
            throw new Error('没有可用的 AI 模型配置');
        }
        catch (error) {
            throw error instanceof Error ? error : new Error('读取 AI 配置失败');
        }
    }
    async generateText(userId, prompt, systemPrompt) {
        try {
            const config = await this.getAIConfig(userId);
            let response;
            console.log('AI 配置:', {
                provider: config.provider,
                hasApiKey: !!config.apiKey,
                modelName: config.modelName,
                baseUrl: config.baseUrl,
            });
            if (config.provider === 'ollama') {
                response = await this.callOllamaAPI(config, prompt, systemPrompt);
            }
            else if (config.provider === 'llamacpp') {
                response = await this.callLlamaCppAPI(config, prompt, systemPrompt);
            }
            else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
                response = await this.callOpenAIAPI(config, prompt, systemPrompt);
            }
            else {
                throw new Error('没有有效的 AI 模型配置');
            }
            return response;
        }
        catch (error) {
            console.error('AI 文本生成失败:', error);
            throw error;
        }
    }
    // AI 对话
    async chat(userId, message, referencedNewsId, history) {
        let fullPrompt = message;
        if (referencedNewsId) {
            const news = await this.newsService.getNewsById(referencedNewsId);
            if (news) {
                const boundedReference = (0, chatContext_1.buildBoundedReferenceSection)({
                    title: news.title,
                    content: news.content,
                    source: news.source,
                    publishedAt: news.publishedAt,
                    url: news.url,
                }, 1200);
                fullPrompt = `请基于以下新闻内容完成用户任务：\n\n${boundedReference}\n\n用户请求：${(0, chatContext_1.clampContextBlock)(message, 1000)}`;
            }
        }
        const historySection = (0, chatContext_1.buildBoundedHistorySection)(history || [], {
            preserveRecentMessages: 8,
            maxMessageChars: 320,
            maxSummaryChars: 360,
        });
        const workspaceSection = await this.buildWorkspaceContext(userId);
        const workspacePrompt = workspaceSection ? `${(0, chatContext_1.clampContextBlock)(workspaceSection, 1800)}\n\n` : '';
        const content = await this.generateText(userId, `${workspacePrompt}${historySection}${(0, chatContext_1.clampContextBlock)(fullPrompt, 1800)}`, '你是 AI 助手的通用对话核心，擅长帮助用户处理日常工作任务。若工程文件夹上下文存在，请优先参考其中的文件结构和内容摘要来回答。回答要直接、清晰、可执行。');
        return { content };
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
            const response = await this.generateText(userId, fullPrompt);
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