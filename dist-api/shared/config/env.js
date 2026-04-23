"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envValidator = exports.EnvValidator = exports.envSchema = void 0;
const zod_1 = require("zod");
// 环境变量验证模式
exports.envSchema = zod_1.z.object({
    // 应用配置
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    PORT: zod_1.z.preprocess(Number, zod_1.z.number()).default(3001),
    HOST: zod_1.z.string().default('0.0.0.0'),
    // 数据库配置
    DATABASE_URL: zod_1.z.string().default('postgresql://localhost:5432/ainews'),
    DB_MAX_CONNECTIONS: zod_1.z.preprocess(Number, zod_1.z.number()).default(10),
    DB_TIMEOUT: zod_1.z.preprocess(Number, zod_1.z.number()).default(10000),
    // API 配置
    API_BASE_URL: zod_1.z.string().default('http://localhost:3001'),
    API_TIMEOUT: zod_1.z.preprocess(Number, zod_1.z.number()).default(30000),
    RATE_LIMIT_WINDOW_MS: zod_1.z.preprocess(Number, zod_1.z.number()).default(900000), // 15 minutes
    RATE_LIMIT_MAX: zod_1.z.preprocess(Number, zod_1.z.number()).default(100),
    // 安全配置
    JWT_SECRET: zod_1.z.string().min(32).default('your-secret-key-change-in-production-1234567890'),
    JWT_EXPIRES_IN: zod_1.z.string().default('7d'),
    CORS_ORIGINS: zod_1.z.string().default('http://localhost:5173,http://localhost:3000'),
    RATE_LIMIT_ENABLED: zod_1.z.preprocess((val) => val === 'true', zod_1.z.boolean()).default(true),
    // 日志配置
    LOG_LEVEL: zod_1.z.enum(['error', 'warn', 'info', 'debug']).default('info'),
    LOG_FORMAT: zod_1.z.enum(['json', 'text']).default('text'),
    ENABLE_FILE_LOGGING: zod_1.z.preprocess((val) => val === 'true', zod_1.z.boolean()).default(false),
    LOG_FILE_PATH: zod_1.z.string().default('./logs/app.log'),
    // 新闻 API 配置
    NEWS_API_DEFAULT_KEYWORDS: zod_1.z.string().default('technology,business,science,health'),
    NEWS_API_DEFAULT_INDUSTRIES: zod_1.z.string().default('科技,商业,科学,医疗'),
    NEWS_API_TIMEOUT: zod_1.z.preprocess(Number, zod_1.z.number()).default(12000),
    NEWS_API_MAX_RETRIES: zod_1.z.preprocess(Number, zod_1.z.number()).default(3),
    // AI 服务配置
    AI_DEFAULT_MODEL: zod_1.z.string().default('gpt-3.5-turbo'),
    AI_MAX_TOKENS: zod_1.z.preprocess(Number, zod_1.z.number()).default(2000),
    AI_TEMPERATURE: zod_1.z.preprocess(Number, zod_1.z.number()).default(0.7),
    AI_TIMEOUT: zod_1.z.preprocess(Number, zod_1.z.number()).default(30000),
    // 前端配置 (Vite 环境变量)
    VITE_API_BASE_URL: zod_1.z.string().default('http://localhost:3001'),
});
// 环境变量验证器
class EnvValidator {
    constructor() {
        this.validatedEnv = this.validate();
    }
    validate() {
        try {
            return exports.envSchema.parse(process.env);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                console.error('❌ 环境变量验证失败:');
                error.issues.forEach((err) => {
                    console.error(`  - ${err.path.join('.')}: ${err.message}`);
                });
                console.error('\n请检查 .env 文件或环境变量配置');
            }
            throw new Error('环境变量配置错误，请检查上述错误信息');
        }
    }
    get env() {
        return this.validatedEnv;
    }
    // 检查必需的环境变量
    checkRequired() {
        const requiredVars = ['JWT_SECRET', 'DATABASE_URL'];
        const missing = requiredVars.filter(varName => !process.env[varName]);
        if (missing.length > 0) {
            console.warn('⚠️  以下必需环境变量未设置:');
            missing.forEach(varName => {
                console.warn(`  - ${varName}`);
            });
            console.warn('\n应用可能无法正常工作，请设置这些环境变量');
        }
    }
    // 打印环境变量摘要 (不包含敏感信息)
    printSummary() {
        console.log('📋 环境变量配置摘要:');
        console.log('='.repeat(50));
        const safeEnv = { ...this.validatedEnv };
        // 隐藏敏感信息
        if (safeEnv.JWT_SECRET) {
            safeEnv.JWT_SECRET = '***' + safeEnv.JWT_SECRET.slice(-4);
        }
        if (safeEnv.DATABASE_URL) {
            const url = new URL(safeEnv.DATABASE_URL);
            safeEnv.DATABASE_URL = `${url.protocol}//${url.hostname}:${url.port}${url.pathname}`;
        }
        Object.entries(safeEnv).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });
        console.log('='.repeat(50));
    }
}
exports.EnvValidator = EnvValidator;
// 单例环境验证器
exports.envValidator = new EnvValidator();
exports.env = exports.envValidator.env;
//# sourceMappingURL=env.js.map