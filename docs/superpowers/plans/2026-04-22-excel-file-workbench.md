# Excel File Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 `任务结果 -> 文件` 中的 `xlsx` 文件提供独立详情页工作台，支持在线预览、单元格编辑、保存回写、下载和删除。

**Architecture:** 后端在 `SavedNewsService` 基础上增加 workbook 读取/保存能力和控制器接口，前端新增 `FileWorkbench` 页面与轻量表格组件。列表页只负责为 `xlsx` 文件增加入口动作，真正的工作区逻辑放在独立详情页，避免把复杂交互堆进列表卡片。

**Tech Stack:** React 18、React Router、TypeScript、Tailwind CSS、Express、Jest、xlsx

---

### Task 1: 定义 workbook 数据模型并补后端服务能力

**Files:**
- Modify: `shared/types/index.ts`
- Modify: `src/types/index.ts`
- Modify: `api/services/SavedNewsService.ts`
- Test: `api/__tests__/SavedNewsService.test.ts`

- [ ] **Step 1: 先写 workbook 服务失败测试**

```ts
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import XLSX from 'xlsx'
import { SavedNewsService } from '../services/SavedNewsService'

describe('SavedNewsService workbook operations', () => {
  test('reads workbook sheets for xlsx saved file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workbook-read-'))
    const filePath = path.join(tempDir, '个税申报表.xlsx')
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['姓名', '收入'],
      ['张三', '1000'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
    XLSX.writeFile(workbook, filePath)

    const service = new SavedNewsService()
    const saved = await service.registerGeneratedFile({
      userId: '1',
      title: '个税申报表 2026-04-22 16:00:00',
      content: '个税报表工作流已生成标准申报表文件。',
      fileName: '个税申报表.xlsx',
      filePath,
      downloadUrl: '/api/workflows/executions/execution-1/artifacts/artifact-1/download?userId=1',
      fileFormat: 'xlsx',
    })

    const workbookData = await service.getWorkbookBySavedNewsId(saved.id)

    expect(workbookData.sheetNames).toEqual(['Sheet1'])
    expect(workbookData.sheets[0].rows[0]).toEqual(['姓名', '收入'])
    expect(workbookData.sheets[0].rows[1]).toEqual(['张三', '1000'])
  })

  test('updates workbook cells and persists back to xlsx file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workbook-write-'))
    const filePath = path.join(tempDir, '个税申报表.xlsx')
    const workbook = XLSX.utils.book_new()
    const sheet = XLSX.utils.aoa_to_sheet([
      ['姓名', '收入'],
      ['张三', '1000'],
    ])
    XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1')
    XLSX.writeFile(workbook, filePath)

    const service = new SavedNewsService()
    const saved = await service.registerGeneratedFile({
      userId: '1',
      title: '个税申报表 2026-04-22 16:00:00',
      content: '个税报表工作流已生成标准申报表文件。',
      fileName: '个税申报表.xlsx',
      filePath,
      downloadUrl: '/api/workflows/executions/execution-1/artifacts/artifact-1/download?userId=1',
      fileFormat: 'xlsx',
    })

    await service.updateWorkbookBySavedNewsId(saved.id, {
      sheetName: 'Sheet1',
      rows: [
        ['姓名', '收入'],
        ['张三', '2000'],
      ],
    })

    const reloaded = XLSX.readFile(filePath)
    const rows = XLSX.utils.sheet_to_json<string[]>(reloaded.Sheets.Sheet1, { header: 1, raw: false })

    expect(rows[1][1]).toBe('2000')
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- api/__tests__/SavedNewsService.test.ts --runInBand`

Expected: FAIL with `service.getWorkbookBySavedNewsId is not a function`

- [ ] **Step 3: 实现 workbook 读取与保存能力**

