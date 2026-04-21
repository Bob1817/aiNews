type NormalizeSavedNewsContentInput = {
  title?: string
  content: string
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

function normalizeMarkdownOrPlain(input: NormalizeSavedNewsContentInput, contentFormat: 'markdown' | 'plain') {
  const normalizedContent = normalizeWhitespace(input.content)
  const lines = normalizedContent.split('\n')
  const explicitHeading = lines.find((line) => /^#{1,6}\s+/.test(line.trim()))
  const providedTitle = sanitizeTitle(input.title)

  if (explicitHeading) {
    const headingTitle = sanitizeTitle(explicitHeading.replace(/^#{1,6}\s+/, ''))
    const contentWithoutHeading = normalizeWhitespace(
      normalizedContent.replace(new RegExp(`^\\s*${explicitHeading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n*`), '')
    )

    return {
      title: headingTitle || providedTitle || DEFAULT_TITLE,
      content: removeLeadingDuplicateTitle(contentWithoutHeading, headingTitle || providedTitle),
      contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  if (providedTitle) {
    return {
      title: providedTitle,
      content: removeLeadingDuplicateTitle(normalizedContent, providedTitle),
      contentFormat,
    } satisfies NormalizeSavedNewsContentResult
  }

  const derivedTitle = deriveTitleFromSentence(normalizedContent)
  return {
    title: sanitizeTitle(derivedTitle) || DEFAULT_TITLE,
    content: normalizedContent,
    contentFormat,
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
  input: NormalizeSavedNewsContentInput
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

  return normalizeMarkdownOrPlain({ ...input, content: trimmedContent }, contentFormat)
}
