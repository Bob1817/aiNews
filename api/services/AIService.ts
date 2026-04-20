import { NewsService } from './NewsService'
import { ConfigService } from './ConfigService'

interface AIConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
  apiKey: string
  modelName: string
  baseUrl?: string
}

export class AIService {
  private newsService: NewsService
  private configService: ConfigService

  constructor() {
    this.newsService = new NewsService()
    this.configService = new ConfigService()
  }

  private isUsableConfig(config: Partial<AIConfig> | undefined): config is AIConfig {
    if (!config?.provider) {
      return false
    }

    if (config.provider === 'ollama' || config.provider === 'llamacpp') {
      return Boolean(config.modelName || config.baseUrl)
    }

    return Boolean(config.apiKey && config.modelName)
  }

  private async resolveOllamaModelName(config: AIConfig): Promise<string> {
    if (config.modelName?.trim()) {
      return config.modelName.trim()
    }

    const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '')

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name?: string; model?: string }> }
        const firstModel = data.models?.[0]
        const resolved = firstModel?.model || firstModel?.name

        if (resolved) {
          return resolved
        }
      }
    } catch (error) {
      console.warn('自动解析 Ollama 模型失败:', error)
    }

    return process.env.OLLAMA_MODEL || 'gemma4:latest'
  }

  // 调用 Ollama API
  private async callOllamaAPI(config: AIConfig, prompt: string, systemPrompt?: string): Promise<string> {
    const baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
    const modelName = await this.resolveOllamaModelName(config)
    
    try {
      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          stream: false,
        }),
      })

      if (!response.ok) {
        const contentType = response.headers.get('content-type') || ''
        const isJson = contentType.includes('application/json')
        const data = isJson ? await response.json() : await response.text()
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? String(data.error)
            : `Ollama API 调用失败: ${response.status}`
        throw new Error(message)
      }

      const data = await response.json() as { response?: string }
      return data.response || '抱歉，未能生成回复。'
    } catch (error) {
      console.error('Ollama API 调用错误:', error)
      throw new Error('调用 Ollama API 失败，请检查 Ollama 是否正在运行')
    }
  }

  // 调用 llama.cpp API
  private async callLlamaCppAPI(config: AIConfig, prompt: string, systemPrompt?: string): Promise<string> {
    const baseUrl = config.baseUrl || 'http://localhost:8080'
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`
    }

    try {
      // 首先尝试 v1/chat/completions 端点（兼容 OpenAI API 格式）
      const chatResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.modelName || 'llama.cpp',
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          stream: false,
        }),
      })

      if (chatResponse.ok) {
        const data = await chatResponse.json() as { choices?: Array<{ message?: { content?: string } }> }
        return data.choices?.[0]?.message?.content || '抱歉，未能生成回复。'
      }
    } catch (error) {
      console.warn('llama.cpp chat/completions 测试失败，尝试 completion 回退:', error)
    }

    try {
      // 尝试 completion 端点
      const completionResponse = await fetch(`${baseUrl}/completion`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt,
          n_predict: 1000,
          stream: false,
        }),
      })

      if (completionResponse.ok) {
        const data = await completionResponse.json() as { content?: string }
        return data.content || '抱歉，未能生成回复。'
      }

      throw new Error(`llama.cpp API 调用失败: ${completionResponse.status}`)
    } catch (error) {
      console.error('llama.cpp API 调用错误:', error)
      throw new Error('调用 llama.cpp API 失败，请检查 llama.cpp 服务是否正在运行')
    }
  }

  // 调用 OpenAI API
  private async callOpenAIAPI(config: AIConfig, prompt: string, systemPrompt?: string): Promise<string> {
    const baseUrl = config.baseUrl || 'https://api.openai.com/v1'
    
    try {
      const messages = []
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt })
      }
      messages.push({ role: 'user', content: prompt })

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.modelName,
          messages,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API 调用失败: ${response.status}`)
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      return data.choices?.[0]?.message?.content || '抱歉，未能生成回复。'
    } catch (error) {
      console.error('OpenAI API 调用错误:', error)
      throw new Error('调用 OpenAI API 失败，请检查 API Key 和网络连接')
    }
  }

  // 获取 AI 配置
  private async getAIConfig(userId: string): Promise<AIConfig> {
    try {
      const config = await this.configService.getConfig(userId)
      const primaryConfig: AIConfig = {
        provider: config.aiModel.provider as any,
        apiKey: config.aiModel.apiKey,
        modelName: config.aiModel.modelName,
        baseUrl: config.aiModel.baseUrl,
      }

      if (this.isUsableConfig(primaryConfig)) {
        return primaryConfig
      }

      const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0]
      const fallbackConfig: AIConfig | undefined = activeModel
        ? {
            provider: activeModel.provider,
            apiKey: activeModel.apiKey,
            modelName: activeModel.modelName,
            baseUrl: activeModel.baseUrl,
          }
        : undefined

      if (this.isUsableConfig(fallbackConfig)) {
        return fallbackConfig
      }

      throw new Error('没有可用的 AI 模型配置')
    } catch (error) {
      throw error instanceof Error ? error : new Error('读取 AI 配置失败')
    }
  }

  async generateText(userId: string, prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const config = await this.getAIConfig(userId)
      let response: string

      console.log('AI 配置:', {
        provider: config.provider,
        hasApiKey: !!config.apiKey,
        modelName: config.modelName,
        baseUrl: config.baseUrl,
      })

      if (config.provider === 'ollama') {
        response = await this.callOllamaAPI(config, prompt, systemPrompt)
      } else if (config.provider === 'llamacpp') {
        response = await this.callLlamaCppAPI(config, prompt, systemPrompt)
      } else if (config.provider === 'openai' && config.apiKey && config.apiKey !== 'sk-...') {
        response = await this.callOpenAIAPI(config, prompt, systemPrompt)
      } else {
        throw new Error('没有有效的 AI 模型配置')
      }

      return response
    } catch (error) {
      console.error('AI 文本生成失败:', error)
      throw error
    }
  }

  // AI 对话
  async chat(
    userId: string,
    message: string,
    referencedNewsId?: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ): Promise<{ content: string }> {
    let fullPrompt = message

    if (referencedNewsId) {
      const news = await this.newsService.getNewsById(referencedNewsId)
      if (news) {
        fullPrompt = `请基于以下新闻内容完成用户任务：\n\n新闻标题：${news.title}\n\n新闻内容：${news.content}\n\n用户请求：${message}`
      }
    }

    const historySection =
      history && history.length > 0
        ? `最近对话记录：\n${history
            .slice(-6)
            .map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`)
            .join('\n')}\n\n`
        : ''

    const content = await this.generateText(
      userId,
      `${historySection}${fullPrompt}`,
      '你是 AI 助手的通用对话核心，擅长帮助用户处理日常工作任务。回答要直接、清晰、可执行。'
    )

    return { content }
  }

  // AI 新闻创作
  async compose(
    userId: string,
    prompt: string,
    referencedNewsIds?: string[]
  ): Promise<{ title: string; content: string }> {
    let referencedContent = ''
    let fullPrompt = prompt

    if (referencedNewsIds && referencedNewsIds.length > 0) {
      const newsItems = await Promise.all(
        referencedNewsIds.map((id) => this.newsService.getNewsById(id))
      )
      const validNews = newsItems.filter((news): news is NonNullable<typeof news> => news !== null)
      
      if (validNews.length > 0) {
        referencedContent = validNews.map((news, index) => `参考新闻 ${index + 1}：\n标题：${news.title}\n内容：${news.content}`).join('\n\n')
        fullPrompt = `${referencedContent}\n\n请基于以上参考新闻，完成以下创作任务：${prompt}`
      }
    }

    // 不使用系统提示，直接传递用户的原话

    try {
      const response = await this.generateText(userId, fullPrompt)

      // 尝试从响应中提取标题
      const titleMatch = response.match(/^#\s+(.+)$/m)
      const title = titleMatch ? titleMatch[1] : `AI 创作：${prompt}`
      
      return { title, content: response }
    } catch (error) {
      console.error('AI 创作调用失败:', error)
      throw error
    }
  }
}
