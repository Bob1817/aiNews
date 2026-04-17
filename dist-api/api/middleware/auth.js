"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.checkSession = exports.requireUser = exports.rateLimitExempt = exports.optionalAuth = exports.refreshToken = exports.requireAdmin = exports.requireRole = exports.authenticate = exports.AuthError = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../../shared/config");
// 认证错误类
class AuthError extends Error {
    constructor(message, statusCode = 401, code = 'UNAUTHORIZED') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AuthError';
    }
}
exports.AuthError = AuthError;
// 认证中间件
const authenticate = async (req, res, next) => {
    try {
        // 从请求头获取令牌
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AuthError('未提供认证令牌', 401, 'TOKEN_MISSING');
        }
        const token = authHeader.substring(7); // 移除 'Bearer ' 前缀
        // 验证令牌
        const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
        // 检查令牌是否过期
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
            throw new AuthError('令牌已过期', 401, 'TOKEN_EXPIRED');
        }
        // 将用户信息添加到请求对象
        req.user = {
            id: decoded.userId,
            email: decoded.email,
            role: decoded.role || 'user',
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            next(new AuthError('无效的令牌', 401, 'INVALID_TOKEN'));
        }
        else if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            next(new AuthError('令牌已过期', 401, 'TOKEN_EXPIRED'));
        }
        else {
            next(error);
        }
    }
};
exports.authenticate = authenticate;
// 角色检查中间件
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new AuthError('未认证', 401));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AuthError('权限不足', 403, 'INSUFFICIENT_PERMISSIONS'));
        }
        next();
    };
};
exports.requireRole = requireRole;
// 管理员检查中间件
exports.requireAdmin = (0, exports.requireRole)('admin');
// 令牌刷新中间件
const refreshToken = async (req, res, next) => {
    try {
        if (!req.user) {
            return next(new AuthError('未认证', 401));
        }
        // 生成新令牌
        const newToken = jsonwebtoken_1.default.sign({
            userId: req.user.id,
            email: req.user.email,
            role: req.user.role,
        }, config_1.config.security.jwtSecret, { expiresIn: config_1.config.security.jwtExpiresIn });
        // 将新令牌添加到响应头
        res.setHeader('X-New-Token', newToken);
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.refreshToken = refreshToken;
// 令牌验证中间件（不强制要求，用于可选认证）
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.substring(7);
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.security.jwtSecret);
            if (decoded.exp && Date.now() < decoded.exp * 1000) {
                req.user = {
                    id: decoded.userId,
                    email: decoded.email,
                    role: decoded.role || 'user',
                };
            }
        }
        catch (error) {
            // 令牌无效，但不阻止请求继续
            console.warn('可选认证失败:', error instanceof Error ? error.message : '未知错误');
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
// 速率限制豁免中间件（用于认证用户）
const rateLimitExempt = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        // 管理员豁免速率限制
        req.rateLimitExempt = true;
    }
    next();
};
exports.rateLimitExempt = rateLimitExempt;
// 请求用户中间件（确保用户信息存在）
const requireUser = (req, res, next) => {
    if (!req.user) {
        return next(new AuthError('用户信息不存在', 401));
    }
    if (!req.user.id || !req.user.email) {
        return next(new AuthError('用户信息不完整', 401));
    }
    next();
};
exports.requireUser = requireUser;
// 会话检查中间件
const checkSession = async (req, res, next) => {
    try {
        // 这里可以添加会话检查逻辑
        // 例如：检查用户是否在数据库中仍然存在
        // 检查用户是否被禁用等
        if (!req.user) {
            return next();
        }
        // 示例：检查用户最后活动时间
        const lastActivity = req.session?.lastActivity || 0;
        const sessionTimeout = 30 * 60 * 1000; // 30分钟
        if (Date.now() - lastActivity > sessionTimeout) {
            throw new AuthError('会话已过期', 401, 'SESSION_EXPIRED');
        }
        // 更新最后活动时间
        if (req.session) {
            req.session.lastActivity = Date.now();
        }
        next();
    }
    catch (error) {
        next(error);
    }
};
exports.checkSession = checkSession;
// 认证中间件集合
exports.authMiddleware = {
    authenticate: exports.authenticate,
    requireRole: exports.requireRole,
    requireAdmin: exports.requireAdmin,
    refreshToken: exports.refreshToken,
    optionalAuth: exports.optionalAuth,
    rateLimitExempt: exports.rateLimitExempt,
    requireUser: exports.requireUser,
    checkSession: exports.checkSession,
};
// 导出所有中间件
exports.default = exports.authMiddleware;
//# sourceMappingURL=auth.js.map