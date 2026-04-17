import { z } from 'zod'

// 环境变量验证模式
export const envSchema = z.object({
  // 应用配置
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  HOST: z.string().default('localhost'),

  // 数据库配置
  DATABASE_URL: z.string().default('postgresql://localhost:5432/ainews'),
  DB_MAX_CONNECTIONS: z.string().transform(Number).default('10'),
  DB_TIMEOUT: z.string().transform(Number).default('10000'),

  // API 配置
  API_BASE_URL: z.string().default('http://localhost:3001'),
  API_TIMEOUT: z.string().transform(Number).default('30000'),
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().transform(Number).default('100'),

  // 安全配置
  JWT_SECRET: z.string().min(32).default('your-secret-key-change-in-production-1234567890'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:3000'),
  RATE_LIMIT_ENABLED: z.string().transform(val => val.toLowerCase() === 'true').default('true'),

  // 日志配置
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('text'),
  ENABLE_FILE_LOGGING: z.string().transform(val => val.toLowerCase() === 'true').default('false'),
  LOG_FILE_PATH: z.string().default('./logs/app.log'),

  // 新闻 API 配置
  NEWS_API_DEFAULT_KEYWORDS: z.string().default('technology,business,science,health'),
  NEWS_API_DEFAULT_INDUSTRIES: z.string().default('科技,商业,科学,医疗'),
  NEWS_API_TIMEOUT: z.string().transform(Number).default('12000'),
  NEWS_API_MAX_RETRIES: z.string().transform(Number).default('3'),

  // AI 服务配置
  AI_DEFAULT_MODEL: z.string().default('gpt-3.5-turbo'),
  AI_MAX_TOKENS: z.string().transform(Number).default('2000'),
  AI_TEMPERATURE: z.string().transform(Number).default('0.7'),
  AI_TIMEOUT: z.string().transform(Number).default('30000'),

  // 前端配置 (Vite 环境变量)
  VITE_API_BASE_URL: z.string().default('http://localhost:3001'),
})

// 环境变量类型
export type Env = z.infer<typeof envSchema>

// 环境变量验证器
export class EnvValidator {
  private validatedEnv: Env

  constructor() {
    this.validatedEnv = this.validate()
  }

  private validate(): Env {
    try {
      return envSchema.parse(process.env)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('❌ 环境变量验证失败:')
        error.errors.forEach((err) => {
          console.error(`  - ${err.path.join('.')}: ${err.message}`)
        })
        console.error('\n请检查 .env 文件或环境变量配置')
      }
      throw new Error('环境变量配置错误，请检查上述错误信息')
    }
  }

  get env(): Env {
    return this.validatedEnv
  }

  // 检查必需的环境变量
  checkRequired(): void {
    const requiredVars = ['JWT_SECRET', 'DATABASE_URL']
    const missing = requiredVars.filter(varName => !process.env[varName])

    if (missing.length > 0) {
      console.warn('⚠️  以下必需环境变量未设置:')
      missing.forEach(varName => {
        console.warn(`  - ${varName}`)
      })
      console.warn('\n应用可能无法正常工作，请设置这些环境变量')
    }
  }

  // 打印环境变量摘要 (不包含敏感信息)
  printSummary(): void {
    console.log('📋 环境变量配置摘要:')
    console.log('=' .repeat(50))

    const safeEnv = { ...this.validatedEnv }

    // 隐藏敏感信息
    if (safeEnv.JWT_SECRET) {
      safeEnv.JWT_SECRET = '***' + safeEnv.JWT_SECRET.slice(-4)
    }
    if (safeEnv.DATABASE_URL) {
      const url = new URL(safeEnv.DATABASE_URL)
      safeEnv.DATABASE_URL = `${url.protocol}//${url.hostname}:${url.port}${url.pathname}`
    }

    Object.entries(safeEnv).forEach(([key, value]) => {
      console.log(`${key}: ${value}`)
    })

    console.log('=' .repeat(50))
  }
}

// 单例环境验证器
export const envValidator = new EnvValidator()
export const env = envValidator.env