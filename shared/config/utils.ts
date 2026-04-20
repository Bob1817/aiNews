import { envValidator, env } from './env'
import fs from 'fs'

// 默认配置对象
const config = {
  app: {
    environment: env.NODE_ENV,
    version: '1.0.0'
  },
  api: {
    baseUrl: env.API_BASE_URL,
    timeout: env.API_TIMEOUT,
    rateLimit: {
      max: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW_MS
    }
  },
  database: {
    url: env.DATABASE_URL,
    maxConnections: env.DB_MAX_CONNECTIONS
  },
  security: {
    jwtSecret: env.JWT_SECRET,
    jwtExpiresIn: env.JWT_EXPIRES_IN,
    corsOrigins: env.CORS_ORIGINS.split(',')
  },
  logging: {
    level: env.LOG_LEVEL,
    format: env.LOG_FORMAT,
    fileLogging: env.ENABLE_FILE_LOGGING,
    filePath: env.LOG_FILE_PATH
  },
  newsApi: {
    defaultKeywords: env.NEWS_API_DEFAULT_KEYWORDS.split(','),
    defaultIndustries: env.NEWS_API_DEFAULT_INDUSTRIES.split(','),
    timeout: env.NEWS_API_TIMEOUT,
    maxRetries: env.NEWS_API_MAX_RETRIES
  },
  aiService: {
    defaultModel: env.AI_DEFAULT_MODEL,
    maxTokens: env.AI_MAX_TOKENS,
    temperature: env.AI_TEMPERATURE,
    timeout: env.AI_TIMEOUT
  },
  electron: {
    // Electron 相关配置
  },
  isDevelopment: () => env.NODE_ENV === 'development',
  isProduction: () => env.NODE_ENV === 'production'
}

// 配置加载器
const configLoader = {
  isDevelopment: () => env.NODE_ENV === 'development',
  isProduction: () => env.NODE_ENV === 'production'
}

// 配置工具类
export class ConfigUtils {
  // 初始化配置系统
  static initialize(): void {
    console.log('🔧 初始化配置系统...')

    // 验证环境变量
    envValidator.checkRequired()

    // 打印配置摘要
    if (configLoader.isDevelopment()) {
      envValidator.printSummary()
    }

    // 创建必要的目录
    this.createRequiredDirectories()

    console.log('✅ 配置系统初始化完成')
  }

  // 创建必要的目录
  private static createRequiredDirectories(): void {
    const directories = [
      './logs',
      './dist',
      './dist-api',
      './dist-electron',
    ]

    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 创建目录: ${dir}`)
      }
    })
  }

  // 获取当前环境
  static getEnvironment(): string {
    return config.app.environment
  }

  // 检查是否是开发环境
  static isDevelopment(): boolean {
    return configLoader.isDevelopment()
  }

  // 检查是否是生产环境
  static isProduction(): boolean {
    return configLoader.isProduction()
  }

  // 获取 API URL
  static getApiUrl(): string {
    return config.api.baseUrl
  }

  // 获取前端 API URL (Vite 环境变量)
  static getFrontendApiUrl(): string {
    return env.VITE_API_BASE_URL || config.api.baseUrl
  }

  // 获取数据库配置
  static getDatabaseConfig() {
    return config.database
  }

  // 获取安全配置
  static getSecurityConfig() {
    return config.security
  }

  // 获取日志配置
  static getLoggingConfig() {
    return config.logging
  }

  // 获取新闻 API 默认配置
  static getNewsApiDefaults() {
    return config.newsApi
  }

  // 获取 AI 服务配置
  static getAIServiceConfig() {
    return config.aiService
  }

  // 获取 Electron 配置
  static getElectronConfig() {
    return config.electron
  }

  // 获取完整的配置对象
  static getConfig() {
    return config
  }

  // 获取环境变量对象
  static getEnv() {
    return env
  }

  // 验证配置完整性
  static validate(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    // 检查必需配置
    if (!config.security.jwtSecret || config.security.jwtSecret.includes('change-in-production')) {
      errors.push('JWT_SECRET 未设置或使用默认值，生产环境必须设置强密码')
    }

    if (config.isProduction() && config.database.url.includes('localhost')) {
      errors.push('生产环境不应使用本地数据库')
    }

    if (config.api.timeout < 1000) {
      errors.push('API 超时时间太短，建议至少 5000ms')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }

  // 生成配置报告
  static generateReport(): string {
    const validation = this.validate()

    let report = `# 配置系统报告\n`
    report += `生成时间: ${new Date().toISOString()}\n`
    report += `环境: ${this.getEnvironment()}\n`
    report += `应用版本: ${config.app.version}\n\n`

    report += `## 配置验证\n`
    report += `状态: ${validation.valid ? '✅ 通过' : '❌ 失败'}\n`
    if (validation.errors.length > 0) {
      report += `错误:\n`
      validation.errors.forEach(error => {
        report += `  - ${error}\n`
      })
    }

    report += `\n## 关键配置\n`
    report += `API URL: ${this.getApiUrl()}\n`
    report += `数据库: ${config.database.url.replace(/:[^:]*@/, ':****@')}\n`
    report += `JWT 过期时间: ${config.security.jwtExpiresIn}\n`
    report += `CORS 来源: ${config.security.corsOrigins.join(', ')}\n`

    report += `\n## 性能配置\n`
    report += `API 超时: ${config.api.timeout}ms\n`
    report += `数据库连接数: ${config.database.maxConnections}\n`
    report += `速率限制: ${config.api.rateLimit.max} 请求/${config.api.rateLimit.windowMs / 60000}分钟\n`

    return report
  }

  // 保存配置报告到文件
  static saveReportToFile(filePath: string = './config-report.md'): void {
    const report = this.generateReport()
    fs.writeFileSync(filePath, report, 'utf-8')
    console.log(`📄 配置报告已保存到: ${filePath}`)
  }
}

// 导出单例工具
export const configUtils = ConfigUtils
export { config, configLoader }