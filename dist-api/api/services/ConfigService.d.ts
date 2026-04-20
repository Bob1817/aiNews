import { UserConfig } from '../../shared/types';
export declare class ConfigService {
    private static userConfigs;
    constructor();
    private initializeMockData;
    getConfig(userId: string): Promise<UserConfig>;
    saveConfig(userId: string, configData: any): Promise<UserConfig>;
    switchAIModel(userId: string, modelId: string): Promise<UserConfig>;
    deleteAIModel(userId: string, modelId: string): Promise<UserConfig>;
}
//# sourceMappingURL=ConfigService.d.ts.map