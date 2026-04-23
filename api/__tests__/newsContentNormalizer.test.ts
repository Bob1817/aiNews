import { normalizeSavedNewsContent } from '../services/newsContentNormalizer'

describe('normalizeSavedNewsContent', () => {
  test('should extract title from markdown heading and remove duplicate heading from body', () => {
    const normalized = normalizeSavedNewsContent({
      title: '',
      content: `# 生成式 AI 融资进入并购整合期

多家生成式 AI 创业公司在本季度转向并购与战略合作，资本市场开始重新评估增长质量。

投资人更加关注收入兑现和交付能力。`,
    })

    expect(normalized.title).toBe('生成式 AI 融资进入并购整合期')
    expect(normalized.content).not.toContain('# 生成式 AI 融资进入并购整合期')
    expect(normalized.content).toContain('多家生成式 AI 创业公司在本季度转向并购与战略合作')
    expect(normalized.contentFormat).toBe('markdown')
  })

  test('should keep provided article title and remove duplicated first line from body', () => {
    const normalized = normalizeSavedNewsContent({
      title: '英伟达发布新一代企业 AI 平台',
      content: `英伟达发布新一代企业 AI 平台

该平台面向企业私有化部署场景，提供统一模型管理、推理优化和监控能力。`,
    })

    expect(normalized.title).toBe('英伟达发布新一代企业 AI 平台')
    expect(normalized.content.startsWith('英伟达发布新一代企业 AI 平台')).toBe(false)
    expect(normalized.content).toContain('该平台面向企业私有化部署场景')
  })

  test('should derive a concise title from long plain text instead of using the whole first sentence', () => {
    const content =
      'OpenAI 发布企业级智能体工具并开放更多协作能力，这一更新将推动自动化工作流更快进入实际生产环境。'

    const normalized = normalizeSavedNewsContent({
      title: '',
      content,
    })

    expect(normalized.title).toBe('OpenAI 发布企业级智能体工具并开放更多协作能力')
    expect(normalized.title).not.toBe(content)
    expect(normalized.content).toBe(content)
    expect(normalized.contentFormat).toBe('plain')
  })

  test('should extract labeled title and strip markdown symbols for news bodies when plain text is preferred', () => {
    const normalized = normalizeSavedNewsContent(
      {
        title: '',
        content: `标题：智谱发布新一代企业模型能力平台

正文：
## 核心进展

**智谱** 面向企业场景发布了新的模型能力平台，并强调私有化部署与推理效率。

- 支持多模型统一接入
- 提供更完整的安全与权限控制`,
      },
      {
        preferPlainTextBody: true,
      }
    )

    expect(normalized.title).toBe('智谱发布新一代企业模型能力平台')
    expect(normalized.content).toContain('智谱 面向企业场景发布了新的模型能力平台')
    expect(normalized.content).toContain('支持多模型统一接入')
    expect(normalized.content).not.toContain('标题：')
    expect(normalized.content).not.toContain('正文：')
    expect(normalized.content).not.toContain('##')
    expect(normalized.content).not.toContain('**')
    expect(normalized.contentFormat).toBe('plain')
  })
})
