export declare class AIService {
    private newsService;
    private configService;
    constructor();
    private callOllamaAPI;
    private callLlamaCppAPI;
    private callOpenAIAPI;
    private getAIConfig;
    chat(userId: string, message: string, referencedNewsId?: string, _history?: Array<{
        role: 'user' | 'assistant';
        content: string;
    }>): Promise<{
        content: string;
    }>;
    compose(userId: string, prompt: string, referencedNewsIds?: string[]): Promise<{
        title: string;
        content: string;
    }>;
}
//# sourceMappingURL=AIService.d.ts.map