```ts
import XLSX from 'xlsx'

export interface WorkbookSheetData {
  name: string
  rows: string[][]
}

export interface WorkbookData {
  file: SavedNews
  sheetNames: string[]
  sheets: WorkbookSheetData[]
}

async getWorkbookBySavedNewsId(id: string): Promise<WorkbookData> {
  const news = await this.getSavedNewsById(id)
  if (!news || news.outputType !== 'file' || news.fileFormat !== 'xlsx' || !news.filePath) {
    throw new Error('当前文件不支持工作簿预览')
  }

  const workbook = XLSX.readFile(news.filePath)
  const sheets = workbook.SheetNames.map((sheetName) => ({
    name: sheetName,
    rows: XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: false,
      defval: '',
    }),
  }))

  return {
    file: news,
    sheetNames: workbook.SheetNames,
    sheets,
  }
}

async updateWorkbookBySavedNewsId(
  id: string,
  payload: { sheetName: string; rows: string[][] }
): Promise<WorkbookData> {
  const news = await this.getSavedNewsById(id)
  if (!news || news.outputType !== 'file' || news.fileFormat !== 'xlsx' || !news.filePath) {
    throw new Error('当前文件不支持工作簿编辑')
  }

  const workbook = XLSX.readFile(news.filePath)
  workbook.Sheets[payload.sheetName] = XLSX.utils.aoa_to_sheet(payload.rows)
  XLSX.writeFile(workbook, news.filePath)
  news.updatedAt = new Date().toISOString()

  return this.getWorkbookBySavedNewsId(id)
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- api/__tests__/SavedNewsService.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add shared/types/index.ts src/types/index.ts api/services/SavedNewsService.ts api/__tests__/SavedNewsService.test.ts
git commit -m "feat: add workbook operations for saved xlsx files"
```

### Task 2: 暴露 workbook 读取与保存接口，并让删除同步删磁盘文件

**Files:**
- Modify: `api/controllers/NewsController.ts`
- Modify: `api/routes/news.ts`
- Modify: `api/services/SavedNewsService.ts`
- Test: `api/__tests__/SavedNewsService.test.ts`

- [ ] **Step 1: 补删除文件记录的失败测试**

```ts
test('deletes saved xlsx record and removes physical file when deleting file result', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workbook-delete-'))
  const filePath = path.join(tempDir, '个税申报表.xlsx')
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['姓名']]), 'Sheet1')
  XLSX.writeFile(workbook, filePath)

  const service = new SavedNewsService()
  const saved = await service.registerGeneratedFile({
    userId: '1',
    title: '个税申报表 2026-04-22 16:00:00',
    content: '个税报表工作流已生成标准申报表文件。',
    fileName: '个税申报表.xlsx',
    filePath,
    downloadUrl: '/api/workflows/executions/execution-1/artifacts/artifact-1/download?userId=1',
    fileFormat: 'xlsx',
  })

  const deleted = await service.deleteNews(saved.id)

  expect(deleted).toBe(true)
  await expect(fs.access(filePath)).rejects.toThrow()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- api/__tests__/SavedNewsService.test.ts --runInBand`

Expected: FAIL because file still exists on disk

- [ ] **Step 3: 实现控制器和路由**

```ts
async getSavedWorkbook(req: Request, res: Response) {
  try {
    const workbook = await this.savedNewsService.getWorkbookBySavedNewsId(req.params.id)
    res.json({ success: true, data: workbook })
  } catch (error) {
    res.status(400).json({
      error: '读取工作簿失败',
      message: error instanceof Error ? error.message : '未知错误',
    })
  }
}

async updateSavedWorkbook(req: Request, res: Response) {
  try {
    const workbook = await this.savedNewsService.updateWorkbookBySavedNewsId(req.params.id, req.body)
    res.json({ success: true, message: '工作簿保存成功', data: workbook })
  } catch (error) {
    res.status(400).json({
      error: '保存工作簿失败',
      message: error instanceof Error ? error.message : '未知错误',
    })
  }
}
```

```ts
router.get('/saved/:id/workbook', (req, res) => newsController.getSavedWorkbook(req, res))
router.put('/saved/:id/workbook', (req, res) => newsController.updateSavedWorkbook(req, res))
```

在 `deleteNews()` 中补文件删除：

