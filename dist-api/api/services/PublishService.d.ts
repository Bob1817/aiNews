export declare class PublishService {
    private savedNewsService;
    constructor();
    publishNews(id: string, platforms: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    private publishToWebsite;
    private publishToWechat;
}
//# sourceMappingURL=PublishService.d.ts.map