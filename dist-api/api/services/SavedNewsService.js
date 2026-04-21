"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedNewsService = void 0;
const promises_1 = require("node:fs/promises");
const node_path_1 = __importDefault(require("node:path"));
const AICrawlerService_1 = require("./AICrawlerService");
const ConfigService_1 = require("./ConfigService");
class SavedNewsService {
    constructor() {
        this.configService = new ConfigService_1.ConfigService();
        this.aiCrawlerService = new AICrawlerService_1.AICrawlerService();
        // 初始化一些模拟数据
        if (SavedNewsService.savedNews.length === 0) {
            this.initializeMockData();
        }
    }
    initializeMockData() {
        SavedNewsService.savedNews = [
            {
                id: '1',
                userId: '1',
                title: 'AI 医疗诊断技术引领行业变革',
                content: '在当今快速发展的科技领域，人工智能技术正在医疗行业掀起一场革命性的变革...',
                originalNewsId: '1',
                outputType: 'news',
                isPublished: true,
                publishedTo: ['website'],
                createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                id: '2',
                userId: '1',
                title: '新能源汽车市场分析报告',
                content: '随着全球环保意识的提升和政策支持，新能源汽车市场正在经历爆发式增长...',
                originalNewsId: '2',
                outputType: 'news',
                isPublished: false,
                publishedTo: [],
                createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
                updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            },
        ];
    }
    sanitizeFileName(name) {
        return name.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim() || 'AI助手输出';
    }
    buildFileContent(title, content, format) {
        switch (format) {
            case 'txt':
                return `${title}\n\n${content.replace(/[#*`]/g, '')}`;
            case 'json':
                return JSON.stringify({
                    title,
                    content,
                    exportedAt: new Date().toISOString(),
                }, null, 2);
            case 'html':
                return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', sans-serif; margin: 32px; color: #0f172a; line-height: 1.7; }
    h1 { margin-bottom: 20px; }
    .meta { margin-top: 24px; color: #64748b; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <article>${content.replace(/\n/g, '<br />')}</article>
  <p class="meta">由 AI 助手生成于 ${new Date().toLocaleString('zh-CN')}</p>
</body>
</html>`;
            case 'md':
            default:
                return `# ${title}\n\n${content}`;
        }
    }
    // 获取保存的新闻
    async getSavedNews(userId) {
        return SavedNewsService.savedNews.filter((news) => news.userId === userId);
    }
    // 保存新闻
    async saveNews(data) {
        const id = Date.now().toString();
        const outputType = data.outputType || 'news';
        const resolvedContent = outputType === 'news' && data.originalNewsUrl
            ? await this.aiCrawlerService.fetchArticleContent(data.originalNewsUrl, data.content)
            : data.content;
        const newNews = {
            id,
            userId: data.userId,
            title: data.title,
            content: resolvedContent,
            originalNewsId: data.originalNewsId,
            url: data.originalNewsUrl,
            outputType,
            isPublished: false,
            publishedTo: [],
            categories: data.categories || [],
            industries: data.industries || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if (outputType === 'file') {
            const fileFormat = data.fileFormat || 'md';
            const config = await this.configService.getConfig(data.userId);
            const generatedDir = node_path_1.default.join(config.workspace.rootPath, 'generated');
            const safeTitle = this.sanitizeFileName(data.title);
            const fileName = `${safeTitle}-${id}.${fileFormat}`;
            const filePath = node_path_1.default.join(generatedDir, fileName);
            await (0, promises_1.mkdir)(generatedDir, { recursive: true });
            await (0, promises_1.writeFile)(filePath, this.buildFileContent(data.title, data.content, fileFormat), 'utf-8');
            newNews.fileName = fileName;
            newNews.fileFormat = fileFormat;
            newNews.filePath = filePath;
            newNews.downloadUrl = `/api/news/saved/${id}/download`;
        }
        SavedNewsService.savedNews.push(newNews);
        return newNews;
    }
    // 更新新闻
    async updateNews(id, data) {
        const news = SavedNewsService.savedNews.find((news) => news.id === id);
        if (!news) {
            throw new Error('新闻不存在');
        }
        if (data.title)
            news.title = data.title;
        if (data.content)
            news.content = data.content;
        if (data.categories !== undefined)
            news.categories = data.categories;
        if (data.industries !== undefined)
            news.industries = data.industries;
        news.updatedAt = new Date().toISOString();
        return news;
    }
    // 根据 ID 获取新闻
    async getSavedNewsById(id) {
        return SavedNewsService.savedNews.find((news) => news.id === id) || null;
    }
    // 更新发布状态
    async updatePublishStatus(id, platforms) {
        const news = SavedNewsService.savedNews.find((news) => news.id === id);
        if (!news) {
            throw new Error('新闻不存在');
        }
        news.isPublished = true;
        news.publishedTo = [...new Set([...news.publishedTo, ...platforms])];
        news.updatedAt = new Date().toISOString();
        return news;
    }
    // 删除新闻
    async deleteNews(id) {
        const initialLength = SavedNewsService.savedNews.length;
        SavedNewsService.savedNews = SavedNewsService.savedNews.filter((news) => news.id !== id);
        return SavedNewsService.savedNews.length < initialLength;
    }
}
exports.SavedNewsService = SavedNewsService;
SavedNewsService.savedNews = [];
//# sourceMappingURL=SavedNewsService.js.map