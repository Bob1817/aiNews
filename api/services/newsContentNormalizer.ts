type NormalizeSavedNewsContentInput = {
  title?: string
  content: string
}

type NormalizeSavedNewsContentOptions = {
  preferPlainTextBody?: boolean
}

export type SavedNewsContentFormat = 'html' | 'markdown' | 'plain'

type NormalizeSavedNewsContentResult = {
  title: string
  content: string
  contentFormat: SavedNewsContentFormat
}

const DEFAULT_TITLE = 'AI 助手输出内容'

function normalizeWhitespace(value: string) {
  return value.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim()
}

function stripHtmlTags(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function detectContentFormat(content: string): SavedNewsContentFormat {
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return 'html'
  }

  if (/^\s{0,3}#{1,6}\s+/m.test(content) || /(\*\*|__|^- |\n- |\n\d+\. )/m.test(content)) {
    return 'markdown'
  }

  return 'plain'
}

function stripMarkdownSyntax(value: string) {
  let stripped = value

  stripped = stripped.replace(/```[\s\S]*?```/g, '')
  stripped = stripped.replace(/^#{1,6}\s+/gm, '')
  stripped = stripped.replace(/\*\*(.*?)\*\*/g, '$1')
  stripped = stripped.replace(/__(.*?)__/g, '$1')
  stripped = stripped.replace(/\*(.*?)\*/g, '$1')
  stripped = stripped.replace(/_(.*?)_/g, '$1')
  stripped = stripped.replace(/~~(.*?)~~/g, '$1')
  stripped = stripped.replace(/!\[(.*?)\]\(.*?\)/g, '$1')
  stripped = stripped.replace(/\[(.*?)\]\(.*?\)/g, '$1')
  stripped = stripped.replace(/`(.*?)`/g, '$1')
  stripped = stripped.replace(/^>\s+/gm, '')
  stripped = stripped.replace(/^[\s]*[-*+]\s+/gm, '')
  stripped = stripped.replace(/^[\s]*\d+\.\s+/gm, '')
  stripped = stripped.replace(/^\|.*\|$/gm, (match) => match.replace(/^\||\|$/g, '').trim())
  stripped = stripped.replace(/^[\s]*[-|:]+\s*$/gm, '')

  return normalizeWhitespace(stripped)
}

function sanitizeTitle(value?: string) {
  if (!value) {
    return ''
  }

  return normalizeWhitespace(
    value
      .replace(/^#+\s*/, '')
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
      .replace(/\s+[|｜-]\s+[^|｜-]+$/u, '')
  )
}

function extractLabeledSections(content: string) {
  const normalized = normalizeWhitespace(content)
  const titleMatch = normalized.match(/^(?:标题|新闻标题|主题)\s*[：:]\s*(.+)$/m)
  const bodyMatch = normalized.match(/(?:^|\n)(?:正文|内容|新闻正文|文章|新闻文章)\s*[：:]\s*([\s\S]+)$/m)

  return {
    title: sanitizeTitle(titleMatch?.[1] || ''),
    body: normalizeWhitespace(bodyMatch?.[1] || ''),
  }
}

function removeLeadingDuplicateTitle(body: string, title: string) {
  if (!title) {
    return normalizeWhitespace(body)
  }

  const lines = body.split('\n')
  const firstNonEmptyIndex = lines.findIndex((line) => line.trim().length > 0)

  if (firstNonEmptyIndex === -1) {
    return ''
  }

  const firstLine = sanitizeTitle(lines[firstNonEmptyIndex])
  if (firstLine === title) {
    const nextContent = [...lines.slice(0, firstNonEmptyIndex), ...lines.slice(firstNonEmptyIndex + 1)].join('\n')
    return normalizeWhitespace(nextContent)
  }

  return normalizeWhitespace(body)
}

function deriveTitleFromSentence(content: string) {
  const plainContent = normalizeWhitespace(content)
  const firstParagraph = plainContent.split('\n\n')[0]?.trim() || plainContent
  const candidate = firstParagraph.replace(/\s+/g, ' ')

  const chunks = candidate
    .split(/[，,。！？；;:：]/)
    .map((item) => item.trim())
    .filter(Boolean)

  for (const chunk of chunks) {
    if (chunk.length >= 10 && chunk.length <= 32) {
      return chunk
    }
  }

  if (candidate.length <= 32) {
    return candidate
  }

  return `${candidate.slice(0, 28).trimEnd()}...`
}

function normalizeMarkdownOrPlain(
  input: NormalizeSavedNewsContentInput,
  contentFormat: 'markdown' | 'plain',
  options: NormalizeSavedNewsContentOptions
) {
  const normalizedContent = normalizeWhitespace(input.content)
  const labeledSections = extractLabeledSections(normalizedContent)
  const lines = normalizedContent.split('\n')
  const explicitHeading = lines.find((line) => /^#{1,6}\s+/.test(line.trim()))
  const providedTitle = sanitizeTitle(input.title)
  const labeledTitle = labeledSections.title
  const cleanedLabeledBody = labeledSections.body
    ? options.preferPlainTextBody
      ? stripMarkdownSyntax(labeledSections.body)
      : labeledSections.body
    : ''

  if (labeledTitle && cleanedLabeledBody) {
    return {
      title: labeledTitle,
      content: removeLeadingDuplicateTitle(cleanedLabeledBody, labeledTitle),
      contentFormat: options.preferPlainTextBody ? 'plain' : contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  if (explicitHeading) {
    const headingTitle = sanitizeTitle(explicitHeading.replace(/^#{1,6}\s+/, ''))
    const contentWithoutHeading = normalizeWhitespace(
      normalizedContent.replace(new RegExp(`^\\s*${explicitHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`), '')
    )
    const content = options.preferPlainTextBody ? stripMarkdownSyntax(contentWithoutHeading) : contentWithoutHeading

    return {
      title: headingTitle || labeledTitle || providedTitle || DEFAULT_TITLE,
      content: removeLeadingDuplicateTitle(content, headingTitle || labeledTitle || providedTitle),
      contentFormat: options.preferPlainTextBody ? 'plain' : contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  if (labeledTitle) {
    const fallbackBodySource = cleanedLabeledBody || normalizedContent
    const content = options.preferPlainTextBody ? stripMarkdownSyntax(fallbackBodySource) : fallbackBodySource
    return {
      title: labeledTitle,
      content: removeLeadingDuplicateTitle(content, labeledTitle),
      contentFormat: options.preferPlainTextBody ? 'plain' : contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  if (providedTitle) {
    const content = options.preferPlainTextBody ? stripMarkdownSyntax(normalizedContent) : normalizedContent
    return {
      title: providedTitle,
      content: removeLeadingDuplicateTitle(content, providedTitle),
      contentFormat: options.preferPlainTextBody ? 'plain' : contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  const content = options.preferPlainTextBody ? stripMarkdownSyntax(normalizedContent) : normalizedContent
  const derivedTitle = deriveTitleFromSentence(content)
  return {
    title: sanitizeTitle(derivedTitle) || DEFAULT_TITLE,
    content,
    contentFormat: options.preferPlainTextBody ? 'plain' : contentFormat,
  } satisfies NormalizeSavedNewsContentResult
}

function normalizeHtml(input: NormalizeSavedNewsContentInput) {
  const normalizedContent = normalizeWhitespace(input.content)
  const providedTitle = sanitizeTitle(input.title)
  const headingMatch = normalizedContent.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)
  const headingTitle = sanitizeTitle(headingMatch ? stripHtmlTags(headingMatch[1]) : '')
  const resolvedTitle = headingTitle || providedTitle || deriveTitleFromSentence(stripHtmlTags(normalizedContent))
  let content = normalizedContent

  if (headingMatch && headingTitle && headingTitle === resolvedTitle) {
    content = normalizeWhitespace(normalizedContent.replace(headingMatch[0], ''))
  }

  return {
    title: resolvedTitle || DEFAULT_TITLE,
    content,
    contentFormat: 'html',
  } satisfies NormalizeSavedNewsContentResult
}

export function normalizeSavedNewsContent(
  input: NormalizeSavedNewsContentInput,
  options: NormalizeSavedNewsContentOptions = {}
): NormalizeSavedNewsContentResult {
  const trimmedContent = normalizeWhitespace(input.content)
  if (!trimmedContent) {
    return {
      title: sanitizeTitle(input.title) || DEFAULT_TITLE,
      content: '',
      contentFormat: 'plain',
    }
  }

  const contentFormat = detectContentFormat(trimmedContent)
  if (contentFormat === 'html') {
    return normalizeHtml({ ...input, content: trimmedContent })
  }

  return normalizeMarkdownOrPlain({ ...input, content: trimmedContent }, contentFormat, options)
}
