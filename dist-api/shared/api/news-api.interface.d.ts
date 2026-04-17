import { NewsArticle, UserProfile } from '../types';
export interface NewsSourceConfig {
    provider: 'newsapi' | 'guardian' | 'nytimes';
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
}
export interface INewsAPI {
    fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>;
    testConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    getConfig(): NewsSourceConfig;
    getName(): string;
}
export interface NewsAPIResponse {
    articles?: any[];
    response?: {
        results?: any[];
        docs?: any[];
    };
}
export declare abstract class NewsAdapter implements INewsAPI {
    protected config: NewsSourceConfig;
    constructor(config: NewsSourceConfig);
    abstract fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>;
    testConnection(): Promise<{
        success: boolean;
        message: string;
    }>;
    getConfig(): NewsSourceConfig;
    abstract getName(): string;
    protected fetchJsonWithTimeout(url: string, timeoutMs?: number): Promise<{
        response: Response;
        data: any;
    }>;
    protected buildQuery(keywords: string[]): string;
}
//# sourceMappingURL=news-api.interface.d.ts.map