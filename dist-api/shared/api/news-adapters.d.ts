import { NewsArticle, UserProfile } from '../types';
import { NewsAdapter } from './news-api.interface';
export declare class NewsAPIAdapter extends NewsAdapter {
    getName(): string;
    fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>;
    private shuffleArray;
}
export declare class GuardianAPIAdapter extends NewsAdapter {
    getName(): string;
    fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>;
}
export declare class NYTAPIAdapter extends NewsAdapter {
    getName(): string;
    fetchNews(userProfile?: UserProfile): Promise<NewsArticle[]>;
}
//# sourceMappingURL=news-adapters.d.ts.map