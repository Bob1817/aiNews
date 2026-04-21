import { stripMarkdown } from './markdown'
import { apiUrl } from '@/lib/api'

export type ContentFormat = 'html' | 'markdown' | 'plain'
const PLACEHOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" fill="none">
  <rect width="1200" height="675" fill="#E2E8F0"/>
  <rect x="80" y="80" width="1040" height="515" rx="36" fill="#F8FAFC"/>
  <circle cx="215" cy="226" r="58" fill="#BAE6FD"/>
  <path d="M181 284l54-72 61 79 86-113 152 197H181v-91z" fill="#7DD3FC"/>
  <rect x="612" y="190" width="320" height="28" rx="14" fill="#CBD5E1"/>
  <rect x="612" y="246" width="244" height="24" rx="12" fill="#E2E8F0"/>
  <rect x="612" y="294" width="286" height="24" rx="12" fill="#E2E8F0"/>
  <rect x="612" y="342" width="216" height="24" rx="12" fill="#E2E8F0"/>
</svg>`
export const NEWS_PLACEHOLDER_IMAGE = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(PLACEHOLDER_SVG)}`

export function resolveContentFormat(content: string, preferredFormat?: ContentFormat) {
  if (preferredFormat) {
    return preferredFormat
  }

  if (/<[a-z][\s\S]*>/i.test(content)) {
    return 'html'
  }

  if (/^\s{0,3}#{1,6}\s+/m.test(content) || /(\*\*|__|^- |\n- |\n\d+\. )/m.test(content)) {
    return 'markdown'
  }

  return 'plain'
}

export function extractFirstImageUrl(content: string, preferredFormat?: ContentFormat) {
  const contentFormat = resolveContentFormat(content, preferredFormat)

  if (contentFormat === 'html') {
    const doc = new DOMParser().parseFromString(content, 'text/html')
    const imageElement = doc.querySelector('img[src]')
    return imageElement?.getAttribute('src') || undefined
  }

  if (contentFormat === 'markdown') {
    const markdownImageMatch = content.match(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/)
    return markdownImageMatch?.[1]
  }

  return undefined
}

export function stripHtmlTags(content: string) {
  if (!content) {
    return ''
  }

  const doc = new DOMParser().parseFromString(content, 'text/html')
  return (doc.body.textContent || '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function sanitizeHtmlContent(content: string) {
  if (!content) {
    return ''
  }

  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
}

function rewriteLegacyWorkspaceAssetUrls(content: string) {
  if (!content) {
    return ''
  }

  const doc = new DOMParser().parseFromString(content, 'text/html')
  const assetNodes = doc.querySelectorAll<HTMLImageElement | HTMLAnchorElement>('img[src], a[href]')

  assetNodes.forEach((node) => {
    const attributeName = node.tagName.toLowerCase() === 'img' ? 'src' : 'href'
    const currentValue = node.getAttribute(attributeName)
    if (!currentValue) {
      return
    }

    if (
      currentValue.startsWith('/api/config/workspace/asset?') ||
      currentValue.startsWith('api/config/workspace/asset?')
    ) {
      node.setAttribute(attributeName, apiUrl(currentValue.startsWith('/') ? currentValue : `/${currentValue}`))
    }
  })

  return doc.body.innerHTML
}

function escapeHtml(content: string) {
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function convertPlainTextToHtml(content: string) {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br />')}</p>`)
    .join('')
}

function convertMarkdownToHtml(content: string) {
  const lines = content.replace(/\r/g, '').split('\n')
  const blocks: string[] = []
  let paragraphBuffer: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let listItems: string[] = []

  const flushParagraph = () => {
    if (paragraphBuffer.length > 0) {
      blocks.push(`<p>${escapeHtml(paragraphBuffer.join(' '))}</p>`)
      paragraphBuffer = []
    }
  }

  const flushList = () => {
    if (listType && listItems.length > 0) {
      blocks.push(`<${listType}>${listItems.join('')}</${listType}>`)
    }
    listType = null
    listItems = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = Math.min(6, headingMatch[1].length)
      blocks.push(`<h${level}>${escapeHtml(headingMatch[2])}</h${level}>`)
      continue
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)$/)
    if (bulletMatch) {
      flushParagraph()
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(`<li>${escapeHtml(bulletMatch[1])}</li>`)
      continue
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (orderedMatch) {
      flushParagraph()
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(`<li>${escapeHtml(orderedMatch[1])}</li>`)
      continue
    }

    if (line.startsWith('>')) {
      flushParagraph()
      flushList()
      blocks.push(`<blockquote><p>${escapeHtml(line.replace(/^>\s*/, ''))}</p></blockquote>`)
      continue
    }

    paragraphBuffer.push(line)
  }

  flushParagraph()
  flushList()

  return blocks.join('')
}

export function convertContentToHtml(content: string, preferredFormat?: ContentFormat) {
  const contentFormat = resolveContentFormat(content, preferredFormat)
  if (contentFormat === 'html') {
    return rewriteLegacyWorkspaceAssetUrls(sanitizeHtmlContent(content))
  }

  if (contentFormat === 'markdown') {
    return convertMarkdownToHtml(content)
  }

  return convertPlainTextToHtml(content)
}

export function getContentExcerpt(content: string, preferredFormat?: ContentFormat, maxLength: number = 160) {
  const contentFormat = resolveContentFormat(content, preferredFormat)
  const plainText =
    contentFormat === 'html' ? stripHtmlTags(content) : contentFormat === 'markdown' ? stripMarkdown(content) : content

  if (plainText.length <= maxLength) {
    return plainText
  }

  return `${plainText.slice(0, maxLength).trimEnd()}...`
}
