import { body, param, query } from 'express-validator'
import { User, UserProfile, NewsArticle, SavedNews, UserConfig, NewsCategory } from '../../shared/types'

// 用户验证规则
export const userValidators = {
  register: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('密码至少需要8个字符')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('密码必须包含大小写字母和数字'),
    body('username')
      .isLength({ min: 3, max: 50 })
      .withMessage('用户名长度必须在3-50个字符之间')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('用户名只能包含字母、数字、下划线和连字符'),
  ],

  login: [
    body('email')
      .isEmail()
      .withMessage('请输入有效的邮箱地址')
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .withMessage('密码不能为空'),
  ],

  updateProfile: [
    body('industries')
      .optional()
      .isArray()
      .withMessage('行业必须是数组'),
    body('industries.*')
      .optional()
      .isString()
      .withMessage('行业必须是字符串')
      .isLength({ max: 50 })
      .withMessage('行业名称不能超过50个字符'),
    body('keywords')
      .optional()
      .isArray()
      .withMessage('关键词必须是数组'),
    body('keywords.*')
      .optional()
      .isString()
      .withMessage('关键词必须是字符串')
      .isLength({ max: 100 })
      .withMessage('关键词不能超过100个字符'),
    body('preferences')
      .optional()
      .isObject()
      .withMessage('偏好设置必须是对象'),
  ],
}

// 新闻验证规则
export const newsValidators = {
  create: [
    body('title')
      .isLength({ min: 5, max: 200 })
      .withMessage('标题长度必须在5-200个字符之间')
      .trim()
      .escape(),
    body('content')
      .isLength({ min: 50 })
      .withMessage('内容至少需要50个字符')
      .trim(),
    body('source')
      .optional()
      .isLength({ max: 100 })
      .withMessage('来源不能超过100个字符')
      .trim()
      .escape(),
    body('url')
      .optional()
      .isURL()
      .withMessage('请输入有效的URL'),
    body('relatedIndustries')
      .optional()
      .isArray()
      .withMessage('相关行业必须是数组'),
    body('relatedIndustries.*')
      .optional()
      .isString()
      .withMessage('行业必须是字符串')
      .isLength({ max: 50 })
      .withMessage('行业名称不能超过50个字符'),
    body('relatedKeywords')
      .optional()
      .isArray()
      .withMessage('相关关键词必须是数组'),
    body('relatedKeywords.*')
      .optional()
      .isString()
      .withMessage('关键词必须是字符串')
      .isLength({ max: 100 })
      .withMessage('关键词不能超过100个字符'),
  ],

  update: [
    param('id')
      .notEmpty()
      .withMessage('新闻ID不能为空')
      .isLength({ max: 100 })
      .withMessage('新闻ID过长'),
    body('title')
      .optional()
      .isLength({ min: 5, max: 200 })
      .withMessage('标题长度必须在5-200个字符之间')
      .trim()
      .escape(),
    body('content')
      .optional()
      .isLength({ min: 50 })
      .withMessage('内容至少需要50个字符')
      .trim(),
  ],

  getById: [
    param('id')
      .notEmpty()
      .withMessage('新闻ID不能为空')
      .isLength({ max: 100 })
      .withMessage('新闻ID过长'),
  ],

  list: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
      .toInt(),
    query('industry')
      .optional()
      .isString()
      .withMessage('行业必须是字符串')
      .isLength({ max: 50 })
      .withMessage('行业名称不能超过50个字符'),
    query('keyword')
      .optional()
      .isString()
      .withMessage('关键词必须是字符串')
      .isLength({ max: 100 })
      .withMessage('关键词不能超过100个字符'),
  ],
}

// 保存新闻验证规则
export const savedNewsValidators = {
  save: [
    body('newsId')
      .notEmpty()
      .withMessage('新闻ID不能为空')
      .isLength({ max: 100 })
      .withMessage('新闻ID过长'),
    body('notes')
      .optional()
      .isLength({ max: 1000 })
      .withMessage('备注不能超过1000个字符')
      .trim(),
  ],

  remove: [
    param('id')
      .notEmpty()
      .withMessage('保存记录ID不能为空')
      .isLength({ max: 100 })
      .withMessage('保存记录ID过长'),
  ],
}

// 分类验证规则
export const categoryValidators = {
  create: [
    body('name')
      .isLength({ min: 2, max: 50 })
      .withMessage('分类名称长度必须在2-50个字符之间')
      .trim()
      .escape(),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('描述不能超过200个字符')
      .trim(),
  ],

  update: [
    param('id')
      .notEmpty()
      .withMessage('分类ID不能为空')
      .isLength({ max: 100 })
      .withMessage('分类ID过长'),
    body('name')
      .optional()
      .isLength({ min: 2, max: 50 })
      .withMessage('分类名称长度必须在2-50个字符之间')
      .trim()
      .escape(),
    body('description')
      .optional()
      .isLength({ max: 200 })
      .withMessage('描述不能超过200个字符')
      .trim(),
  ],
}

// AI 配置验证规则
export const aiConfigValidators = {
  update: [
    body('provider')
      .isIn(['openai', 'anthropic', 'google', 'ollama'])
      .withMessage('AI提供商必须是 openai、anthropic、google 或 ollama'),
    body('apiKey')
      .optional()
      .isLength({ min: 10 })
      .withMessage('API密钥至少需要10个字符'),
    body('modelName')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('模型名称长度必须在1-100个字符之间'),
    body('baseUrl')
      .optional()
      .isURL()
      .withMessage('请输入有效的URL'),
  ],
}

// 聊天验证规则
export const chatValidators = {
  sendMessage: [
    body('message')
      .isLength({ min: 1, max: 1000 })
      .withMessage('消息长度必须在1-1000个字符之间')
      .trim()
      .escape(),
    body('newsId')
      .optional()
      .isLength({ max: 100 })
      .withMessage('新闻ID过长'),
    body('context')
      .optional()
      .isObject()
      .withMessage('上下文必须是对象'),
  ],
}

// 通用验证规则
export const commonValidators = {
  idParam: [
    param('id')
      .notEmpty()
      .withMessage('ID不能为空')
      .isLength({ max: 100 })
      .withMessage('ID过长'),
  ],

  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('页码必须是大于0的整数')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('每页数量必须在1-100之间')
      .toInt(),
  ],

  search: [
    query('q')
      .optional()
      .isLength({ min: 1, max: 200 })
      .withMessage('搜索关键词长度必须在1-200个字符之间')
      .trim()
      .escape(),
  ],
}

// 验证规则集合
export const validators = {
  user: userValidators,
  news: newsValidators,
  savedNews: savedNewsValidators,
  category: categoryValidators,
  aiConfig: aiConfigValidators,
  chat: chatValidators,
  common: commonValidators,
}

// 导出所有验证规则
export default validators
