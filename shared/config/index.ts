// 配置系统主入口
export * from './types'
export * from './env'
export * from './utils'

// 重新导出常用功能
import { env } from './env'
import { configUtils } from './utils'

export {
  env,
  configUtils
}

// 默认导出配置工具
export default configUtils