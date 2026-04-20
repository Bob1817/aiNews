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

// 模拟配置数据
const mockConfig = {
  id: '1',
  userId: '1',
  aiModel: {
    id: 'default-ollama',
    name: '默认 Ollama 模型',
    provider: 'ollama',
    apiKey: '',
    modelName: 'gemma4:latest',
    baseUrl: 'http://localhost:11434',
  },
  aiModels: [
    {
      id: 'default-ollama',
      name: '默认 Ollama 模型',
      provider: 'ollama',
      apiKey: '',
      modelName: 'gemma4:latest',
      baseUrl: 'http://localhost:11434',
      isActive: true,
    },
  ],
  newsAPI: {
    provider: 'newsapi',
    apiKey: process.env.NEWSAPI_API_KEY || '70803be67f5d4647b6e54a35f0615d25',
    baseUrl: 'https://newsapi.org/v2',
  },
  publishPlatforms: {
    website: {
      apiUrl: 'https://api.example.com/news',
      apiKey: 'api_key_123',
    },
    wechat: {
      appId: 'wx1234567890',
      appSecret: 'secret_123',
      token: 'token_123',
    },
  },
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
};

async function testLlamaCppConnection(aiModel) {
  const baseUrl = (aiModel.baseUrl || 'http://localhost:8080').replace(/\/$/, '');
  const headers = {
    'Content-Type': 'application/json',
  };

  if (aiModel.apiKey) {
    headers.Authorization = `Bearer ${aiModel.apiKey}`;
  }

  try {
    const chatResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: aiModel.modelName || 'llama.cpp',
        messages: [{ role: 'user', content: '测试连接，请简短回复。' }],
        max_tokens: 16,
      }),
    });

    if (chatResponse.ok) {
      return { success: true, message: 'llama.cpp 模型连接成功' };
    }
  } catch (error) {
    console.warn('llama.cpp chat/completions 测试失败，尝试 completion 回退:', error);
  }

  try {
    const completionResponse = await fetch(`${baseUrl}/completion`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        prompt: '测试连接，请简短回复。',
        n_predict: 16,
        stream: false,
      }),
    });

    if (completionResponse.ok) {
      return { success: true, message: 'llama.cpp 模型连接成功' };
    }

    return {
      success: false,
      message: `llama.cpp 模型连接失败: ${completionResponse.status}`,
    };
  } catch (error) {
    return {
      success: false,
      message: '无法连接到 llama.cpp 模型，请检查服务是否正在运行',
    };
  }
}

// 测试 Ollama 模型连通性
async function testOllamaConnection() {
  const baseUrl = 'http://localhost:11434';
  
  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ollama API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    
    // 检查模型是否存在
    const hasGemmaModel = data.models?.some(model => model.name.includes('gemma'));
    if (!hasGemmaModel) {
      return {
        success: false,
        message: '未找到 gemma 模型，请确保已在 Ollama 中安装 gemma 模型'
      };
    }

    return {
      success: true,
      message: 'Ollama gemma 模型连接成功'
    };
  } catch (error) {
    console.error('Ollama 连接测试错误:', error);
    return {
      success: false,
      message: 'Ollama 服务不可用，请确保 Ollama 正在运行并安装了 gemma 模型'
    };
  }
}

// 配置路由
app.get('/api/config', (req, res) => {
  res.json(mockConfig);
});

app.post('/api/config', (req, res) => {
  Object.assign(mockConfig, {
    ...mockConfig,
    ...req.body,
    aiModel: req.body.aiModel || mockConfig.aiModel,
    aiModels: req.body.aiModels || mockConfig.aiModels,
    updatedAt: new Date().toISOString(),
  });
  res.json(mockConfig);
});

app.put('/api/config', (req, res) => {
  Object.assign(mockConfig, {
    ...mockConfig,
    ...req.body,
    aiModel: req.body.aiModel || mockConfig.aiModel,
    aiModels: req.body.aiModels || mockConfig.aiModels,
    updatedAt: new Date().toISOString(),
  });
  res.json(mockConfig);
});

