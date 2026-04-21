jest.mock('@/lib/api', () => ({
  apiUrl: (path: string) => `http://localhost:3001${path}`,
}))

import {
  convertContentToHtml,
  extractFirstImageUrl,
  getContentExcerpt,
  NEWS_PLACEHOLDER_IMAGE,
  resolveContentFormat,
} from './contentFormat'

describe('resolveContentFormat', () => {
  test('should prefer explicit format when provided', () => {
    expect(resolveContentFormat('<p>Hello</p>', 'html')).toBe('html')
  })

  test('should detect markdown content', () => {
    expect(resolveContentFormat('# 标题\n\n- 列表项')).toBe('markdown')
  })

  test('should detect html content', () => {
    expect(resolveContentFormat('<h1>标题</h1><p>正文</p>')).toBe('html')
  })

  test('should fallback to plain text', () => {
    expect(resolveContentFormat('普通正文内容')).toBe('plain')
  })
})

describe('getContentExcerpt', () => {
  test('should strip html tags when building excerpts', () => {
    expect(getContentExcerpt('<h1>标题</h1><p>正文内容</p>', 'html', 20)).toBe('标题正文内容')
  })

  test('should strip markdown formatting when building excerpts', () => {
    expect(getContentExcerpt('# 标题\n\n**正文**内容', 'markdown', 20)).toBe('标题\n\n正文内容')
  })
})

describe('convertContentToHtml', () => {
  test('should rewrite legacy relative workspace asset urls to absolute api urls', () => {
    const converted = convertContentToHtml(
      '<p><img src="/api/config/workspace/asset?userId=1&path=uploads%2Fold-image.png" alt="old" /></p>',
      'html'
    )

    expect(converted).toContain('src="http://localhost:3001/api/config/workspace/asset?userId=1&amp;path=uploads%2Fold-image.png"')
  })

  test('should keep existing absolute image urls untouched', () => {
    const converted = convertContentToHtml(
      '<p><img src="http://localhost:3001/api/config/workspace/asset?userId=1&path=uploads%2Fready.png" alt="ready" /></p>',
      'html'
    )

    expect(converted).toContain('src="http://localhost:3001/api/config/workspace/asset?userId=1&amp;path=uploads%2Fready.png"')
  })
})

describe('extractFirstImageUrl', () => {
  test('should extract first image from html content', () => {
    expect(
      extractFirstImageUrl('<p><img src="http://localhost:3001/a.png" alt="a" /></p>', 'html')
    ).toBe('http://localhost:3001/a.png')
  })

  test('should extract first image from markdown content', () => {
    expect(extractFirstImageUrl('![封面](https://example.com/cover.png)', 'markdown')).toBe(
      'https://example.com/cover.png'
    )
  })

  test('placeholder image constant should be a data uri', () => {
    expect(NEWS_PLACEHOLDER_IMAGE.startsWith('data:image/svg+xml')).toBe(true)
  })
})
