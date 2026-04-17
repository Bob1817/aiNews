export declare class ConfigUtils {
    static initialize(): void;
    private static createRequiredDirectories;
    static getEnvironment(): string;
    static isDevelopment(): boolean;
    static isProduction(): boolean;
    static getApiUrl(): string;
    static getFrontendApiUrl(): string;
    static getDatabaseConfig(): any;
    static getSecurityConfig(): any;
    static getLoggingConfig(): any;
    static getNewsApiDefaults(): any;
    static getAIServiceConfig(): any;
    static getElectronConfig(): any;
    static getConfig(): any;
    static getEnv(): {
        NODE_ENV: "development" | "production" | "test";
        PORT: number;
        HOST: string;
        DATABASE_URL: string;
        DB_MAX_CONNECTIONS: number;
        DB_TIMEOUT: number;
        API_BASE_URL: string;
        API_TIMEOUT: number;
        RATE_LIMIT_WINDOW_MS: number;
        RATE_LIMIT_MAX: number;
        JWT_SECRET: string;
        JWT_EXPIRES_IN: string;
        CORS_ORIGINS: string;
        RATE_LIMIT_ENABLED: boolean;
        LOG_LEVEL: "error" | "warn" | "info" | "debug";
        LOG_FORMAT: "json" | "text";
        ENABLE_FILE_LOGGING: boolean;
        LOG_FILE_PATH: string;
        NEWS_API_DEFAULT_KEYWORDS: string;
        NEWS_API_DEFAULT_INDUSTRIES: string;
        NEWS_API_TIMEOUT: number;
        NEWS_API_MAX_RETRIES: number;
        AI_DEFAULT_MODEL: string;
        AI_MAX_TOKENS: number;
        AI_TEMPERATURE: number;
        AI_TIMEOUT: number;
        VITE_API_BASE_URL: string;
    };
    static validate(): {
        valid: boolean;
        errors: string[];
    };
    static generateReport(): string;
    static saveReportToFile(filePath?: string): void;
}
export declare const configUtils: typeof ConfigUtils;
//# sourceMappingURL=utils.d.ts.map