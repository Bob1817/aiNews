"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configUtils = exports.ConfigUtils = void 0;
const env_1 = require("./env");
const fs_1 = __importDefault(require("fs"));
// 配置工具类
class ConfigUtils {
    // 初始化配置系统
    static initialize() {
        console.log('🔧 初始化配置系统...');
        // 验证环境变量
        env_1.envValidator.checkRequired();
        // 打印配置摘要
        if (configLoader.isDevelopment()) {
            env_1.envValidator.printSummary();
        }
        // 创建必要的目录
        this.createRequiredDirectories();
        console.log('✅ 配置系统初始化完成');
    }
    // 创建必要的目录
    static createRequiredDirectories() {
        const directories = [
            './logs',
            './dist',
            './dist-api',
            './dist-electron',
        ];
        directories.forEach(dir => {
            if (!fs_1.default.existsSync(dir)) {
                fs_1.default.mkdirSync(dir, { recursive: true });
                console.log(`📁 创建目录: ${dir}`);
            }
        });
    }
    // 获取当前环境
    static getEnvironment() {
        return config.app.environment;
    }
    // 检查是否是开发环境
    static isDevelopment() {
        return configLoader.isDevelopment();
    }
    // 检查是否是生产环境
    static isProduction() {
        return configLoader.isProduction();
    }
    // 获取 API URL
    static getApiUrl() {
        return config.api.baseUrl;
    }
    // 获取前端 API URL (Vite 环境变量)
    static getFrontendApiUrl() {
        return env_1.env.VITE_API_BASE_URL || config.api.baseUrl;
    }
    // 获取数据库配置
    static getDatabaseConfig() {
        return config.database;
    }
    // 获取安全配置
    static getSecurityConfig() {
        return config.security;
    }
    // 获取日志配置
    static getLoggingConfig() {
        return config.logging;
    }
    // 获取新闻 API 默认配置
    static getNewsApiDefaults() {
        return config.newsApi;
    }
    // 获取 AI 服务配置
    static getAIServiceConfig() {
        return config.aiService;
    }
    // 获取 Electron 配置
    static getElectronConfig() {
        return config.electron;
    }
    // 获取完整的配置对象
    static getConfig() {
        return config;
    }
    // 获取环境变量对象
    static getEnv() {
        return env_1.env;
    }
    // 验证配置完整性
    static validate() {
        const errors = [];
        // 检查必需配置
        if (!config.security.jwtSecret || config.security.jwtSecret.includes('change-in-production')) {
            errors.push('JWT_SECRET 未设置或使用默认值，生产环境必须设置强密码');
        }
        if (config.isProduction() && config.database.url.includes('localhost')) {
            errors.push('生产环境不应使用本地数据库');
        }
        if (config.api.timeout < 1000) {
            errors.push('API 超时时间太短，建议至少 5000ms');
        }
        return {
            valid: errors.length === 0,
            errors
        };
    }
    // 生成配置报告
    static generateReport() {
        const validation = this.validate();
        let report = `# 配置系统报告\n`;
        report += `生成时间: ${new Date().toISOString()}\n`;
        report += `环境: ${this.getEnvironment()}\n`;
        report += `应用版本: ${config.app.version}\n\n`;
        report += `## 配置验证\n`;
        report += `状态: ${validation.valid ? '✅ 通过' : '❌ 失败'}\n`;
        if (validation.errors.length > 0) {
            report += `错误:\n`;
            validation.errors.forEach(error => {
                report += `  - ${error}\n`;
            });
        }
        report += `\n## 关键配置\n`;
        report += `API URL: ${this.getApiUrl()}\n`;
        report += `数据库: ${config.database.url.replace(/:[^:]*@/, ':****@')}\n`;
        report += `JWT 过期时间: ${config.security.jwtExpiresIn}\n`;
        report += `CORS 来源: ${config.security.corsOrigins.join(', ')}\n`;
        report += `\n## 性能配置\n`;
        report += `API 超时: ${config.api.timeout}ms\n`;
        report += `数据库连接数: ${config.database.maxConnections}\n`;
        report += `速率限制: ${config.api.rateLimit.max} 请求/${config.api.rateLimit.windowMs / 60000}分钟\n`;
        return report;
    }
    // 保存配置报告到文件
    static saveReportToFile(filePath = './config-report.md') {
        const report = this.generateReport();
        fs_1.default.writeFileSync(filePath, report, 'utf-8');
        console.log(`📄 配置报告已保存到: ${filePath}`);
    }
}
exports.ConfigUtils = ConfigUtils;
// 导出单例工具
exports.configUtils = ConfigUtils;
//# sourceMappingURL=utils.js.map