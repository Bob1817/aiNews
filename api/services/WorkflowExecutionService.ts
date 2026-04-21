import type {
  NewsArticle,
  WorkflowArtifact,
  WorkflowCommandParseResult,
  WorkflowDefinition,
  WorkflowExecution,
} from '../../shared/types'
import { AICrawlerService } from './AICrawlerService'
import { AIService } from './AIService'
import { NewsService } from './NewsService'
import { UserService } from './UserService'
import { WorkflowCommandService } from './WorkflowCommandService'
import { WorkflowService } from './WorkflowService'

interface ExecuteWorkflowInput {
  userId: string
  workflowId?: string
  invocation?: string
  message: string
  referencedNewsId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export class WorkflowExecutionService {
  private static executions: WorkflowExecution[] = []
  private readonly keywordNoise = new Set([
    '新闻',
    '资讯',
    '相关',
    '相关新闻',
    '推送',
    '推送一些',
    '一些',
    '帮我',
    '帮我看',
    '帮我找',
    '给我',
    '看看',
    '获取',
    '抓取',
    '搜索',
    '查找',
    '检索',
    '最新',
    '今天',
    '最近',
    '一下',
    '内容',
    '消息',
    '技术',
    '应用',
  ])

  private workflowService: WorkflowService
  private workflowCommandService: WorkflowCommandService
  private aiService: AIService
  private aiCrawlerService: AICrawlerService
  private newsService: NewsService
  private userService: UserService

  constructor() {
    this.workflowService = new WorkflowService()
    this.workflowCommandService = new WorkflowCommandService()
    this.aiService = new AIService()
    this.aiCrawlerService = new AICrawlerService()
    this.newsService = new NewsService()
    this.userService = new UserService()
  }

  async listExecutions(userId: string) {
    return WorkflowExecutionService.executions
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  async parseCommand(message: string): Promise<WorkflowCommandParseResult> {
    return this.workflowCommandService.parseCommand(message)
  }

  async execute(input: ExecuteWorkflowInput) {
    const parsed = input.workflowId
      ? await this.getParsedWorkflowFromId(input.workflowId, input.invocation, input.message)
      : await this.workflowCommandService.parseCommand(input.message)

    if (!parsed.matched || !parsed.workflow) {
      throw new Error(parsed.error || '未找到对应工作流')
    }

    return this.executeParsedCommand({
      userId: input.userId,
      parsed,
      message: input.message,
      referencedNewsId: input.referencedNewsId,
      history: input.history,
    })
  }

  async executeParsedCommand(input: {
    userId: string
    parsed: WorkflowCommandParseResult
    message: string
    referencedNewsId?: string
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  }) {
    const workflow = input.parsed.workflow
    if (!workflow) {
      throw new Error('工作流不存在')
    }

    const execution: WorkflowExecution = {
      id: `execution-${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.displayName,
      invocation: input.parsed.invocation || workflow.invocation.primary,
      userId: input.userId,
      input: input.parsed.remainingInput || input.message,
      output: '',
      status: 'running',
      artifacts: [],
      createdAt: new Date().toISOString(),
    }

    WorkflowExecutionService.executions.unshift(execution)

    try {
      const content =
        workflow.id === 'workflow-news-digest'
          ? await this.buildNewsDigest(input.userId, input.parsed.remainingInput || input.message)
          : await this.generateWorkflowContent(
              workflow,
              input.userId,
              input.parsed.remainingInput || input.message,
              input.referencedNewsId,
              input.history
            )

      const artifacts: WorkflowArtifact[] = [
        {
          id: `artifact-${Date.now()}`,
          type: workflow.id === 'workflow-news-assistant' ? 'news-draft' : 'markdown',
          title: `${workflow.displayName} 输出`,
          content,
        },
      ]

      execution.output = content
      execution.status = 'completed'
      execution.artifacts = artifacts
      execution.completedAt = new Date().toISOString()

      return {
        content,
        workflow,
        execution,
        parsedCommand: input.parsed,
        artifacts,
      }
    } catch (error) {
      execution.status = 'failed'
      execution.completedAt = new Date().toISOString()
      execution.error = error instanceof Error ? error.message : '工作流执行失败'
      throw error
    }
  }

  private async generateWorkflowContent(
    workflow: WorkflowDefinition,
    userId: string,
    message: string,
    referencedNewsId?: string,
    history?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) {
    const prompt = await this.buildPrompt(workflow, message, referencedNewsId)
    const historySection = this.buildHistorySection(history)
    const systemPrompt = this.buildSystemPrompt(workflow)
    return this.aiService.generateText(userId, `${historySection}${prompt}`, systemPrompt)
  }

  private async getParsedWorkflowFromId(workflowId: string, invocation: string | undefined, message: string) {
    const workflow = await this.workflowService.getWorkflowById(workflowId)

    if (!workflow) {
      return {
        matched: false,
        error: '工作流不存在',
      }
    }

    return {
      matched: true,
      invocation: invocation || workflow.invocation.primary,
      remainingInput: message,
      workflow,
    }
  }

  private buildSystemPrompt(workflow: WorkflowDefinition) {
    const steps = workflow.steps
      .map((step, index) => `${index + 1}. ${step.title}：${step.instruction}${step.expectedOutput ? `；期望输出：${step.expectedOutput}` : ''}`)
      .join('\n')
    const constraints = workflow.constraints.map((item, index) => `${index + 1}. ${item}`).join('\n')
    const outputSchema = workflow.outputSchema.map((field) => `${field.label}(${field.name})`).join('、')

    return [
      workflow.systemInstruction,
      '',
      '你当前处于严格执行模式，必须优先遵守以下工作流定义：',
      `工作流：${workflow.displayName}`,
      `用途：${workflow.description}`,
      `步骤：\n${steps}`,
      `约束：\n${constraints || '无'}`,
      `输出要求：${outputSchema || '输出清晰、结构化、可直接使用的结果'}`,
      '除非工作流中明确要求，否则不要解释你为什么这么做，直接给出结果。',
    ].join('\n')
  }

  private async buildPrompt(workflow: WorkflowDefinition, message: string, referencedNewsId?: string) {
    let prompt = `用户任务：${message || '请根据工作流默认目标执行'}`

    if (workflow.id === 'workflow-news-assistant' && referencedNewsId) {
      const news = await this.newsService.getNewsById(referencedNewsId)
      if (news) {
        prompt += `\n\n参考新闻：\n标题：${news.title}\n来源：${news.source}\n发布时间：${news.publishedAt}\n内容：${news.content}`
      }
    }

    if (workflow.examples.length > 0) {
      prompt += `\n\n可参考的历史示例：\n- ${workflow.examples.join('\n- ')}`
    }

    return prompt
  }

  private async buildNewsDigest(userId: string, message: string) {
    const profile = await this.userService.getProfile(userId)
    const focus = message.trim()
    const focusKeywords = await this.extractFocusKeywords(userId, focus)
    const fallbackKeywords = this.mergeKeywords(profile.keywords, profile.industries)
    const crawlKeywords = focusKeywords.length > 0 ? focusKeywords : fallbackKeywords
    const crawlResult = await this.aiCrawlerService.crawlNews(profile, userId, crawlKeywords)
    const articles = crawlResult.success ? crawlResult.articles : []
    const visibleArticles = this
      .rankArticlesByFocus(this.dedupeArticles(articles), crawlKeywords)
      .slice(0, 6)

    if (visibleArticles.length === 0) {
      const suggestions = [
        '在任务里补充更具体的关键词，例如公司名、赛道名或地区名。',
        ...(focusKeywords.length > 0 ? [] : ['到偏好设置中补充长期关注的行业和关键词。']),
        ...(crawlResult.error ? [`当前爬虫返回信息：${crawlResult.error}`] : []),
      ]

      return [
        '# 新闻推送简报',
        '',
        `本次爬虫关键词：${crawlKeywords.join('、') || '未配置关键词'}`,
        '',
        '暂时没有匹配到足够的相关新闻。你可以：',
        ...suggestions.map((item, index) => `${index + 1}. ${item}`),
      ].join('\n')
    }

    return [
      '# 新闻推送简报',
      '',
      `本次爬虫关键词：${crawlKeywords.join('、') || '未配置关键词'}`,
      ...(focus ? ['', `对话输入关注点：${focus}`] : []),
      '',
      ...visibleArticles.map((article, index) =>
        [
          `## ${index + 1}. ${article.title}`,
          `- 来源：${article.source}`,
          `- 发布时间：${this.formatRelativeTime(article.publishedAt)}`,
          `- 原文：[点击查看原文](${article.url})`,
          `- 关键词：${article.relatedKeywords.join('、') || '未标注'}`,
          '',
          '摘要：',
          this.formatArticleSummary(article.content),
          '',
          `操作：[保存](${this.buildNewsActionLink('save-news', article)}) · [引用](${this.buildNewsActionLink('quote-news', article)})`,
          '',
        ].join('\n')
      ),
      '你可以继续追问其中任意一条，让我进一步总结、改写或生成成稿。',
    ].join('\n')
  }

