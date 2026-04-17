// 中间件系统主入口
export * from './security'
export * from './auth'
export * from './validators'

// 重新导出常用中间件
import securityMiddleware from './security'
import authMiddleware from './auth'
import validators from './validators'

export {
  securityMiddleware,
  authMiddleware,
  validators
}

// 默认导出安全中间件集合
export default {
  security: securityMiddleware,
  auth: authMiddleware,
  validators: validators,
}