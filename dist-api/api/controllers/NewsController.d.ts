import { Request, Response } from 'express';
export declare class NewsController {
    private newsService;
    private savedNewsService;
    private publishService;
    private userService;
    constructor();
    getRecentNews(req: Request, res: Response): Promise<void>;
    getSavedNews(req: Request, res: Response): Promise<void>;
    saveNews(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateNews(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    publishNews(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    updateNewsFeeds(req: Request, res: Response): Promise<void>;
    testNewsAPI(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=NewsController.d.ts.map