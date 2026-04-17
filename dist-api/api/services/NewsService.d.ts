import { NewsArticle, UserProfile } from '../../shared/types';
export declare class NewsService {
    private static newsArticles;
    private aiCrawlerService;
    constructor();
    private initializeMockData;
    getRecentNews(userId?: string, userProfile?: UserProfile): Promise<NewsArticle[]>;
    updateNewsFeeds(userId?: string, userProfile?: UserProfile): Promise<void>;
    getNewsById(id: string): Promise<NewsArticle | null>;
    testNewsAPI(_config: any): Promise<{
        success: boolean;
        message: string;
    }>;
    getSupportedProviders(): string[];
}
//# sourceMappingURL=NewsService.d.ts.map