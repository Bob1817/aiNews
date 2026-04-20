import { stripMarkdown, truncateWithStripMarkdown } from './markdown'

describe('stripMarkdown', () => {
  test('应该清除标题标记', () => {
    expect(stripMarkdown('# 一级标题')).toBe('一级标题')
    expect(stripMarkdown('## 二级标题')).toBe('二级标题')
    expect(stripMarkdown('### 三级标题')).toBe('三级标题')
    expect(stripMarkdown('#### 四级标题')).toBe('四级标题')
  })

  test('应该清除粗体标记', () => {
    expect(stripMarkdown('**粗体文本**')).toBe('粗体文本')
    expect(stripMarkdown('__粗体文本__')).toBe('粗体文本')
    expect(stripMarkdown('这是**粗体**文本')).toBe('这是粗体文本')
  })

  test('应该清除斜体标记', () => {
    expect(stripMarkdown('*斜体文本*')).toBe('斜体文本')
    expect(stripMarkdown('_斜体文本_')).toBe('斜体文本')
    expect(stripMarkdown('这是*斜体*文本')).toBe('这是斜体文本')
  })

  test('应该清除删除线标记', () => {
    expect(stripMarkdown('~~删除线文本~~')).toBe('删除线文本')
    expect(stripMarkdown('这是~~删除线~~文本')).toBe('这是删除线文本')
  })

  test('应该清除行内代码标记', () => {
    expect(stripMarkdown('`代码`')).toBe('代码')
    expect(stripMarkdown('这是`代码`示例')).toBe('这是代码示例')
  })

  test('应该清除链接标记', () => {
    expect(stripMarkdown('[链接文本](https://example.com)')).toBe('链接文本')
    expect(stripMarkdown('访问[这里](https://example.com)了解更多')).toBe('访问这里了解更多')
  })

  test('应该清除图片标记', () => {
    // 注意：正则表达式应该移除 ! 字符
    expect(stripMarkdown('![图片描述](https://example.com/image.jpg)')).toBe('图片描述')
    expect(stripMarkdown('查看![图片](https://example.com/image.jpg)了解更多')).toBe('查看图片了解更多')
  })

  test('应该清除引用标记', () => {
    expect(stripMarkdown('> 引用文本')).toBe('引用文本')
    expect(stripMarkdown('> 第一行\n> 第二行')).toBe('第一行\n第二行')
  })

  test('应该清除列表标记', () => {
    expect(stripMarkdown('- 无序列表项')).toBe('无序列表项')
    expect(stripMarkdown('* 无序列表项')).toBe('无序列表项')
    expect(stripMarkdown('+ 无序列表项')).toBe('无序列表项')
    expect(stripMarkdown('1. 有序列表项')).toBe('有序列表项')
    expect(stripMarkdown('2. 有序列表项')).toBe('有序列表项')
  })

  test('应该清除表格标记', () => {
    const table = `| 列1 | 列2 |
| --- | --- |
| 数据1 | 数据2 |`
    // 表格处理会移除首尾的 | 字符，但保留中间的 | 作为分隔符
    expect(stripMarkdown(table)).toBe('列1 | 列2\n--- | ---\n数据1 | 数据2')
  })

  test('应该清除代码块标记', () => {
    const codeBlock = `\`\`\`javascript
console.log('hello')
\`\`\``
    expect(stripMarkdown(codeBlock)).toBe('')
  })

  test('应该处理混合的markdown格式', () => {
    const mixed = `# 标题

这是**粗体**和*斜体*文本。

- 列表项1
- 列表项2

> 引用文本

\`\`\`
代码块
\`\`\``

    const expected = `标题

这是粗体和斜体文本。
列表项1
列表项2

引用文本`

    expect(stripMarkdown(mixed)).toBe(expected)
  })

  test('应该处理空字符串', () => {
    expect(stripMarkdown('')).toBe('')
    expect(stripMarkdown(null as any)).toBe('')
    expect(stripMarkdown(undefined as any)).toBe('')
  })
})

describe('truncateWithStripMarkdown', () => {
  test('应该清除markdown并截断文本', () => {
    const text = '# 标题\n\n这是**粗体**文本，包含一些markdown格式。'
    const result = truncateWithStripMarkdown(text, 10)
    expect(result).toBe('标题\n\n这是粗体文本...')
  })

  test('当文本短于最大长度时不应截断', () => {
    const text = '**短文本**'
    const result = truncateWithStripMarkdown(text, 20)
    expect(result).toBe('短文本')
  })

  test('应该处理空字符串', () => {
    expect(truncateWithStripMarkdown('', 10)).toBe('')
    expect(truncateWithStripMarkdown(null as any, 10)).toBe('')
    expect(truncateWithStripMarkdown(undefined as any, 10)).toBe('')
  })
})
