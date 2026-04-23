import type { NewsArticle, WorkflowDefinition } from '@/types'
import { buildNewsAssistantDraftTask, findNewsAssistantWorkflow } from './newsAssistant'

const sampleArticle: NewsArticle = {
  id: 'news-1',
  title: '英伟达推出新一代企业级 AI 基础设施',
  content: '英伟达发布了面向企业客户的新一代 AI 基础设施方案，强调训练和推理一体化。',
  source: '测试来源',
  url: 'https://example.com/news-1',
  publishedAt: '2026-04-22T10:00:00.000Z',
  relatedIndustries: ['人工智能'],
  relatedKeywords: ['英伟达', '企业 AI'],
}

describe('newsAssistant utils', () => {
  test('findNewsAssistantWorkflow should resolve the built-in workflow by id', () => {
    const workflows: WorkflowDefinition[] = [
      {
        id: 'workflow-news-assistant',
        name: 'news-assistant',
        displayName: '新闻助手',
        description: '',
        invocation: {
          primary: '/新闻助手',
          aliases: ['/+新闻助手'],
          examples: [],
        },
        systemInstruction: '',
        steps: [],
        inputSchema: [],
        outputSchema: [],
        constraints: [],
        tools: [],
        capabilities: [],
        examples: [],
        extensionNotes: '',
        isBuiltIn: true,
        status: 'active',
        createdAt: '2026-04-22T00:00:00.000Z',
        updatedAt: '2026-04-22T00:00:00.000Z',
      },
    ]

    expect(findNewsAssistantWorkflow(workflows)?.id).toBe('workflow-news-assistant')
  })

  test('buildNewsAssistantDraftTask should instruct the workflow to output labeled title and body', () => {
    const task = buildNewsAssistantDraftTask(sampleArticle)

    expect(task).toContain('请以“英伟达推出新一代企业级 AI 基础设施”为主题')
    expect(task).toContain('标题：')
    expect(task).toContain('正文：')
    expect(task).toContain('不要输出 Markdown 标题、列表符号或额外说明')
  })
})
