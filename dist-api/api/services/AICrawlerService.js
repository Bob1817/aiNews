"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AICrawlerService = void 0;
class AICrawlerService {
    constructor() {
        this.crawledArticles = [];
        this.keywordStopwords = new Set([
            '新闻',
            '资讯',
            '相关',
            '相关新闻',
            '推送',
            '推送一些',
            '一些',
            '帮我',
            '帮我看',
            '帮我找',
            '给我',
            '看看',
            '获取',
            '抓取',
            '搜索',
            '查找',
            '检索',
            '最新',
            '今天',
            '最近',
            '一下',
            '内容',
            '消息',
            '方向',
            '领域',
            '行业',
            '技术',
            '应用',
        ]);
        this.rssSources = [
            {
                name: 'IT之家',
                buildUrl: (_query) => 'https://www.ithome.com/rss/',
            },
            {
                name: '36氪',
                buildUrl: (_query) => 'https://36kr.com/feed',
            },
            {
                name: 'InfoQ 中文',
                buildUrl: (_query) => 'https://www.infoq.cn/feed',
            },
        ];
    }
    async crawlNews(userProfile, _userId, extraKeywords = []) {
        try {
            const keywords = this.extractKeywords(userProfile, extraKeywords);
            if (keywords.length === 0) {
                return {
                    success: false,
                    articles: [],
                    error: '未找到可用于抓取新闻的关键词',
                };
            }
            const articles = await this.fetchPublicNews(keywords);
            this.crawledArticles = articles;
            return {
                success: true,
                articles,
            };
        }
        catch (error) {
            console.error('AI 爬虫执行失败:', error);
            return {
                success: false,
                articles: [],
                error: error instanceof Error ? error.message : '未知错误',
            };
        }
    }
    normalizeKeywords(keywords) {
        return Array.from(new Set(keywords
            .map((keyword) => keyword.trim())
            .filter(Boolean)
            .map((keyword) => keyword.replace(/[，。；、/|]+/g, ' ').replace(/\s+/g, ' ').trim())
            .flatMap((keyword) => keyword.split(' '))
            .map((keyword) => keyword.trim())
            .filter((keyword) => keyword.length >= 2 && keyword.length <= 24)
            .filter((keyword) => !this.keywordStopwords.has(keyword.toLowerCase())))).slice(0, 8);
    }
    extractKeywords(userProfile, extraKeywords = []) {
        const normalizedExtraKeywords = this.normalizeKeywords(extraKeywords);
        if (normalizedExtraKeywords.length > 0) {
            return normalizedExtraKeywords;
        }
        const keywords = new Set();
        userProfile?.keywords?.forEach((keyword) => keywords.add(keyword));
        userProfile?.industries?.forEach((industry) => keywords.add(industry));
        if (keywords.size === 0) {
            return ['人工智能', '科技', '财经', '健康'];
        }
        return this.normalizeKeywords(Array.from(keywords));
    }
    async fetchPublicNews(keywords) {
        const settled = await Promise.allSettled(this.rssSources.map((source) => this.fetchFromRssSource(source.name, source.buildUrl(''), keywords)));
        const articles = settled
            .filter((result) => result.status === 'fulfilled')
            .flatMap((result) => result.value);
        if (articles.length > 0) {
            return this.dedupeArticles(articles).slice(0, 12);
        }
        const errors = settled
            .filter((result) => result.status === 'rejected')
            .map((result) => (result.reason instanceof Error ? result.reason.message : '未知抓取错误'));
        throw new Error(errors[0] || '公开互联网新闻抓取失败，请稍后重试');
    }
    async fetchFromRssSource(sourceName, url, keywords) {
        let response;
        try {
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant-NewsCrawler/1.0)',
                    Accept: 'application/rss+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8',
                },
            });
        }
        catch (error) {
            const message = error instanceof Error ? error.message : '未知网络错误';
            throw new Error(`${sourceName} 抓取失败（${message}）`);
        }
        if (!response.ok) {
            throw new Error(`${sourceName} 抓取失败（HTTP ${response.status}）`);
        }
        const xml = await response.text();
        const candidates = this.parseRssItems(xml, sourceName);
        return candidates
            .filter((item) => this.matchesKeywords(item, keywords))
            .map((item, index) => this.toArticle(item, keywords, sourceName, index));
    }
    parseRssItems(xml, sourceName) {
        const items = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
        return items.map((item, index) => {
            const title = this.extractTag(item, 'title') || `${sourceName} 新闻 ${index + 1}`;
            const description = this.cleanHtml(this.extractTag(item, 'description') || this.extractTag(item, 'content:encoded') || '');
            const rawLink = this.extractTag(item, 'link') || '';
            const guid = this.extractTag(item, 'guid') || '';
            const pubDate = this.extractTag(item, 'pubDate') || this.extractTag(item, 'published') || '';
            return {
                title: this.decodeHtml(title),
                description: this.decodeHtml(description).trim() || '暂无摘要',
                link: this.normalizeLink(rawLink || guid),
                source: sourceName,
                publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            };
        }).filter((item) => item.link);
    }
    extractTag(content, tagName) {
        const match = content.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
        return match?.[1]?.trim() || '';
    }
    cleanHtml(value) {
        return value
            .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }
    decodeHtml(value) {
        return value
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&#x2F;/g, '/')
            .replace(/&nbsp;/g, ' ');
    }
    normalizeLink(link) {
        const trimmed = this.decodeHtml(link).trim();
        if (!trimmed) {
            return '';
        }
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        return '';
    }
    matchesKeywords(item, keywords) {
        const haystack = `${item.title} ${item.description}`.toLowerCase();
        return keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
    }
    toArticle(item, keywords, sourceName, index) {
        const matchedKeywords = keywords.filter((keyword) => `${item.title} ${item.description}`.toLowerCase().includes(keyword.toLowerCase()));
        return {
            id: `${sourceName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`,
            title: item.title,
            content: item.description,
            source: item.source,
            url: item.link,
            publishedAt: item.publishedAt,
            relatedIndustries: [],
            relatedKeywords: matchedKeywords.length > 0 ? matchedKeywords : keywords.slice(0, 4),
        };
    }
    dedupeArticles(articles) {
        const seen = new Set();
        return articles.filter((article) => {
            const key = `${article.title}::${article.url}`.toLowerCase();
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
    async fetchArticleContent(url, fallbackContent = '') {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; AI-Assistant-NewsCrawler/1.0)',
                    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                },
            });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const html = await response.text();
            const normalizedHtml = html
                .replace(/<script[\s\S]*?<\/script>/gi, ' ')
                .replace(/<style[\s\S]*?<\/style>/gi, ' ')
                .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
            const articleScoped = normalizedHtml.match(/<article\b[\s\S]*?<\/article>/i)?.[0] ||
                normalizedHtml.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ||
                normalizedHtml;
            const paragraphMatches = articleScoped.match(/<p\b[^>]*>([\s\S]*?)<\/p>/gi) || [];
            const paragraphs = paragraphMatches
                .map((paragraph) => this.decodeHtml(this.cleanHtml(paragraph)))
                .map((paragraph) => paragraph.trim())
                .filter((paragraph) => paragraph.length >= 18);
            const articleText = paragraphs.slice(0, 40).join('\n\n').trim();
            if (articleText.length >= 120) {
                return articleText;
            }
            const metaDescription = normalizedHtml.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                normalizedHtml.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
                '';
            const cleanedMeta = this.decodeHtml(metaDescription).trim();
            if (cleanedMeta.length >= 40) {
                return cleanedMeta;
            }
            return fallbackContent;
        }
        catch (error) {
            console.warn('抓取新闻原文失败，回退到摘要内容:', error);
            return fallbackContent;
        }
    }
    getCrawledNews() {
        return this.crawledArticles;
    }
    getRandomNews(count = 6) {
        const shuffled = [...this.crawledArticles].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, count);
    }
    async testCrawler() {
        try {
            const result = await this.crawlNews(undefined, '1', ['人工智能']);
            return {
                success: result.success,
                message: result.success ? '公开互联网新闻抓取成功' : result.error || 'AI 爬虫连接失败',
            };
        }
        catch (error) {
            return {
                success: false,
                message: error instanceof Error ? error.message : '测试失败',
            };
        }
    }
}
exports.AICrawlerService = AICrawlerService;
//# sourceMappingURL=AICrawlerService.js.map