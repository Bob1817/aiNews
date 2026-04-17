"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validators = exports.commonValidators = exports.chatValidators = exports.newsApiConfigValidators = exports.aiConfigValidators = exports.categoryValidators = exports.savedNewsValidators = exports.newsValidators = exports.userValidators = void 0;
const express_validator_1 = require("express-validator");
// 用户验证规则
exports.userValidators = {
    register: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .withMessage('请输入有效的邮箱地址')
            .normalizeEmail(),
        (0, express_validator_1.body)('password')
            .isLength({ min: 8 })
            .withMessage('密码至少需要8个字符')
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
            .withMessage('密码必须包含大小写字母和数字'),
        (0, express_validator_1.body)('username')
            .isLength({ min: 3, max: 50 })
            .withMessage('用户名长度必须在3-50个字符之间')
            .matches(/^[a-zA-Z0-9_-]+$/)
            .withMessage('用户名只能包含字母、数字、下划线和连字符'),
    ],
    login: [
        (0, express_validator_1.body)('email')
            .isEmail()
            .withMessage('请输入有效的邮箱地址')
            .normalizeEmail(),
        (0, express_validator_1.body)('password')
            .notEmpty()
            .withMessage('密码不能为空'),
    ],
    updateProfile: [
        (0, express_validator_1.body)('industries')
            .optional()
            .isArray()
            .withMessage('行业必须是数组'),
        (0, express_validator_1.body)('industries.*')
            .optional()
            .isString()
            .withMessage('行业必须是字符串')
            .isLength({ max: 50 })
            .withMessage('行业名称不能超过50个字符'),
        (0, express_validator_1.body)('keywords')
            .optional()
            .isArray()
            .withMessage('关键词必须是数组'),
        (0, express_validator_1.body)('keywords.*')
            .optional()
            .isString()
            .withMessage('关键词必须是字符串')
            .isLength({ max: 100 })
            .withMessage('关键词不能超过100个字符'),
        (0, express_validator_1.body)('preferences')
            .optional()
            .isObject()
            .withMessage('偏好设置必须是对象'),
    ],
};
// 新闻验证规则
exports.newsValidators = {
    create: [
        (0, express_validator_1.body)('title')
            .isLength({ min: 5, max: 200 })
            .withMessage('标题长度必须在5-200个字符之间')
            .trim()
            .escape(),
        (0, express_validator_1.body)('content')
            .isLength({ min: 50 })
            .withMessage('内容至少需要50个字符')
            .trim(),
        (0, express_validator_1.body)('source')
            .optional()
            .isLength({ max: 100 })
            .withMessage('来源不能超过100个字符')
            .trim()
            .escape(),
        (0, express_validator_1.body)('url')
            .optional()
            .isURL()
            .withMessage('请输入有效的URL'),
        (0, express_validator_1.body)('relatedIndustries')
            .optional()
            .isArray()
            .withMessage('相关行业必须是数组'),
        (0, express_validator_1.body)('relatedIndustries.*')
            .optional()
            .isString()
            .withMessage('行业必须是字符串')
            .isLength({ max: 50 })
            .withMessage('行业名称不能超过50个字符'),
        (0, express_validator_1.body)('relatedKeywords')
            .optional()
            .isArray()
            .withMessage('相关关键词必须是数组'),
        (0, express_validator_1.body)('relatedKeywords.*')
            .optional()
            .isString()
            .withMessage('关键词必须是字符串')
            .isLength({ max: 100 })
            .withMessage('关键词不能超过100个字符'),
    ],
    update: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('新闻ID不能为空')
            .isLength({ max: 100 })
            .withMessage('新闻ID过长'),
        (0, express_validator_1.body)('title')
            .optional()
            .isLength({ min: 5, max: 200 })
            .withMessage('标题长度必须在5-200个字符之间')
            .trim()
            .escape(),
        (0, express_validator_1.body)('content')
            .optional()
            .isLength({ min: 50 })
            .withMessage('内容至少需要50个字符')
            .trim(),
    ],
    getById: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('新闻ID不能为空')
            .isLength({ max: 100 })
            .withMessage('新闻ID过长'),
    ],
    list: [
        (0, express_validator_1.query)('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('页码必须是大于0的整数')
            .toInt(),
        (0, express_validator_1.query)('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('每页数量必须在1-100之间')
            .toInt(),
        (0, express_validator_1.query)('industry')
            .optional()
            .isString()
            .withMessage('行业必须是字符串')
            .isLength({ max: 50 })
            .withMessage('行业名称不能超过50个字符'),
        (0, express_validator_1.query)('keyword')
            .optional()
            .isString()
            .withMessage('关键词必须是字符串')
            .isLength({ max: 100 })
            .withMessage('关键词不能超过100个字符'),
    ],
};
// 保存新闻验证规则
exports.savedNewsValidators = {
    save: [
        (0, express_validator_1.body)('newsId')
            .notEmpty()
            .withMessage('新闻ID不能为空')
            .isLength({ max: 100 })
            .withMessage('新闻ID过长'),
        (0, express_validator_1.body)('notes')
            .optional()
            .isLength({ max: 1000 })
            .withMessage('备注不能超过1000个字符')
            .trim(),
    ],
    remove: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('保存记录ID不能为空')
            .isLength({ max: 100 })
            .withMessage('保存记录ID过长'),
    ],
};
// 分类验证规则
exports.categoryValidators = {
    create: [
        (0, express_validator_1.body)('name')
            .isLength({ min: 2, max: 50 })
            .withMessage('分类名称长度必须在2-50个字符之间')
            .trim()
            .escape(),
        (0, express_validator_1.body)('description')
            .optional()
            .isLength({ max: 200 })
            .withMessage('描述不能超过200个字符')
            .trim(),
    ],
    update: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('分类ID不能为空')
            .isLength({ max: 100 })
            .withMessage('分类ID过长'),
        (0, express_validator_1.body)('name')
            .optional()
            .isLength({ min: 2, max: 50 })
            .withMessage('分类名称长度必须在2-50个字符之间')
            .trim()
            .escape(),
        (0, express_validator_1.body)('description')
            .optional()
            .isLength({ max: 200 })
            .withMessage('描述不能超过200个字符')
            .trim(),
    ],
};
// AI 配置验证规则
exports.aiConfigValidators = {
    update: [
        (0, express_validator_1.body)('provider')
            .isIn(['openai', 'anthropic', 'google', 'ollama'])
            .withMessage('AI提供商必须是 openai、anthropic、google 或 ollama'),
        (0, express_validator_1.body)('apiKey')
            .optional()
            .isLength({ min: 10 })
            .withMessage('API密钥至少需要10个字符'),
        (0, express_validator_1.body)('modelName')
            .optional()
            .isLength({ min: 1, max: 100 })
            .withMessage('模型名称长度必须在1-100个字符之间'),
        (0, express_validator_1.body)('baseUrl')
            .optional()
            .isURL()
            .withMessage('请输入有效的URL'),
    ],
};
// 新闻 API 配置验证规则
exports.newsApiConfigValidators = {
    update: [
        (0, express_validator_1.body)('provider')
            .isIn(['newsapi', 'guardian', 'nytimes'])
            .withMessage('新闻API提供商必须是 newsapi、guardian 或 nytimes'),
        (0, express_validator_1.body)('apiKey')
            .optional()
            .isLength({ min: 10 })
            .withMessage('API密钥至少需要10个字符'),
        (0, express_validator_1.body)('baseUrl')
            .optional()
            .isURL()
            .withMessage('请输入有效的URL'),
    ],
};
// 聊天验证规则
exports.chatValidators = {
    sendMessage: [
        (0, express_validator_1.body)('message')
            .isLength({ min: 1, max: 1000 })
            .withMessage('消息长度必须在1-1000个字符之间')
            .trim()
            .escape(),
        (0, express_validator_1.body)('newsId')
            .optional()
            .isLength({ max: 100 })
            .withMessage('新闻ID过长'),
        (0, express_validator_1.body)('context')
            .optional()
            .isObject()
            .withMessage('上下文必须是对象'),
    ],
};
// 通用验证规则
exports.commonValidators = {
    idParam: [
        (0, express_validator_1.param)('id')
            .notEmpty()
            .withMessage('ID不能为空')
            .isLength({ max: 100 })
            .withMessage('ID过长'),
    ],
    pagination: [
        (0, express_validator_1.query)('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('页码必须是大于0的整数')
            .toInt(),
        (0, express_validator_1.query)('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('每页数量必须在1-100之间')
            .toInt(),
    ],
    search: [
        (0, express_validator_1.query)('q')
            .optional()
            .isLength({ min: 1, max: 200 })
            .withMessage('搜索关键词长度必须在1-200个字符之间')
            .trim()
            .escape(),
    ],
};
// 验证规则集合
exports.validators = {
    user: exports.userValidators,
    news: exports.newsValidators,
    savedNews: exports.savedNewsValidators,
    category: exports.categoryValidators,
    aiConfig: exports.aiConfigValidators,
    newsApiConfig: exports.newsApiConfigValidators,
    chat: exports.chatValidators,
    common: exports.commonValidators,
};
// 导出所有验证规则
exports.default = exports.validators;
//# sourceMappingURL=validators.js.map