  private async extractFocusKeywords(userId: string, message: string) {
    if (!message.trim()) {
      return []
    }

    const normalized = message
      .replace(/[，。；、/|]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    if (!normalized) {
      return []
    }

    const keywords = new Set<string>()

    normalized
      .split(' ')
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .forEach((part) => keywords.add(part))

    normalized
      .split(/关于|聚焦|关注|只看|帮我看|帮我找|查找|检索|新闻|资讯|相关/g)
      .map((part) => part.trim())
      .filter((part) => part.length >= 2)
      .forEach((part) => keywords.add(part))

    const baseKeywords = this.cleanKeywords(Array.from(keywords))

    try {
      const refined = await this.refineKeywordsWithAI(userId, message, baseKeywords)
      return refined.length > 0 ? this.cleanKeywords(this.mergeKeywords(baseKeywords, refined)) : baseKeywords
    } catch (error) {
      console.warn('AI 关键词提炼失败，回退到规则提取:', error)
      return baseKeywords
    }
  }

  private async refineKeywordsWithAI(userId: string, message: string, baseKeywords: string[]) {
    const prompt = [
      '请从下面这段新闻检索需求中提炼 3 到 8 个最适合用于新闻抓取的关键词。',
      '要求：',
      '1. 只返回关键词，用中文顿号分隔。',
      '2. 不要解释，不要编号，不要输出完整句子。',
      '3. 优先保留行业、公司名、产品名、技术名、地区名。',
      `原始需求：${message}`,
      `已初步提取的关键词：${baseKeywords.join('、') || '无'}`,
    ].join('\n')

    const response = await this.aiService.generateText(
      userId,
      prompt,
      '你是一个新闻检索关键词提炼助手，只输出适合抓取新闻的短关键词。'
    )

    return response
      .replace(/\n/g, '、')
      .split(/[、,，]/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && item.length <= 20)
      .filter((item) => !this.keywordNoise.has(item.toLowerCase()))
      .slice(0, 8)
  }

  private mergeKeywords(...groups: Array<string[]>) {
    const keywords = new Set<string>()

    groups
      .flat()
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => keywords.add(item))

    return Array.from(keywords)
  }

