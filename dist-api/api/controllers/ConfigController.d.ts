import { Request, Response } from 'express';
export declare class ConfigController {
    private configService;
    private aiCrawlerService;
    constructor();
    private testLlamaCppConnection;
    getConfig(req: Request, res: Response): Promise<void>;
    saveConfig(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    switchAIModel(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    deleteAIModel(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    testAIModel(req: Request, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
}
//# sourceMappingURL=ConfigController.d.ts.map