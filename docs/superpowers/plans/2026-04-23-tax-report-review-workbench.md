# Tax Report Review Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将个税报表文件工作台重构为更专业的“报表审核台”，强化顶部文件抬头、审核状态、报表目录和表格可读性，同时保留现有 xlsx 读写能力。

**Architecture:** 继续以 `src/pages/SavedFileWorkbench.tsx` 为主页面，抽出少量纯展示子组件来降低页面复杂度。先用测试锁定审核台关键行为，再逐步实现页面抬头、目录侧栏、表格状态和文案规则，确保预览/编辑模式、未保存状态、目录收起逻辑都可验证。

**Tech Stack:** React 18、React Router、TypeScript、Tailwind CSS、Jest、Testing Library、Lucide React

---

### Task 1: 为审核台关键状态和目录交互补测试

**Files:**
- Modify: `src/pages/__tests__/SavedFileWorkbench.test.tsx`

- [ ] **Step 1: 写目录收起与审核状态的失败测试**

```tsx
test('shows review mode metadata and toggles report directory collapse', async () => {
  render(
    <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
      <Routes>
        <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
      </Routes>
    </MemoryRouter>
  )

  expect(await screen.findByText('个税申报表')).toBeInTheDocument()
  expect(screen.getByText('编辑中')).toBeInTheDocument()
  expect(screen.getByText('已保存')).toBeInTheDocument()

  const toggle = screen.getByRole('button', { name: '收起报表目录' })
  await userEvent.click(toggle)

  expect(screen.getByRole('button', { name: '展开报表目录' })).toBeInTheDocument()
  expect(screen.queryByText('报表目录')).not.toBeInTheDocument()
  expect(screen.getByText('#1')).toBeInTheDocument()
})

test('marks dirty state after editing and clears it after save', async () => {
  render(
    <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
      <Routes>
        <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
      </Routes>
    </MemoryRouter>
  )

  const targetCell = await screen.findByDisplayValue('1000')
  await userEvent.clear(targetCell)
  await userEvent.type(targetCell, '2000')

  expect(screen.getByText('已修改未保存')).toBeInTheDocument()

  await userEvent.click(screen.getByRole('button', { name: '保存修改' }))

  await waitFor(() => {
    expect(screen.getByText('已保存')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand`

Expected: FAIL with missing labels like `收起报表目录` / `编辑中` / `已修改未保存`

- [ ] **Step 3: 提交测试改动**

```bash
git add src/pages/__tests__/SavedFileWorkbench.test.tsx
git commit -m "test: cover tax report review workbench states"
```

### Task 2: 重构顶部文件抬头为正式审核头区

**Files:**
- Modify: `src/pages/SavedFileWorkbench.tsx`
- Test: `src/pages/__tests__/SavedFileWorkbench.test.tsx`

- [ ] **Step 1: 以最小实现补审核头区状态模型**

```tsx
const hasUnsavedChanges = useMemo(() => {
  if (!activeSheet) {
    return false
  }

  return JSON.stringify(normalizeRows(activeSheet.rows)) !== JSON.stringify(draftRows)
}, [activeSheet, draftRows])

const reviewModeLabel = isEditMode ? '编辑中' : '只读预览'
const saveStatusLabel = hasUnsavedChanges ? '已修改未保存' : '已保存'
```

- [ ] **Step 2: 将头区文案从英文工作台改为中文审核头**

```tsx
<div className="min-w-0">
  <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">个税申报表</p>
  <h1 className="mt-2 truncate text-[34px] font-semibold tracking-[-0.02em] text-slate-950">
    {savedFile.title}
  </h1>
  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{reviewModeLabel}</span>
    <span className="rounded-full border border-slate-200 bg-white px-3 py-1">{saveStatusLabel}</span>
    <span>更新时间：{new Date(savedFile.updatedAt).toLocaleString('zh-CN')}</span>
  </div>
</div>
```

- [ ] **Step 3: 调整按钮层级，保留主次关系**

```tsx
<button
  onClick={() => setSearchParams(isEditMode ? {} : { mode: 'edit' })}
  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
>
  <PencilLine className="h-4 w-4" />
  {isEditMode ? '切换为只读' : '进入编辑'}
</button>
<button className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100">
  <Download className="h-4 w-4" />
  下载文件
</button>
<button
  type="button"
  onClick={handleSave}
  disabled={!isEditMode || isSaving || !hasUnsavedChanges}
  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
>
  <Save className="h-4 w-4" />
  {isSaving ? '保存中...' : '保存修改'}
</button>
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand`

