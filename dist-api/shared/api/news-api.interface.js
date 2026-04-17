"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsAdapter = void 0;
// 新闻适配器抽象类
class NewsAdapter {
    constructor(config) {
        this.config = config;
    }
    async testConnection() {
        try {
            const articles = await this.fetchNews();
            if (articles.length > 0) {
                return {
                    success: true,
                    message: `连接成功！获取到 ${articles.length} 条新闻`
                };
            }
            else {
                return {
                    success: false,
                    message: '连接成功，但没有获取到新闻'
                };
            }
        }
        catch (error) {
            const message = error instanceof Error && error.name === 'AbortError'
                ? '连接超时，请检查当前网络环境是否允许访问'
                : `连接失败: ${error.message}`;
            return { success: false, message };
        }
    }
    getConfig() {
        return this.config;
    }
    // 通用的 HTTP 请求方法
    async fetchJsonWithTimeout(url, timeoutMs = 12000) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'AINews/1.0',
                },
            });
            const data = await response.json().catch(() => null);
            return { response, data };
        }
        finally {
            clearTimeout(timeoutId);
        }
    }
    // 构建查询参数
    buildQuery(keywords) {
        return keywords.length > 0 ? keywords.join(' OR ') : 'technology';
    }
}
exports.NewsAdapter = NewsAdapter;
//# sourceMappingURL=news-api.interface.js.map