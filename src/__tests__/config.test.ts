import { config, env, configUtils } from '../../shared/config'

describe('配置系统', () => {
  describe('默认配置', () => {
    test('应该加载默认配置', () => {
      expect(config.app.version).toBe('1.0.0')
      expect(config.app.environment).toBe('test')
    })

    test('应该包含数据库配置', () => {
      expect(config.database.url).toBeDefined()
      expect(config.database.maxConnections).toBe(10)
      expect(configUtils.getDatabaseConfig()).toEqual(config.database)
    })

    test('应该包含安全配置', () => {
      expect(config.security.jwtSecret).toBeDefined()
      expect(config.security.jwtExpiresIn).toBe('7d')
      expect(config.security.corsOrigins).toBeInstanceOf(Array)
    })
  })

  describe('环境变量', () => {
    test('应该加载环境变量', () => {
      expect(env.NODE_ENV).toBe('test')
      expect(env.JWT_SECRET).toBeDefined()
      expect(env.DATABASE_URL).toContain('postgresql://')
    })

    test('环境变量应该覆盖默认配置', () => {
      // 这里假设环境变量已经设置了不同的值
      expect(config.app.environment).toBe('test')
    })
  })

  describe('配置工具', () => {
    test('应该正确识别环境', () => {
      expect(configUtils.isDevelopment()).toBe(false)
      expect(configUtils.isProduction()).toBe(false)
      expect(configUtils.getEnvironment()).toBe('test')
    })

    test('应该获取 API URL', () => {
      expect(configUtils.getApiUrl()).toBe('http://localhost:3001')
    })

    test('应该验证配置', () => {
      const validation = configUtils.validate()
      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('配置验证', () => {
    test('应该检测无效的 JWT 密钥', () => {
      const validation = configUtils.validate()
      expect(validation.errors).toContain('JWT_SECRET 未设置或使用默认值，生产环境必须设置强密码')
    })
  })
})
