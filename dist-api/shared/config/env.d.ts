import { z } from 'zod';
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    PORT: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    HOST: z.ZodDefault<z.ZodString>;
    DATABASE_URL: z.ZodDefault<z.ZodString>;
    DB_MAX_CONNECTIONS: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    DB_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    API_BASE_URL: z.ZodDefault<z.ZodString>;
    API_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    RATE_LIMIT_WINDOW_MS: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    RATE_LIMIT_MAX: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    JWT_SECRET: z.ZodDefault<z.ZodString>;
    JWT_EXPIRES_IN: z.ZodDefault<z.ZodString>;
    CORS_ORIGINS: z.ZodDefault<z.ZodString>;
    RATE_LIMIT_ENABLED: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        error: "error";
        warn: "warn";
        info: "info";
        debug: "debug";
    }>>;
    LOG_FORMAT: z.ZodDefault<z.ZodEnum<{
        json: "json";
        text: "text";
    }>>;
    ENABLE_FILE_LOGGING: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<boolean, string>>>;
    LOG_FILE_PATH: z.ZodDefault<z.ZodString>;
    NEWS_API_DEFAULT_KEYWORDS: z.ZodDefault<z.ZodString>;
    NEWS_API_DEFAULT_INDUSTRIES: z.ZodDefault<z.ZodString>;
    NEWS_API_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    NEWS_API_MAX_RETRIES: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    AI_DEFAULT_MODEL: z.ZodDefault<z.ZodString>;
    AI_MAX_TOKENS: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    AI_TEMPERATURE: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    AI_TIMEOUT: z.ZodDefault<z.ZodPipe<z.ZodString, z.ZodTransform<number, string>>>;
    VITE_API_BASE_URL: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
export type Env = z.infer<typeof envSchema>;
export declare class EnvValidator {
    private validatedEnv;
    constructor();
    private validate;
    get env(): Env;
    checkRequired(): void;
    printSummary(): void;
}
export declare const envValidator: EnvValidator;
export declare const env: {
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
//# sourceMappingURL=env.d.ts.map