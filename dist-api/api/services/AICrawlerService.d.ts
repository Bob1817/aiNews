import { NewsArticle, UserProfile } from '../../shared/types';
interface CrawlResult {
    success: boolean;
    articles: NewsArticle[];
    error?: string;
}
export declare class AICrawlerService {
    private crawledArticles;
    private configService;
    constructor();
    crawlNews(userProfile?: UserProfile, userId?: string): Promise<CrawlResult>;
    private extractKeywords;
    private simulateCrawling;
    private getAIConfig;
    private callOllamaForNews;
    private parseOllamaNewsResponse;
    private generateMockNews;
    getCrawledNews(): NewsArticle[];
    getRandomNews(count?: number): NewsArticle[];
    testCrawler(): Promise<{
        success: boolean;
        message: string;
    }>;
    private testOllamaConnection;
}
export {};
//# sourceMappingURL=AICrawlerService.d.ts.map