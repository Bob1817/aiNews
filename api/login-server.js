const express = require('express');
const app = express();
const PORT = 3002;

// 基础中间件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS 中间件
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 用户登录
app.post('/api/user/login', (req, res) => {
  try {
    console.log('登录请求:', req.body);
    const { email, password } = req.body;
    
    // 模拟登录验证
    if (email && password) {
      res.json({
        user: {
          id: '1',
          email: email,
          name: '测试用户'
        },
        profile: {
          id: '1',
          userId: '1',
          name: '测试用户',
          avatar: '',
          bio: '',
          keywords: ['人工智能', '科技', '财经'],
          industries: ['科技', '财经'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: '参数错误',
        message: '请提供邮箱和密码'
      });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({
      success: false,
      error: '登录失败',
      message: error.message || '未知错误'
    });
  }
});

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'development'
  });
});

// 404 处理
app.use('*', (_req, res) => {
  console.log('404 请求:', _req.originalUrl);
  res.status(404).json({
    error: '未找到资源',
    message: '请求的 API 端点不存在',
    path: _req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 登录服务器启动成功');
  console.log('=' .repeat(50));
  console.log(`端口: ${PORT}`);
  console.log(`环境: development`);
  console.log(`地址: http://localhost:${PORT}`);
  console.log('=' .repeat(50));
  console.log('可用端点:');
  console.log('- GET /api/health - 健康检查');
  console.log('- POST /api/user/login - 用户登录');
  console.log('=' .repeat(50));
});
