"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandler = exports.DatabaseError = exports.ExternalApiError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
// 自定义错误类
class AppError extends Error {
    constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.name = 'AppError';
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
// 验证错误
class ValidationError extends AppError {
    constructor(message, details) {
        super(message, 400, 'VALIDATION_ERROR');
        this.details = details;
    }
}
exports.ValidationError = ValidationError;
// 认证错误
class AuthenticationError extends AppError {
    constructor(message = '认证失败') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
// 授权错误
class AuthorizationError extends AppError {
    constructor(message = '权限不足') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
// 未找到错误
class NotFoundError extends AppError {
    constructor(resource = '资源') {
        super(`${resource}未找到`, 404, 'NOT_FOUND_ERROR');
    }
}
exports.NotFoundError = NotFoundError;
// 冲突错误
class ConflictError extends AppError {
    constructor(message = '资源冲突') {
        super(message, 409, 'CONFLICT_ERROR');
    }
}
exports.ConflictError = ConflictError;
// 速率限制错误
class RateLimitError extends AppError {
    constructor(message = '请求过于频繁') {
        super(message, 429, 'RATE_LIMIT_ERROR');
    }
}
exports.RateLimitError = RateLimitError;
// 外部 API 错误
class ExternalApiError extends AppError {
    constructor(message, service, originalError) {
        super(message, 502, 'EXTERNAL_API_ERROR');
        this.service = service;
        this.originalError = originalError;
    }
}
exports.ExternalApiError = ExternalApiError;
// 数据库错误
class DatabaseError extends AppError {
    constructor(message, operation, originalError) {
        super(message, 500, 'DATABASE_ERROR', false);
        this.operation = operation;
        this.originalError = originalError;
    }
}
exports.DatabaseError = DatabaseError;
// 错误处理器
class ErrorHandler {
    // 处理同步错误
    static handleSyncError(error) {
        if (error instanceof AppError) {
            throw error;
        }
        // 将未知错误转换为 AppError
        const appError = new AppError(error.message || '未知错误', 500, 'UNKNOWN_ERROR', false);
        throw appError;
    }
    // 处理异步错误
    static handleAsyncError(promise, context) {
        return promise.catch((error) => {
            if (error instanceof AppError) {
                throw error;
            }
            // 添加上下文信息
            const message = context
                ? `${context}: ${error.message}`
                : error.message;
            const appError = new AppError(message, 500, 'UNKNOWN_ERROR', false);
            throw appError;
        });
    }
    // 包装异步函数
    static wrapAsync(fn, context) {
        return (...args) => {
            try {
                const result = fn(...args);
                if (result instanceof Promise) {
                    return this.handleAsyncError(result, context);
                }
                return result;
            }
            catch (error) {
                if (error instanceof Error) {
                    this.handleSyncError(error);
                }
                throw error;
            }
        };
    }
    // 创建错误响应
    static createErrorResponse(error, includeStackTrace = false) {
        const response = {
            error: {
                code: error.code,
                message: error.message,
                statusCode: error.statusCode,
                timestamp: new Date().toISOString(),
            },
        };
        if (error instanceof ValidationError && error.details) {
            response.error.details = error.details;
        }
        if (includeStackTrace && error.stack) {
            response.error.stack = error.stack.split('\n');
        }
        return response;
    }
    // 记录错误
    static logError(error, context) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: 'error',
            error: {
                name: error.name,
                message: error.message,
                code: error instanceof AppError ? error.code : 'UNKNOWN',
                statusCode: error instanceof AppError ? error.statusCode : 500,
                isOperational: error instanceof AppError ? error.isOperational : false,
            },
        };
        if (context) {
            logEntry.context = context;
        }
        if (error.stack) {
            logEntry.error.stack = error.stack.split('\n');
        }
        // 记录到控制台
        console.error(JSON.stringify(logEntry, null, 2));
        // 这里可以添加其他日志输出，如文件、日志服务等
    }
    // 错误恢复策略
    static async withRetry(operation, maxRetries = 3, delayMs = 1000, context) {
        let lastError;
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    const waitTime = delayMs * Math.pow(2, attempt - 1); // 指数退避
                    console.warn(`重试 ${attempt}/${maxRetries}: ${context || '操作'} 失败，${waitTime}ms 后重试`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        throw new AppError(`操作失败，已重试 ${maxRetries} 次: ${lastError.message}`, 500, 'RETRY_FAILED');
    }
    // 安全检查
    static validateInput(input, rules) {
        const errors = [];
        // 检查必需字段
        if (rules.required) {
            for (const field of rules.required) {
                if (input[field] === undefined || input[field] === null || input[field] === '') {
                    errors.push(`字段 "${field}" 是必需的`);
                }
            }
        }
        // 检查最小长度
        if (rules.minLength) {
            for (const [field, min] of Object.entries(rules.minLength)) {
                if (input[field] && input[field].length < min) {
                    errors.push(`字段 "${field}" 长度不能少于 ${min} 个字符`);
                }
            }
        }
        // 检查最大长度
        if (rules.maxLength) {
            for (const [field, max] of Object.entries(rules.maxLength)) {
                if (input[field] && input[field].length > max) {
                    errors.push(`字段 "${field}" 长度不能超过 ${max} 个字符`);
                }
            }
        }
        // 检查正则表达式
        if (rules.pattern) {
            for (const [field, pattern] of Object.entries(rules.pattern)) {
                if (input[field] && !pattern.test(input[field])) {
                    errors.push(`字段 "${field}" 格式无效`);
                }
            }
        }
        if (errors.length > 0) {
            throw new ValidationError('输入验证失败', errors);
        }
    }
}
exports.ErrorHandler = ErrorHandler;
// 导出所有错误类和工具
exports.default = {
    AppError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    ExternalApiError,
    DatabaseError,
    ErrorHandler,
};
//# sourceMappingURL=index.js.map