```ts
if (news.outputType === 'file' && news.filePath) {
  try {
    await unlink(news.filePath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- api/__tests__/SavedNewsService.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/controllers/NewsController.ts api/routes/news.ts api/services/SavedNewsService.ts api/__tests__/SavedNewsService.test.ts
git commit -m "feat: expose workbook APIs for saved xlsx files"
```

### Task 3: 新增前端 workbook API 和文件工作台页面

**Files:**
- Create: `src/lib/api/workbook.ts`
- Create: `src/pages/FileWorkbench.tsx`
- Create: `src/components/excel/WorkbookSheetList.tsx`
- Create: `src/components/excel/WorkbookGrid.tsx`
- Modify: `src/App.tsx`
- Test: `src/pages/__tests__/FileWorkbench.test.tsx`

- [ ] **Step 1: 先写页面渲染失败测试**

```tsx
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import { FileWorkbench } from '../FileWorkbench'

jest.mock('@/lib/api/workbook', () => ({
  getSavedWorkbook: jest.fn().mockResolvedValue({
    success: true,
    data: {
      file: {
        id: 'file-1',
        title: '个税申报表 2026-04-22 16:00:00',
        fileFormat: 'xlsx',
        updatedAt: '2026-04-22T08:00:00.000Z',
      },
      sheetNames: ['Sheet1'],
      sheets: [{ name: 'Sheet1', rows: [['姓名', '收入'], ['张三', '1000']] }],
    },
  }),
  updateSavedWorkbook: jest.fn(),
}))

describe('FileWorkbench', () => {
  test('renders workbook sheets and cell values', async () => {
    render(
      <MemoryRouter initialEntries={['/news/file/file-1?mode=preview']}>
        <Routes>
          <Route path="/news/file/:id" element={<FileWorkbench />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('个税申报表 2026-04-22 16:00:00')).toBeInTheDocument()
    })

    expect(screen.getByText('Sheet1')).toBeInTheDocument()
    expect(screen.getByText('姓名')).toBeInTheDocument()
    expect(screen.getByText('张三')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/pages/__tests__/FileWorkbench.test.tsx --runInBand`

Expected: FAIL with `Cannot find module '../FileWorkbench'`

- [ ] **Step 3: 实现前端页面与 API**

```ts
export async function getSavedWorkbook(id: string) {
  return apiRequest<{ success: boolean; data: WorkbookData }>(`/api/news/saved/${id}/workbook`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function updateSavedWorkbook(id: string, payload: { sheetName: string; rows: string[][] }) {
  return apiRequest<{ success: boolean; data: WorkbookData }>(`/api/news/saved/${id}/workbook`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
```

```tsx
<Route path="/news/file/:id" element={<FileWorkbench />} />
```

```tsx
const activeSheetData = workbook?.sheets.find((sheet) => sheet.name === activeSheet)
return (
  <div className="flex h-full flex-col">
    <header>返回任务结果 / 文件名 / 保存 / 下载 / 删除</header>
    <div className="flex min-h-0 flex-1">
      <WorkbookSheetList ... />
      <WorkbookGrid ... />
    </div>
  </div>
)
```

- [ ] **Step 4: 运行页面测试确认通过**

Run: `npm test -- src/pages/__tests__/FileWorkbench.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/api/workbook.ts src/pages/FileWorkbench.tsx src/components/excel/WorkbookSheetList.tsx src/components/excel/WorkbookGrid.tsx src/App.tsx src/pages/__tests__/FileWorkbench.test.tsx
git commit -m "feat: add excel file workbench page"
```

### Task 4: 给任务结果列表中的 xlsx 文件接入预览/编辑入口

**Files:**
- Modify: `src/pages/NewsList.tsx`
- Modify: `src/lib/api/news.ts`
- Test: `src/pages/__tests__/NewsList.xlsx-actions.test.tsx`

- [ ] **Step 1: 先写列表动作失败测试**

