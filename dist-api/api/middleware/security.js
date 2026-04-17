"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityMiddleware = exports.securityCheck = exports.errorHandler = exports.requestLogger = exports.sqlInjectionProtection = exports.xssProtection = exports.validateInput = exports.corsConfig = exports.rateLimiter = exports.securityHeaders = void 0;
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const express_validator_1 = require("express-validator");
const config_1 = require("../../shared/config");
// 安全头中间件
exports.securityHeaders = (0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", config_1.config.api.baseUrl],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1年
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
// 速率限制中间件
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: config_1.config.api.rateLimit.windowMs,
    max: config_1.config.api.rateLimit.max,
    message: {
        error: '请求过于频繁，请稍后再试',
        status: 429,
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    keyGenerator: (req) => {
        // 使用 IP 地址作为限制键
        return req.ip || req.socket.remoteAddress || 'unknown';
    },
    handler: (req, res) => {
        res.status(429).json({
            error: '请求过于频繁',
            message: '请稍后再试',
            retryAfter: Math.ceil(config_1.config.api.rateLimit.windowMs / 1000),
        });
    },
});
// CORS 配置中间件
const corsConfig = (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && config_1.config.security.corsOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    else if (config_1.config.isDevelopment()) {
        // 开发环境允许所有来源
        res.header('Access-Control-Allow-Origin', '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
};
exports.corsConfig = corsConfig;
// 输入验证中间件
const validateInput = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(validation => validation.run(req)));
        const errors = (0, express_validator_1.validationResult)(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.status(400).json({
            error: '输入验证失败',
            details: errors.array().map(err => ({
                field: err.type === 'field' ? err.path : 'unknown',
                message: err.msg,
                value: err.value,
            })),
        });
    };
};
exports.validateInput = validateInput;
// XSS 防护中间件
const xssProtection = (req, res, next) => {
    // 清理请求体中的潜在 XSS 攻击
    const cleanObject = (obj) => {
        if (!obj || typeof obj !== 'object')
            return obj;
        if (Array.isArray(obj)) {
            return obj.map(cleanObject);
        }
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // 基本的 XSS 防护：移除脚本标签和危险属性
                cleaned[key] = value
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/on\w+="[^"]*"/gi, '')
                    .replace(/on\w+='[^']*'/gi, '')
                    .replace(/javascript:/gi, '');
            }
            else if (typeof value === 'object') {
                cleaned[key] = cleanObject(value);
            }
            else {
                cleaned[key] = value;
            }
        }
        return cleaned;
    };
    if (req.body && typeof req.body === 'object') {
        req.body = cleanObject(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = cleanObject(req.query);
    }
    next();
};
exports.xssProtection = xssProtection;
// SQL 注入防护中间件
const sqlInjectionProtection = (req, res, next) => {
    const sqlInjectionPatterns = [
        /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|EXECUTE|DECLARE)\b)/i,
        /(--|\/\*|\*\/|;)/,
        /(\b(OR|AND)\s+['"]?\d+['"]?\s*[=<>]+\s*['"]?\d+['"]?)/i,
        /(\b(OR|AND)\s+['"]?\w+['"]?\s*[=<>]+\s*['"]?\w+['"]?)/i,
    ];
    const checkValue = (value) => {
        if (typeof value === 'string') {
            return sqlInjectionPatterns.some(pattern => pattern.test(value));
        }
        if (typeof value === 'object' && value !== null) {
            return Object.values(value).some(checkValue);
        }
        return false;
    };
    const hasInjection = checkValue(req.body) ||
        checkValue(req.query) ||
        checkValue(req.params);
    if (hasInjection) {
        return res.status(400).json({
            error: '检测到潜在的安全威胁',
            message: '请求中包含可疑内容',
        });
    }
    next();
};
exports.sqlInjectionProtection = sqlInjectionProtection;
// 请求日志中间件
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
        console[logLevel]({
            timestamp: new Date().toISOString(),
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent') || 'unknown',
            contentType: req.get('content-type') || 'unknown',
        });
    });
    next();
};
exports.requestLogger = requestLogger;
// 错误处理中间件
const errorHandler = (error, req, res, next) => {
    console.error('❌ 服务器错误:', {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        error: error.message,
        stack: config_1.config.isDevelopment() ? error.stack : undefined,
        ip: req.ip || req.socket.remoteAddress,
    });
    // 根据错误类型返回不同的状态码
    let statusCode = 500;
    let message = '服务器内部错误';
    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = '输入验证失败';
    }
    else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = '未授权访问';
    }
    else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        message = '禁止访问';
    }
    else if (error.name === 'NotFoundError') {
        statusCode = 404;
        message = '资源未找到';
    }
    res.status(statusCode).json({
        error: message,
        message: config_1.config.isDevelopment() ? error.message : '请稍后重试',
        timestamp: new Date().toISOString(),
        path: req.url,
    });
};
exports.errorHandler = errorHandler;
// 安全检查中间件
const securityCheck = (req, res, next) => {
    // 检查请求大小
    const contentLength = parseInt(req.get('content-length') || '0', 10);
    if (contentLength > 10 * 1024 * 1024) { // 10MB
        return res.status(413).json({
            error: '请求体过大',
            message: '请求体不能超过 10MB',
        });
    }
    // 检查内容类型
    const contentType = req.get('content-type');
    if (req.method === 'POST' || req.method === 'PUT') {
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(415).json({
                error: '不支持的媒体类型',
                message: '只支持 application/json',
            });
        }
    }
    next();
};
exports.securityCheck = securityCheck;
// 安全中间件集合
exports.securityMiddleware = [
    exports.securityHeaders,
    exports.corsConfig,
    exports.xssProtection,
    exports.sqlInjectionProtection,
    exports.requestLogger,
    exports.securityCheck,
    exports.rateLimiter,
];
// 导出所有中间件
exports.default = {
    securityHeaders: exports.securityHeaders,
    rateLimiter: exports.rateLimiter,
    corsConfig: exports.corsConfig,
    validateInput: exports.validateInput,
    xssProtection: exports.xssProtection,
    sqlInjectionProtection: exports.sqlInjectionProtection,
    requestLogger: exports.requestLogger,
    errorHandler: exports.errorHandler,
    securityCheck: exports.securityCheck,
    securityMiddleware: exports.securityMiddleware,
};
//# sourceMappingURL=security.js.map