Expected: PASS with review mode and save status assertions green

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedFileWorkbench.tsx src/pages/__tests__/SavedFileWorkbench.test.tsx
git commit -m "feat: add tax report review header states"
```

### Task 3: 将左侧 sheet 区重构为可收起的报表目录

**Files:**
- Modify: `src/pages/SavedFileWorkbench.tsx`
- Test: `src/pages/__tests__/SavedFileWorkbench.test.tsx`

- [ ] **Step 1: 调整目录区文案与按钮语义**

```tsx
<div className="mb-4 flex items-center justify-between gap-3">
  <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
    <FolderOpen className="h-4 w-4" />
    {!isSheetPanelCollapsed && <span>报表目录</span>}
  </div>
  <button
    type="button"
    onClick={() => setIsSheetPanelCollapsed((current) => !current)}
    aria-label={isSheetPanelCollapsed ? '展开报表目录' : '收起报表目录'}
    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
  >
    {isSheetPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
  </button>
</div>
```

- [ ] **Step 2: 重做目录按钮状态，让当前 sheet 更像审核目录选中态**

```tsx
className={`rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
  sheetName === activeSheetName
    ? 'border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.14)]'
    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
} ${isSheetPanelCollapsed ? 'px-2 text-center text-xs' : ''}`}
```

- [ ] **Step 3: 提升收起后的主表格占比**

```tsx
<section
  className={`grid flex-1 gap-5 ${
    isSheetPanelCollapsed ? 'xl:grid-cols-[72px_minmax(0,1fr)]' : 'xl:grid-cols-[220px_minmax(0,1fr)]'
  }`}
>
```

- [ ] **Step 4: 运行测试确认目录收起测试通过**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand`

Expected: PASS with `收起报表目录` / `展开报表目录` and collapsed token `#1`

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedFileWorkbench.tsx src/pages/__tests__/SavedFileWorkbench.test.tsx
git commit -m "feat: redesign tax report directory panel"
```

### Task 4: 提升主审核区和表格可读性

**Files:**
- Modify: `src/pages/SavedFileWorkbench.tsx`
- Test: `src/pages/__tests__/SavedFileWorkbench.test.tsx`

- [ ] **Step 1: 写数值列右对齐与已修改单元格状态的失败测试**

```tsx
test('renders financial table with dirty-cell review styling', async () => {
  render(
    <MemoryRouter initialEntries={['/news/file/file-1?mode=edit']}>
      <Routes>
        <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
      </Routes>
    </MemoryRouter>
  )

  const targetCell = await screen.findByDisplayValue('1000')
  await userEvent.clear(targetCell)
  await userEvent.type(targetCell, '2000')

  expect(targetCell).toHaveClass('text-right')
  expect(targetCell).toHaveAttribute('data-dirty', 'true')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand`

Expected: FAIL because numeric cells do not yet expose `text-right` or `data-dirty`

- [ ] **Step 3: 实现更正式的审核区标题和表格容器**

```tsx
<div className="rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
  <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
    <div>
      <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">{activeSheetName}</h2>
      <p className="mt-2 text-sm text-slate-500">
        {hasUnsavedChanges ? '当前页面存在待保存修改，请确认后提交。' : isEditMode ? '当前处于编辑模式，可核对后保存回原始文件。' : '当前处于只读预览模式，可用于审核与核对。'}
      </p>
    </div>
  </div>
```

- [ ] **Step 4: 为表头、数值列和脏单元格添加审核台样式**

```tsx
const headerLike = rowIndex === 0
const numericLike = /收入|金额|税|保险|公积金|合计|扣除|工号/.test(draftRows[0]?.[columnIndex] || '')
const originalValue = activeSheet?.rows[rowIndex]?.[columnIndex] ?? ''
const isDirtyCell = !headerLike && cell !== originalValue

<input
  data-dirty={isDirtyCell ? 'true' : 'false'}
  value={cell}
  readOnly={!isEditMode || headerLike}
  className={`min-w-[164px] border-0 bg-transparent px-5 py-4 text-sm outline-none ${
    headerLike ? 'font-semibold text-slate-950' : numericLike ? 'text-right tabular-nums text-slate-800' : 'text-slate-800'
  } ${isDirtyCell ? 'bg-amber-50 text-slate-950 ring-1 ring-inset ring-amber-200' : ''} ${
    !isEditMode || headerLike ? 'cursor-default' : 'focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-200'
  }`}
/>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand`

Expected: PASS with numeric alignment and dirty-cell assertions green

- [ ] **Step 6: Commit**

```bash
git add src/pages/SavedFileWorkbench.tsx src/pages/__tests__/SavedFileWorkbench.test.tsx
git commit -m "feat: improve tax report review table readability"
```

### Task 5: 做页面级回归并清理文案

**Files:**
- Modify: `src/pages/SavedFileWorkbench.tsx`
- Test: `src/pages/__tests__/SavedFileWorkbench.test.tsx`

- [ ] **Step 1: 移除剩余英文工作台语义和不符财务系统的文案**

```tsx
<p className="text-xs font-semibold tracking-[0.18em] text-slate-500">个税申报表</p>
...
<p className="text-sm text-slate-500">审核模式：{reviewModeLabel}</p>
```

- [ ] **Step 2: 增加只读模式下保存按钮禁用和解释文案断言**

```tsx
test('disables save action in read-only mode', async () => {
  render(
    <MemoryRouter initialEntries={['/news/file/file-1']}>
      <Routes>
        <Route path="/news/file/:id" element={<SavedFileWorkbench />} />
      </Routes>
    </MemoryRouter>
  )

  expect(await screen.findByText('只读预览')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '保存修改' })).toBeDisabled()
})
```

- [ ] **Step 3: 运行完整页面测试**

Run: `npm test -- src/pages/__tests__/SavedFileWorkbench.test.tsx --runInBand --forceExit`

Expected: PASS with all review workbench tests green

- [ ] **Step 4: 运行前端类型检查**

Run: `npm run typecheck:frontend`

Expected: PASS with no TypeScript errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/SavedFileWorkbench.tsx src/pages/__tests__/SavedFileWorkbench.test.tsx
git commit -m "feat: finalize tax report review workbench ui"
```

