import { SavedNews } from '../../shared/types';
export declare class SavedNewsRepository {
    private supabase;
    getSavedNews(userId: string): Promise<SavedNews[]>;
    getSavedNewsById(id: string): Promise<SavedNews | null>;
    saveNews(userId: string, data: {
        title: string;
        content: string;
        originalNewsId?: string;
        categories?: string[];
        industries?: string[];
    }): Promise<SavedNews | null>;
    updateNews(id: string, data: {
        title?: string;
        content?: string;
        categories?: string[];
        industries?: string[];
    }): Promise<SavedNews | null>;
    updatePublishStatus(id: string, platforms: string[]): Promise<SavedNews | null>;
}
//# sourceMappingURL=SavedNewsRepository.d.ts.map