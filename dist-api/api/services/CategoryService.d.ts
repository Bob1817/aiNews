import { NewsCategory } from '../../shared/types';
export declare class CategoryService {
    private static categories;
    constructor();
    private initializeMockData;
    getCategories(): Promise<NewsCategory[]>;
    getCategoryById(id: string): Promise<NewsCategory | null>;
    createCategory(data: {
        name: string;
        description?: string;
    }): Promise<NewsCategory>;
    updateCategory(id: string, data: {
        name?: string;
        description?: string;
    }): Promise<NewsCategory>;
    deleteCategory(id: string): Promise<boolean>;
}
//# sourceMappingURL=CategoryService.d.ts.map