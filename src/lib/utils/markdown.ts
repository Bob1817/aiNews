/**
 * 清除字符串中的markdown格式字符，返回纯文本
 * @param text 包含markdown格式的文本
 * @returns 清除markdown格式后的纯文本
 */
export function stripMarkdown(text: string): string {
  if (!text) return ''

  let stripped = text

  // 移除代码块，避免代码内容污染摘要
  stripped = stripped.replace(/```[\s\S]*?```/g, '')

  // 移除标题标记 (#, ##, ### 等)
  stripped = stripped.replace(/^#+\s+/gm, '')

  // 移除粗体标记 (**text** 或 __text__)
  stripped = stripped.replace(/\*\*(.*?)\*\*/g, '$1')
  stripped = stripped.replace(/__(.*?)__/g, '$1')

  // 移除斜体标记 (*text* 或 _text_)
  stripped = stripped.replace(/\*(.*?)\*/g, '$1')
  stripped = stripped.replace(/_(.*?)_/g, '$1')

  // 移除删除线标记 (~~text~~)
  stripped = stripped.replace(/~~(.*?)~~/g, '$1')

  // 移除图片标记 (![alt](url)) - 需要匹配 ! 字符
  stripped = stripped.replace(/!\[(.*?)\]\(.*?\)/g, '$1')

  // 移除链接标记 ([text](url))
  stripped = stripped.replace(/\[(.*?)\]\(.*?\)/g, '$1')

  // 移除行内代码标记 (`text`)
  stripped = stripped.replace(/`(.*?)`/g, '$1')

  // 移除引用标记 (> text)
  stripped = stripped.replace(/^>\s+/gm, '')

  // 移除列表标记 (-, *, +, 1., 2., 等)
  stripped = stripped.replace(/^[\s]*[-*+]\s+/gm, '')
  stripped = stripped.replace(/^[\s]*\d+\.\s+/gm, '')

  // 移除表格标记 (| 和 -)
  stripped = stripped.replace(/^\|.*\|$/gm, (match) => {
    // 移除首尾的 | 字符
    return match.replace(/^\||\|$/g, '').trim()
  })
  stripped = stripped.replace(/^[\s]*[-|:]+\s*$/gm, '')

  // 移除多余的换行和空格
  stripped = stripped.replace(/\n{3,}/g, '\n\n').trim()

  return stripped
}

/**
 * 截断文本并添加省略号，同时清除markdown格式
 * @param text 原始文本
 * @param maxLength 最大长度
 * @returns 处理后的文本
 */
export function truncateWithStripMarkdown(text: string, maxLength: number = 100): string {
  const stripped = stripMarkdown(text)
  if (stripped.length <= maxLength) return stripped
  return stripped.substring(0, maxLength) + '...'
}