app.post('/api/config/test-ai', async (req, res) => {
  try {
    const { aiModel } = req.body;

    if (!aiModel) {
      return res.status(400).json({ 
        error: '参数错误',
        message: '请提供 AI 模型配置' 
      });
    }

    let testResult;
    if (aiModel.provider === 'ollama') {
      // 测试 Ollama 模型连通性
      testResult = await testOllamaConnection();
    } else if (aiModel.provider === 'llamacpp') {
      testResult = await testLlamaCppConnection(aiModel);
    } else if (aiModel.apiKey) {
      // 测试其他 AI 模型连通性
      testResult = { success: true, message: 'AI 模型连接成功' };
    } else {
      return res.status(400).json({ 
        error: '参数错误',
        message: '请提供完整的 AI 模型配置' 
      });
    }

    res.json(testResult);
  } catch (error) {
    console.error('测试 AI 模型失败:', error);
    res.status(500).json({ 
      success: false,
      error: '测试 AI 模型失败',
      message: error.message || '未知错误' 
    });
  }
});

// 用户登录
app.post('/api/user/login', (req, res) => {
  try {
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

// AI 对话
app.post('/api/ai/chat', async (req, res) => {
  console.log('收到 AI 对话请求:', req.body);
  try {
    const { userId, message, referencedNewsId, history } = req.body;

    if (!userId || !message) {
      console.log('AI 对话参数错误: 缺少用户ID或消息内容');
      return res.status(400).json({ 
        error: '参数错误',
        message: '请提供用户ID和消息内容' 
      });
    }

    // 获取用户配置
    const config = mockConfig;
    const aiModel = config.aiModel;
    console.log('使用 AI 模型配置:', aiModel);

    if (aiModel.provider === 'ollama' && aiModel.baseUrl && aiModel.modelName) {
      // 使用 Ollama 模型进行对话
      console.log('调用 Ollama API 进行对话');
      const response = await callOllamaForChat(aiModel.baseUrl, aiModel.modelName, message, history);
      console.log('Ollama API 调用成功，返回响应');
      res.json({ content: response });
    } else {
      // 模拟 AI 回复
      console.log('使用模拟 AI 回复');
      const mockResponse = `我是一个AI助手，你刚刚说："${message}"。\n\n这是一个模拟回复，因为你还没有配置有效的AI模型。`;
      res.json({ content: mockResponse });
    }
  } catch (error) {
    console.error('AI 对话失败:', error);
    res.status(500).json({ 
      error: 'AI 对话失败',
      message: error.message || '未知错误' 
    });
  }
});

// 调用 Ollama API 进行对话
async function callOllamaForChat(baseUrl, modelName, message, history = []) {
  // 构建对话历史
  let prompt = '';
  history.forEach(item => {
    if (item.role === 'user') {
      prompt += `用户: ${item.content}\n`;
    } else {
      prompt += `助手: ${item.content}\n`;
    }
  });
  prompt += `用户: ${message}\n助手:`;

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API 调用失败: ${response.status}`);
    }

    const data = await response.json();
    return data.response || '抱歉，我无法生成回复。';
  } catch (error) {
    console.error('Ollama API 调用错误:', error);
    throw error;
  }
}

// 404 处理
app.use('*', (_req, res) => {
  res.status(404).json({
    error: '未找到资源',
    message: '请求的 API 端点不存在',
    path: _req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// 错误处理中间件
app.use((err, _req, res, _next) => {
  console.error('错误:', err);
  res.status(500).json({
    error: '服务器内部错误',
    message: err.message || '未知错误',
    timestamp: new Date().toISOString(),
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log('🚀 AI News API 服务器启动成功');
  console.log('=' .repeat(50));
  console.log(`端口: ${PORT}`);
  console.log(`环境: development`);
  console.log(`地址: http://localhost:${PORT}`);
  console.log('=' .repeat(50));
  console.log('可用端点:');
  console.log('- GET /api/health - 健康检查');
  console.log('- GET /api/config - 获取配置');
  console.log('- POST /api/config - 保存配置');
  console.log('- POST /api/config/test-ai - 测试AI模型连接');
  console.log('=' .repeat(50));
});