```tsx
import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { NewsList } from '../NewsList'
import { useAppStore } from '@/store'

jest.mock('@/lib/api/news', () => ({
  getSavedNews: jest.fn().mockResolvedValue([]),
  deleteNews: jest.fn(),
  downloadSavedFile: jest.fn(),
}))

jest.mock('@/lib/api/categories', () => ({
  getCategories: jest.fn().mockResolvedValue([]),
}))

describe('NewsList xlsx actions', () => {
  test('shows preview and edit actions for xlsx file results', async () => {
    useAppStore.setState({
      savedNews: [
        {
          id: 'file-1',
          userId: '1',
          title: '个税申报表',
          content: '个税报表工作流已生成标准申报表文件。',
          contentFormat: 'plain',
          outputType: 'file',
          fileFormat: 'xlsx',
          fileName: '个税申报表.xlsx',
          filePath: '/tmp/个税申报表.xlsx',
          downloadUrl: '/api/news/saved/file-1/download',
          isPublished: false,
          publishedTo: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    })

    render(
      <MemoryRouter>
        <NewsList />
      </MemoryRouter>
    )

    expect(screen.getByRole('link', { name: '预览文件' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '编辑文件' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/pages/__tests__/NewsList.xlsx-actions.test.tsx --runInBand`

Expected: FAIL because xlsx file cards still only show download/delete

- [ ] **Step 3: 在列表页接入 xlsx 入口**

```tsx
{news.outputType === 'file' && news.fileFormat === 'xlsx' ? (
  <>
    <Link
      to={`/news/file/${news.id}?mode=preview`}
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
      aria-label="预览文件"
    >
      <Eye className="h-4 w-4" />
      预览
    </Link>
    <Link
      to={`/news/file/${news.id}?mode=edit`}
      className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
      aria-label="编辑文件"
    >
      <Edit className="h-4 w-4" />
      编辑
    </Link>
  </>
) : (
  <Link to={`/news/edit/${news.id}`} ...>编辑内容</Link>
)}
```

并保留现有下载/删除按钮。

- [ ] **Step 4: 运行列表测试确认通过**

Run: `npm test -- src/pages/__tests__/NewsList.xlsx-actions.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/NewsList.tsx src/pages/__tests__/NewsList.xlsx-actions.test.tsx
git commit -m "feat: add xlsx preview and edit entry points"
```

### Task 5: 完整验证 workbook 工作台闭环

**Files:**
- Modify: `docs/superpowers/plans/2026-04-22-excel-file-workbench.md`

- [ ] **Step 1: 运行后端与前端测试**

Run: `npm test -- api/__tests__/SavedNewsService.test.ts src/pages/__tests__/FileWorkbench.test.tsx src/pages/__tests__/NewsList.xlsx-actions.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 2: 运行类型检查**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 3: 手动验证真实闭环**

Run:

```bash
npm run build:api
node dist-api/api/index.js
```

Manually verify:

- 在 `任务结果 -> 文件` 中看到 `xlsx` 文件的 `预览 / 编辑 / 下载 / 删除`
- 进入 `/news/file/:id` 时可以看到 sheet 切换和表格数据
- 编辑单元格后点击保存，刷新页面仍保留新值
- 下载仍可正常导出 `xlsx`
- 删除文件后列表中记录消失，磁盘文件也被删除

- [ ] **Step 4: 更新计划勾选状态与验证记录**

```md
- [x] Step 1: 运行后端与前端测试
- [x] Step 2: 运行类型检查
- [x] Step 3: 手动验证真实闭环
```

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/plans/2026-04-22-excel-file-workbench.md
git commit -m "docs: record excel file workbench verification"
```

## Self-Review

### Spec coverage

- `xlsx` 文件独立工作台：Task 3、Task 4
- 在线预览：Task 1、Task 3
- 在线编辑单元格并保存：Task 1、Task 2、Task 3
- 下载与删除：Task 2、Task 4、Task 5
- 删除同步删磁盘文件：Task 2

### Placeholder scan

- 无 `TBD`、`TODO`、后续补充描述
- 每个任务都有具体文件、代码样例和验证命令

### Type consistency

- 统一使用 `getWorkbookBySavedNewsId` / `updateWorkbookBySavedNewsId`
- 前端统一使用 `getSavedWorkbook` / `updateSavedWorkbook`
- 工作簿数据统一使用 `sheetNames` 与 `sheets`
