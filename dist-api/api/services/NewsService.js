"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsService = void 0;
const ConfigService_1 = require("./ConfigService");
class NewsService {
    constructor() {
        Object.defineProperty(this, "configService", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.configService = new ConfigService_1.ConfigService();
        // 初始化一些模拟数据
        if (NewsService.newsArticles.length === 0) {
            this.initializeMockData();
        }
    }
    initializeMockData() {
        NewsService.newsArticles = [
            {
                id: '1',
                title: '人工智能在医疗诊断领域取得重大突破',
                content: '最新研究表明，AI 系统在某些疾病的早期诊断准确率已超过人类医生，为医疗行业带来革命性变化。',
                source: '科技日报',
                url: 'https://example.com/news/1',
                publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
                relatedIndustries: ['科技', '医疗'],
                relatedKeywords: ['人工智能', '医疗', '诊断'],
            },
            {
                id: '2',
                title: '新能源汽车销量创历史新高',
                content: '今年第三季度，全球新能源汽车销量同比增长 45%，市场渗透率首次超过 30%。',
                source: '汽车周刊',
                url: 'https://example.com/news/2',
                publishedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                relatedIndustries: ['汽车', '新能源'],
                relatedKeywords: ['新能源汽车', '销量', '市场'],
            },
            {
                id: '3',
                title: '云计算市场持续增长，企业数字化转型加速',
                content: '受企业数字化转型需求推动，全球云计算市场预计今年将突破 5000 亿美元大关。',
                source: 'IT 时报',
                url: 'https://example.com/news/3',
                publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
                relatedIndustries: ['科技', '云计算'],
                relatedKeywords: ['云计算', '数字化转型', '企业'],
            },
        ];
    }
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
    // 调用 NewsAPI
    async fetchFromNewsAPI(config, userProfile) {
        const baseUrl = config.baseUrl || 'https://newsapi.org/v2';
        const keywords = userProfile?.keywords || ['technology', 'business'];
        const industries = userProfile?.industries || ['科技'];
        const query = keywords.length > 0 ? keywords.join(' OR ') : 'technology';
        try {
            const requestUrl = `${baseUrl}/top-headlines?country=us&apiKey=${config.apiKey}&q=${encodeURIComponent(query)}&pageSize=20`;
            const { response, data } = await this.fetchJsonWithTimeout(requestUrl);
            if (!response.ok) {
                const remoteMessage = data?.message ? `: ${data.message}` : '';
                throw new Error(`NewsAPI 请求失败 ${response.status}${remoteMessage}`);
            }
            if (data.articles && Array.isArray(data.articles)) {
                return data.articles.map((article, index) => ({
                    id: `newsapi-${index}-${Date.now()}`,
                    title: article.title || '无标题',
                    content: article.description || article.content || '',
                    source: article.source?.name || '未知来源',
                    url: article.url || '',
                    publishedAt: article.publishedAt || new Date().toISOString(),
                    relatedIndustries: industries,
                    relatedKeywords: keywords,
                }));
            }
            return [];
        }
        catch (error) {
            console.error('NewsAPI 调用错误:', error);
            throw error;
        }
    }
    // 调用 The Guardian API
    async fetchFromGuardianAPI(config, userProfile) {
        const baseUrl = config.baseUrl || 'https://content.guardianapis.com';
        const keywords = userProfile?.keywords || ['technology', 'business'];
        const query = keywords.length > 0 ? keywords.join(' OR ') : 'technology';
        try {
            const requestUrl = `${baseUrl}/search?api-key=${config.apiKey}&q=${encodeURIComponent(query)}&show-fields=headline,trailText,webUrl,publicationDate&page-size=20`;
            const { response, data } = await this.fetchJsonWithTimeout(requestUrl);
            if (!response.ok) {
                const remoteMessage = data?.message ? `: ${data.message}` : '';
                throw new Error(`Guardian API 请求失败 ${response.status}${remoteMessage}`);
            }
            if (data.response?.results && Array.isArray(data.response.results)) {
                return data.response.results.map((article, index) => ({
                    id: `guardian-${index}-${Date.now()}`,
                    title: article.fields?.headline || article.webTitle || '无标题',
                    content: article.fields?.trailText || '',
                    source: 'The Guardian',
                    url: article.fields?.webUrl || article.webUrl || '',
                    publishedAt: article.fields?.publicationDate || article.webPublicationDate || new Date().toISOString(),
                    relatedIndustries: userProfile?.industries || [],
                    relatedKeywords: keywords,
                }));
            }
            return [];
        }
        catch (error) {
            console.error('Guardian API 调用错误:', error);
            throw error;
        }
    }
    // 调用 New York Times API
    async fetchFromNYTAPI(config, userProfile) {
        const baseUrl = config.baseUrl || 'https://api.nytimes.com/svc/search/v2';
        const keywords = userProfile?.keywords || ['technology', 'business'];
        const query = keywords.length > 0 ? keywords.join(' OR ') : 'technology';
        try {
            const requestUrl = `${baseUrl}/articlesearch.json?api-key=${config.apiKey}&q=${encodeURIComponent(query)}&fl=headline,abstract,web_url,pub_date,source&page=0`;
            const { response, data } = await this.fetchJsonWithTimeout(requestUrl);
            if (!response.ok) {
                const remoteMessage = data?.fault?.faultstring ? `: ${data.fault.faultstring}` : '';
                throw new Error(`NYT API 请求失败 ${response.status}${remoteMessage}`);
            }
            if (data.response?.docs && Array.isArray(data.response.docs)) {
                return data.response.docs.map((article, index) => ({
                    id: `nyt-${index}-${Date.now()}`,
                    title: article.headline?.main || '无标题',
                    content: article.abstract || '',
                    source: article.source || 'New York Times',
                    url: article.web_url || '',
                    publishedAt: article.pub_date || new Date().toISOString(),
                    relatedIndustries: userProfile?.industries || [],
                    relatedKeywords: keywords,
                }));
            }
            return [];
        }
        catch (error) {
            console.error('NYT API 调用错误:', error);
            throw error;
        }
    }
    // 获取最近新闻
    async getRecentNews(userId, userProfile) {
        if (userId) {
            try {
                const config = await this.configService.getConfig(userId);
                if (config.newsAPI?.apiKey) {
                    let articles = [];
                    switch (config.newsAPI.provider) {
                        case 'newsapi':
                            articles = await this.fetchFromNewsAPI(config.newsAPI, userProfile);
                            break;
                        case 'guardian':
                            articles = await this.fetchFromGuardianAPI(config.newsAPI, userProfile);
                            break;
                        case 'nytimes':
                            articles = await this.fetchFromNYTAPI(config.newsAPI, userProfile);
                            break;
                    }
                    if (articles.length > 0) {
                        NewsService.newsArticles = articles;
                        return articles;
                    }
                }
            }
            catch (error) {
                console.error('获取真实新闻失败，使用模拟数据:', error);
            }
        }
        // 模拟根据用户兴趣过滤新闻
        return NewsService.newsArticles;
    }
    // 更新新闻源
    async updateNewsFeeds(userId, userProfile) {
        console.log('Updating news feeds...');
        if (userId) {
            try {
                await this.getRecentNews(userId, userProfile);
            }
            catch (error) {
                console.error('更新新闻源失败:', error);
            }
        }
    }
    // 根据 ID 获取新闻
    async getNewsById(id) {
        return NewsService.newsArticles.find((news) => news.id === id) || null;
    }
    // 测试新闻 API 连接
    async testNewsAPI(config) {
        try {
            let testArticles = [];
            switch (config.provider) {
                case 'newsapi':
                    testArticles = await this.fetchFromNewsAPI(config);
                    break;
                case 'guardian':
                    testArticles = await this.fetchFromGuardianAPI(config);
                    break;
                case 'nytimes':
                    testArticles = await this.fetchFromNYTAPI(config);
                    break;
            }
            if (testArticles.length > 0) {
                return { success: true, message: `连接成功！获取到 ${testArticles.length} 条新闻` };
            }
            else {
                return { success: false, message: '连接成功，但没有获取到新闻' };
            }
        }
        catch (error) {
            const message = error instanceof Error && error.name === 'AbortError'
                ? '连接超时，请检查当前网络环境是否允许访问 NewsAPI'
                : `连接失败: ${error.message}`;
            return { success: false, message };
        }
    }
}
exports.NewsService = NewsService;
Object.defineProperty(NewsService, "newsArticles", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: []
});