  private cleanKeywords(keywords: string[]) {
    return Array.from(
      new Set(
        keywords
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => item.replace(/[，。；、/|]+/g, ' ').replace(/\s+/g, ' ').trim())
          .flatMap((item) => item.split(' '))
          .map((item) => item.trim())
          .filter((item) => item.length >= 2 && item.length <= 24)
          .filter((item) => !this.keywordNoise.has(item.toLowerCase()))
      )
    ).slice(0, 8)
  }

  private dedupeArticles(articles: NewsArticle[]) {
    const seen = new Set<string>()

    return articles.filter((article) => {
      const dedupeKey = `${article.source}::${article.title}`
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()

      if (seen.has(dedupeKey)) {
        return false
      }

      seen.add(dedupeKey)
      return true
    })
  }

  private rankArticlesByFocus(articles: NewsArticle[], focusKeywords: string[]) {
    if (focusKeywords.length === 0) {
      return [...articles].sort(
        (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      )
    }

    return [...articles].sort((a, b) => {
      const scoreA = this.scoreArticleAgainstFocus(a, focusKeywords)
      const scoreB = this.scoreArticleAgainstFocus(b, focusKeywords)

      if (scoreA !== scoreB) {
        return scoreB - scoreA
      }

      return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    })
  }

  private scoreArticleAgainstFocus(article: NewsArticle, focusKeywords: string[]) {
    const target = [
      article.title,
      article.content,
      article.relatedKeywords.join(' '),
      article.relatedIndustries.join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return focusKeywords.reduce((score, keyword) => {
      return target.includes(keyword.toLowerCase()) ? score + 1 : score
    }, 0)
  }

  private buildNewsAssistantCommand(mode: 'summary' | 'draft', article: NewsArticle) {
    const task =
      mode === 'summary'
        ? '生成一份三段式摘要'
        : '写一篇适合办公简报使用的成稿'

    return `/新闻助手 请基于以下新闻${task}：标题：${article.title}；来源：${article.source}；摘要：${article.content}`
  }

  private buildCommandLink(command: string) {
    return `command:${encodeURIComponent(command)}`
  }

  private buildNewsActionLink(action: 'save-news' | 'quote-news', article: NewsArticle) {
    const payload = Buffer.from(
      JSON.stringify({
        id: article.id,
        title: article.title,
        content: article.content,
        source: article.source,
        url: article.url,
        publishedAt: article.publishedAt,
        relatedKeywords: article.relatedKeywords,
        relatedIndustries: article.relatedIndustries,
      }),
      'utf-8'
    ).toString('base64url')

    return `action:${action}:${payload}`
  }

  private formatArticleSummary(content: string) {
    const plainText = this.stripHtml(content)
      .replace(/\s+/g, ' ')
      .replace(/\u00a0/g, ' ')
      .trim()

    if (!plainText) {
      return '- 暂无摘要'
    }

    const sentences = plainText
      .split(/(?<=[。！？!?])/)
      .map((item) => item.trim())
      .filter(Boolean)

    const selected = (sentences.length > 0 ? sentences : [plainText])
      .slice(0, 3)
      .map((item) => this.truncateText(item, 120))

    return selected.map((item) => `- ${item}`).join('\n')
  }

  private stripHtml(value: string) {
    return value
      .replace(/<img[^>]*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>|<\/li>|<\/div>|<\/h\d>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
  }

  private truncateText(value: string, maxLength: number) {
    if (value.length <= maxLength) {
      return value
    }

    return `${value.slice(0, maxLength).trim()}...`
  }

  private formatRelativeTime(publishedAt: string) {
    const publishedTime = new Date(publishedAt).getTime()
    if (Number.isNaN(publishedTime)) {
      return '时间未知'
    }

    const diffMs = Date.now() - publishedTime
    const diffMinutes = Math.max(1, Math.floor(diffMs / (1000 * 60)))

    if (diffMinutes < 60) {
      return `${diffMinutes} 分钟前`
    }

    const diffHours = Math.floor(diffMinutes / 60)
    if (diffHours < 24) {
      return `${diffHours} 小时前`
    }

    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) {
      return `${diffDays} 天前`
    }

    return new Date(publishedAt).toLocaleString('zh-CN')
  }

  private buildHistorySection(history?: Array<{ role: 'user' | 'assistant'; content: string }>) {
    if (!history || history.length === 0) {
      return ''
    }

    const recent = history.slice(-6).map((item) => `${item.role === 'user' ? '用户' : '助手'}：${item.content}`).join('\n')
    return `最近对话上下文：\n${recent}\n\n`
  }
}
