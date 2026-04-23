import type { NewsArticle, WorkflowDefinition } from '@/types'

export const NEWS_ASSISTANT_WORKFLOW_ID = 'workflow-news-assistant'

export function findNewsAssistantWorkflow(workflows: WorkflowDefinition[]) {
  return (
    workflows.find((workflow) => workflow.id === NEWS_ASSISTANT_WORKFLOW_ID) ||
    workflows.find(
      (workflow) =>
        workflow.name === 'news-assistant' ||
        workflow.displayName === '新闻助手' ||
        workflow.invocation.primary === '/新闻助手'
    ) ||
    null
  )
}

export function buildNewsAssistantDraftTask(article: NewsArticle) {
  return [
    `请以“${article.title}”为主题，基于引用新闻内容撰写一篇新的新闻文章。`,
    '输出要求：',
    '1. 第一行必须使用“标题：”给出最终新闻标题。',
    '2. 随后必须使用“正文：”给出完整文章正文。',
    '3. 正文使用自然段，不要输出 Markdown 标题、列表符号或额外说明。',
    '4. 保留原新闻中的关键事实、时间、主体和背景，不要编造信息。',
  ].join('\n')
}
