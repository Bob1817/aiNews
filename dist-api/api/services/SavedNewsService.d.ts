import { SavedNews } from '../../shared/types';
export declare class SavedNewsService {
    private static savedNews;
    constructor();
    private initializeMockData;
    getSavedNews(userId: string): Promise<SavedNews[]>;
    saveNews(data: {
        userId: string;
        title: string;
        content: string;
        originalNewsId?: string;
        categories?: string[];
        industries?: string[];
    }): Promise<SavedNews>;
    updateNews(id: string, data: {
        title?: string;
        content?: string;
        categories?: string[];
        industries?: string[];
    }): Promise<SavedNews>;
    getSavedNewsById(id: string): Promise<SavedNews | null>;
    updatePublishStatus(id: string, platforms: string[]): Promise<SavedNews>;
}
//# sourceMappingURL=SavedNewsService.d.ts.map