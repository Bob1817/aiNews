"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsController = void 0;
const NewsService_1 = require("../services/NewsService");
const SavedNewsService_1 = require("../services/SavedNewsService");
const PublishService_1 = require("../services/PublishService");
const UserService_1 = require("../services/UserService");
class NewsController {
    constructor() {
        this.newsService = new NewsService_1.NewsService();
        this.savedNewsService = new SavedNewsService_1.SavedNewsService();
        this.publishService = new PublishService_1.PublishService();
        this.userService = new UserService_1.UserService();
    }
    // 获取最近新闻
    async getRecentNews(req, res) {
        try {
            const { userId } = req.query;
            let userProfile;
            if (userId) {
                try {
                    userProfile = await this.userService.getProfile(userId);
                }
                catch (error) {
                    console.log('获取用户资料失败，使用默认设置:', error);
                }
            }
            const news = await this.newsService.getRecentNews(userId, userProfile);
            res.json(news);
        }
        catch (error) {
            console.error('获取新闻错误:', error);
            res.status(500).json({
                error: '获取新闻失败',
                message: error instanceof Error ? error.message : '未知错误',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
    // 获取保存的新闻
    async getSavedNews(req, res) {
        try {
            const { userId } = req.query;
            const news = await this.savedNewsService.getSavedNews(userId);
            res.json(news);
        }
        catch (error) {
            console.error('获取保存的新闻错误:', error);
            res.status(500).json({
                error: '获取保存的新闻失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 保存新闻
    async saveNews(req, res) {
        try {
            if (!req.body.title || !req.body.content) {
                return res.status(400).json({
                    error: '参数验证失败',
                    message: '标题和内容不能为空'
                });
            }
            const news = await this.savedNewsService.saveNews(req.body);
            res.json({
                success: true,
                message: '新闻保存成功',
                data: news
            });
        }
        catch (error) {
            console.error('保存新闻错误:', error);
            res.status(500).json({
                error: '保存新闻失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 更新新闻
    async updateNews(req, res) {
        try {
            const { id } = req.params;
            if (!id) {
                return res.status(400).json({
                    error: '参数验证失败',
                    message: '新闻ID不能为空'
                });
            }
            const news = await this.savedNewsService.updateNews(id, req.body);
            if (!news) {
                return res.status(404).json({
                    error: '新闻不存在',
                    message: '找不到指定的新闻'
                });
            }
            res.json({
                success: true,
                message: '新闻更新成功',
                data: news
            });
        }
        catch (error) {
            console.error('更新新闻错误:', error);
            res.status(500).json({
                error: '更新新闻失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 发布新闻
    async publishNews(req, res) {
        try {
            const { id } = req.params;
            const { platforms } = req.body;
            if (!id) {
                return res.status(400).json({
                    error: '参数验证失败',
                    message: '新闻ID不能为空'
                });
            }
            if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
                return res.status(400).json({
                    error: '参数验证失败',
                    message: '请至少选择一个发布平台'
                });
            }
            const result = await this.publishService.publishNews(id, platforms);
            res.json({
                success: result.success,
                message: result.message,
                data: result
            });
        }
        catch (error) {
            console.error('发布新闻错误:', error);
            res.status(500).json({
                error: '发布新闻失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 手动触发新闻更新
    async updateNewsFeeds(req, res) {
        try {
            const { userId } = req.query;
            let userProfile;
            if (userId) {
                try {
                    userProfile = await this.userService.getProfile(userId);
                }
                catch (error) {
                    console.log('获取用户资料失败，使用默认设置:', error);
                }
            }
            await this.newsService.updateNewsFeeds(userId, userProfile);
            res.json({ success: true, message: '新闻更新成功' });
        }
        catch (error) {
            console.error('新闻更新错误:', error);
            res.status(500).json({
                error: '新闻更新失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
    // 测试新闻API连接
    async testNewsAPI(req, res) {
        try {
            const { provider, apiKey, baseUrl } = req.body;
            if (!provider || !apiKey) {
                return res.status(400).json({
                    success: false,
                    error: '参数验证失败',
                    message: '提供商和API Key不能为空'
                });
            }
            const result = await this.newsService.testNewsAPI({
                provider: provider,
                apiKey,
                baseUrl
            });
            res.json(result);
        }
        catch (error) {
            console.error('测试新闻API错误:', error);
            res.status(500).json({
                success: false,
                error: '测试连接失败',
                message: error instanceof Error ? error.message : '未知错误'
            });
        }
    }
}
exports.NewsController = NewsController;
//# sourceMappingURL=NewsController.js.map