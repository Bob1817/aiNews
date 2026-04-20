import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { config } from '../../shared/config'

// JWT 令牌接口
export interface JwtPayload {
  userId: string
  email: string
  role?: string
  iat?: number
  exp?: number
}

// 认证错误类
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
    public code: string = 'UNAUTHORIZED'
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// 认证中间件
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('未提供认证令牌', 401, 'TOKEN_MISSING')
    }

    const token = authHeader.substring(7) // 移除 'Bearer ' 前缀

    // 验证令牌
    const decoded = jwt.verify(token, config.security.jwtSecret) as JwtPayload

    // 检查令牌是否过期
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      throw new AuthError('令牌已过期', 401, 'TOKEN_EXPIRED')
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role || 'user',
    }

    next()
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthError('无效的令牌', 401, 'INVALID_TOKEN'))
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthError('令牌已过期', 401, 'TOKEN_EXPIRED'))
    } else {
      next(error)
    }
  }
}

// 角色检查中间件
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AuthError('未认证', 401))
    }

    if (!roles.includes(req.user.role)) {
      return next(new AuthError('权限不足', 403, 'INSUFFICIENT_PERMISSIONS'))
    }

    next()
  }
}

// 管理员检查中间件
export const requireAdmin = requireRole('admin')

// 令牌刷新中间件
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return next(new AuthError('未认证', 401))
    }

    // 生成新令牌
    const newToken = jwt.sign(
      {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
      config.security.jwtSecret,
      { expiresIn: config.security.jwtExpiresIn as any }
    )

    // 将新令牌添加到响应头
    res.setHeader('X-New-Token', newToken)

    next()
  } catch (error) {
    next(error)
  }
}

// 令牌验证中间件（不强制要求，用于可选认证）
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7)
      const decoded = jwt.verify(token, config.security.jwtSecret) as JwtPayload

      if (decoded.exp && Date.now() < decoded.exp * 1000) {
        req.user = {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role || 'user',
        }
      }
    } catch (error) {
      // 令牌无效，但不阻止请求继续
      console.warn('可选认证失败:', error instanceof Error ? error.message : '未知错误')
    }
  }

  next()
}

// 速率限制豁免中间件（用于认证用户）
export const rateLimitExempt = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === 'admin') {
    // 管理员豁免速率限制
    req.rateLimitExempt = true
  }
  next()
}

// 请求用户中间件（确保用户信息存在）
export const requireUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AuthError('用户信息不存在', 401))
  }

  if (!req.user.id || !req.user.email) {
    return next(new AuthError('用户信息不完整', 401))
  }

  next()
}

// 会话检查中间件
export const checkSession = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 这里可以添加会话检查逻辑
    // 例如：检查用户是否在数据库中仍然存在
    // 检查用户是否被禁用等

    if (!req.user) {
      return next()
    }

    // 示例：检查用户最后活动时间
    const lastActivity = req.session?.lastActivity || 0
    const sessionTimeout = 30 * 60 * 1000 // 30分钟

    if (Date.now() - lastActivity > sessionTimeout) {
      throw new AuthError('会话已过期', 401, 'SESSION_EXPIRED')
    }

    // 更新最后活动时间
    if (req.session) {
      req.session.lastActivity = Date.now()
    }

    next()
  } catch (error) {
    next(error)
  }
}

// 认证中间件集合
export const authMiddleware = {
  authenticate,
  requireRole,
  requireAdmin,
  refreshToken,
  optionalAuth,
  rateLimitExempt,
  requireUser,
  checkSession,
}

// 导出所有中间件
export default authMiddleware

// Express 请求类型扩展
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string
      }
      rateLimitExempt?: boolean
      session?: {
        lastActivity: number
        [key: string]: any
      }
    }
  }
}