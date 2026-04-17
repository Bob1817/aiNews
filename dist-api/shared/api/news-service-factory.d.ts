import { NewsArticle, UserProfile } from '../types';
import { INewsAPI, NewsSourceConfig } from './news-api.interface';
export declare class NewsServiceFactory {
    static createNewsAPI(config: NewsSourceConfig): INewsAPI;
    static getSupportedProviders(): Array<{
        id: 'newsapi' | 'guardian' | 'nytimes';
        name: string;
        description: string;
    }>;
    static fetchNewsFromMultipleSources(configs: NewsSourceConfig[], userProfile?: UserProfile): Promise<NewsArticle[]>;
    static testMultipleSources(configs: NewsSourceConfig[]): Promise<Array<{
        provider: string;
        success: boolean;
        message: string;
    }>>;
    static getDefaultConfig(provider: 'newsapi' | 'guardian' | 'nytimes'): NewsSourceConfig;
}
//# sourceMappingURL=news-service-factory.d.ts.map