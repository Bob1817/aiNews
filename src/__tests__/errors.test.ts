import {
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
} from '../../shared/errors'

describe('错误处理系统', () => {
  describe('自定义错误类', () => {
    test('AppError 应该包含正确的属性', () => {
      const error = new AppError('测试错误', 400, 'TEST_ERROR')
      expect(error.message).toBe('测试错误')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('TEST_ERROR')
      expect(error.isOperational).toBe(true)
      expect(error.name).toBe('AppError')
    })

    test('ValidationError 应该设置正确的状态码', () => {
      const error = new ValidationError('验证失败')
      expect(error.statusCode).toBe(400)
      expect(error.code).toBe('VALIDATION_ERROR')
    })

    test('AuthenticationError 应该设置正确的状态码', () => {
      const error = new AuthenticationError()
      expect(error.statusCode).toBe(401)
      expect(error.code).toBe('AUTHENTICATION_ERROR')
    })

    test('AuthorizationError 应该设置正确的状态码', () => {
      const error = new AuthorizationError()
      expect(error.statusCode).toBe(403)
      expect(error.code).toBe('AUTHORIZATION_ERROR')
    })

    test('NotFoundError 应该设置正确的状态码', () => {
      const error = new NotFoundError('用户')
      expect(error.message).toBe('用户未找到')
      expect(error.statusCode).toBe(404)
    })

    test('ConflictError 应该设置正确的状态码', () => {
      const error = new ConflictError()
      expect(error.statusCode).toBe(409)
    })

    test('RateLimitError 应该设置正确的状态码', () => {
      const error = new RateLimitError()
      expect(error.statusCode).toBe(429)
    })

    test('ExternalApiError 应该包含服务信息', () => {
      const originalError = new Error('API 调用失败')
      const error = new ExternalApiError('外部服务错误', 'NewsAPI', originalError)
      expect(error.service).toBe('NewsAPI')
      expect(error.originalError).toBe(originalError)
      expect(error.statusCode).toBe(502)
    })

    test('DatabaseError 应该包含操作信息', () => {
      const originalError = new Error('数据库连接失败')
      const error = new DatabaseError('数据库错误', '查询用户', originalError)
      expect(error.operation).toBe('查询用户')
      expect(error.originalError).toBe(originalError)
      expect(error.isOperational).toBe(false)
    })
  })

  describe('错误处理器', () => {
    test('handleSyncError 应该重新抛出 AppError', () => {
      const appError = new AppError('测试错误')
      expect(() => ErrorHandler.handleSyncError(appError)).toThrow(appError)
    })

    test('handleSyncError 应该转换普通错误为 AppError', () => {
      const plainError = new Error('普通错误')
      expect(() => ErrorHandler.handleSyncError(plainError)).toThrow(AppError)
    })

    test('handleAsyncError 应该处理 Promise 拒绝', async () => {
      const rejectingPromise = Promise.reject(new Error('异步错误'))
      const wrappedPromise = ErrorHandler.handleAsyncError(rejectingPromise, '测试上下文')
      await expect(wrappedPromise).rejects.toThrow(AppError)
    })

    test('wrapAsync 应该包装同步函数', () => {
      const syncFunction = () => {
        throw new Error('同步错误')
      }
      const wrappedFunction = ErrorHandler.wrapAsync(syncFunction, '同步测试')
      expect(() => wrappedFunction()).toThrow(AppError)
    })

    test('wrapAsync 应该包装异步函数', async () => {
      const asyncFunction = async () => {
        throw new Error('异步错误')
      }
      const wrappedFunction = ErrorHandler.wrapAsync(asyncFunction, '异步测试')
      await expect(wrappedFunction()).rejects.toThrow(AppError)
    })

    test('createErrorResponse 应该创建正确的响应格式', () => {
      const error = new AppError('测试错误', 400, 'TEST_ERROR')
      const response = ErrorHandler.createErrorResponse(error)

      expect(response.error).toEqual({
        code: 'TEST_ERROR',
        message: '测试错误',
        statusCode: 400,
        timestamp: expect.any(String),
      })
    })

    test('createErrorResponse 应该包含验证错误详情', () => {
      const error = new ValidationError('验证失败', ['字段1无效', '字段2无效'])
      const response = ErrorHandler.createErrorResponse(error)

      expect(response.error.details).toEqual(['字段1无效', '字段2无效'])
    })

    test('validateInput 应该通过有效输入', () => {
      const input = { username: 'testuser', email: 'test@example.com' }
      const rules = {
        required: ['username', 'email'],
        minLength: { username: 3 },
        maxLength: { username: 50 },
        pattern: { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      }

      expect(() => ErrorHandler.validateInput(input, rules)).not.toThrow()
    })

    test('validateInput 应该抛出 ValidationError 对于无效输入', () => {
      const input = { username: 'ab', email: 'invalid-email' }
      const rules = {
        required: ['username', 'email'],
        minLength: { username: 3 },
        pattern: { email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      }

      expect(() => ErrorHandler.validateInput(input, rules)).toThrow(ValidationError)
    })

    test('withRetry 应该在成功时返回结果', async () => {
      const operation = jest.fn().mockResolvedValue('成功结果')
      const result = await ErrorHandler.withRetry(operation, 3, 10, '测试操作')

      expect(result).toBe('成功结果')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    test('withRetry 应该在重试后成功', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('第一次失败'))
        .mockRejectedValueOnce(new Error('第二次失败'))
        .mockResolvedValueOnce('最终成功')

      const result = await ErrorHandler.withRetry(operation, 3, 10, '测试操作')

      expect(result).toBe('最终成功')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    test('withRetry 应该在所有重试失败后抛出错误', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('总是失败'))

      await expect(
        ErrorHandler.withRetry(operation, 3, 10, '测试操作')
      ).rejects.toThrow(AppError)

      expect(operation).toHaveBeenCalledTimes(3)
    })
  })
})