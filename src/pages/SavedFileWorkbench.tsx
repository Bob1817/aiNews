import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, FileSpreadsheet, FolderOpen, PencilLine, Save, Trash2 } from 'lucide-react'
import type { SavedNews, WorkbookData } from '@/types'
import { deleteNews, downloadSavedFile, getSavedWorkbook, updateSavedWorkbook } from '@/lib/api/news'
import { useAppStore } from '@/store'

function normalizeRows(rows: string[][]) {
  const maxColumns = rows.reduce((max, row) => Math.max(max, row.length), 0)
  return rows.map((row) => Array.from({ length: maxColumns }, (_, index) => row[index] ?? ''))
}

function isNumericLikeColumn(label: string) {
  return /收入|金额|税|保险|公积金|合计|扣除|工号/.test(label)
}

function isIdentifierLikeColumn(label: string) {
  return /证件|身份证|编号|工号/.test(label)
}

function getColumnWidthClass(label: string) {
  if (/工号/.test(label)) {
    return 'w-[88px] min-w-[88px]'
  }
  if (/姓名/.test(label)) {
    return 'w-[124px] min-w-[124px]'
  }
  if (/基本养老保险费|基本医疗保险费|失业保险费|住房公积金/.test(label)) {
    return 'w-[152px] min-w-[152px]'
  }
  if (isIdentifierLikeColumn(label)) {
    return 'w-[150px] min-w-[150px]'
  }
  if (isNumericLikeColumn(label)) {
    return 'w-[108px] min-w-[108px]'
  }
  return 'w-[132px] min-w-[132px]'
}

export function SavedFileWorkbench() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const isEditMode = searchParams.get('mode') === 'edit'
  const { savedNews, setSavedNews } = useAppStore()
  const savedNewsList = Array.isArray(savedNews) ? savedNews : []

  const [workbook, setWorkbook] = useState<WorkbookData | null>(null)
  const [activeSheetName, setActiveSheetName] = useState<string>('')
  const [draftRows, setDraftRows] = useState<string[][]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saveFeedback, setSaveFeedback] = useState<string>('')
  const [isSaveStatusFlash, setIsSaveStatusFlash] = useState(false)

  useEffect(() => {
    if (!id) {
      return
    }

    let cancelled = false

    const loadWorkbook = async () => {
      try {
        setIsLoading(true)
        const data = await getSavedWorkbook(id)
        if (cancelled) {
          return
        }

        setWorkbook(data)
        const firstSheetName = data.sheetNames[0] || ''
        setActiveSheetName(firstSheetName)
        setDraftRows(normalizeRows(data.sheets[0]?.rows || []))
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    loadWorkbook()

    return () => {
      cancelled = true
    }
  }, [id])

  const activeSheet = useMemo(
    () => workbook?.sheets.find((sheet) => sheet.name === activeSheetName) || null,
    [activeSheetName, workbook]
  )

  const hasUnsavedChanges = useMemo(() => {
    if (!activeSheet) {
      return false
    }

    return JSON.stringify(normalizeRows(activeSheet.rows)) !== JSON.stringify(draftRows)
  }, [activeSheet, draftRows])

  const reviewModeLabel = isEditMode ? '编辑中' : '只读预览'
  const saveStatusLabel = hasUnsavedChanges ? '已修改未保存' : '已保存'
  const headerRow = draftRows[0] ?? []
  const bodyRows = draftRows.slice(1)
  const amountColumnCount = headerRow.filter((label) => isNumericLikeColumn(label)).length
  const emptyCellCount = bodyRows.reduce(
    (count, row) => count + row.filter((cell) => !String(cell ?? '').trim()).length,
    0
  )
  const dirtyCellCount = useMemo(() => {
    if (!activeSheet) {
      return 0
    }

    return bodyRows.reduce((count, row, rowIndex) => {
      return (
        count +
        row.reduce((rowCount, cell, columnIndex) => {
          const originalValue = activeSheet.rows[rowIndex + 1]?.[columnIndex] ?? ''
          return rowCount + (cell !== originalValue ? 1 : 0)
        }, 0)
      )
    }, 0)
  }, [activeSheet, bodyRows])

  useEffect(() => {
    if (!activeSheet) {
      return
    }

    setDraftRows(normalizeRows(activeSheet.rows))
  }, [activeSheet])

  const savedFile = useMemo<SavedNews | null>(() => {
    if (workbook?.file) {
      return workbook.file
    }
    return savedNewsList.find((item) => item.id === id) || null
  }, [id, savedNewsList, workbook])

  const handleCellChange = (rowIndex: number, columnIndex: number, value: string) => {
    setSaveFeedback('')
    setIsSaveStatusFlash(false)
    setDraftRows((current) =>
      current.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? value : cell))
          : row
      )
    )
  }

  const handleSave = async () => {
    if (!id || !activeSheetName) {
      return
    }

    setIsSaving(true)
    try {
      const nextWorkbook = await updateSavedWorkbook(id, {
        sheetName: activeSheetName,
        rows: draftRows,
      })
      setWorkbook(nextWorkbook)
      setSavedNews(
        savedNewsList.map((item) => (item.id === id ? nextWorkbook.file : item))
      )
      setSaveFeedback('修改已保存')
      setIsSaveStatusFlash(true)
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!isSaveStatusFlash) {
      return
    }

    const timer = window.setTimeout(() => {
      setIsSaveStatusFlash(false)
    }, 1800)

    return () => window.clearTimeout(timer)
  }, [isSaveStatusFlash])

  const handleDelete = async () => {
    if (!id) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteNews(id)
      setSavedNews(savedNewsList.filter((item) => item.id !== id))
      navigate('/news')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">正在加载工作簿...</div>
  }

  if (!workbook || !savedFile) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">未找到可用的工作簿文件。</div>
  }

  return (
    <div className="h-full overflow-y-auto bg-[linear-gradient(180deg,#f7fafc_0%,#f3f7fb_100%)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1700px] flex-col gap-6 px-6 py-6 lg:px-10">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_42px_rgba(15,23,42,0.06)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <Link
                to="/news"
                className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" />
                返回任务结果
              </Link>
              <div className="mt-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
                  <FileSpreadsheet className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-500">个税申报表</p>
                    <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold tracking-[0.14em] text-sky-700">
                      XLSX 审核台
                    </span>
                  </div>
                  <h1 className="mt-2 truncate text-[34px] font-semibold tracking-[-0.02em] text-slate-950">
                    {savedFile.title}
                  </h1>
                  <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-500">审核模式</p>
                      <p className="mt-1 font-medium text-slate-900">{`审核模式：${reviewModeLabel}`}</p>
                    </div>
                    <div
                      data-save-highlight={isSaveStatusFlash ? 'true' : 'false'}
                      className={`rounded-2xl border px-4 py-3 text-sm ${
                        hasUnsavedChanges
                          ? 'border-amber-200 bg-amber-50 text-amber-800'
                          : isSaveStatusFlash
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-900 shadow-[0_0_0_3px_rgba(16,185,129,0.14)]'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      }`}
                    >
                      <p className="text-xs font-medium tracking-[0.08em]">保存状态</p>
                      <p className={`mt-1 font-medium transition ${isSaveStatusFlash ? 'scale-[1.02]' : ''}`}>
                        {saveStatusLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-500">更新时间</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {new Date(savedFile.updatedAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
                      <p className="text-xs font-medium tracking-[0.08em] text-slate-500">审核范围</p>
                      <p className="mt-1 font-medium text-slate-900">
                        {workbook.sheetNames.length} 个工作表 / {bodyRows.length} 条记录
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3">
              <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-slate-200 bg-slate-50 px-3 py-3">
                <button
                  onClick={() => setSearchParams(isEditMode ? {} : { mode: 'edit' })}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <PencilLine className="h-4 w-4" />
                  {isEditMode ? '切换为只读' : '进入编辑'}
                </button>
                <button
                  onClick={() => savedFile && downloadSavedFile(savedFile)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                >
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
              </div>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-white px-4 py-2.5 text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? '删除中...' : '删除文件'}
              </button>
            </div>
          </div>
        </section>

        <section className="flex flex-1 flex-col gap-5">
          <aside className="rounded-[24px] border border-slate-200 bg-white px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
                  <FolderOpen className="h-4 w-4" />
                  <span>报表目录</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  当前文件含 {workbook.sheetNames.length} 个工作表，建议按模板顺序逐项核对。
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex max-w-[980px] flex-wrap gap-2">
                  {workbook.sheetNames.map((sheetName) => (
                    <button
                      key={sheetName}
                      type="button"
                      onClick={() => setActiveSheetName(sheetName)}
                      className={`rounded-2xl px-4 py-2.5 text-left text-sm font-medium transition ${
                        sheetName === activeSheetName
                          ? 'border border-slate-900 bg-slate-900 text-white shadow-[0_10px_24px_rgba(15,23,42,0.12)]'
                          : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                      title={sheetName}
                    >
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate">{sheetName}</span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            sheetName === activeSheetName
                              ? 'bg-white/15 text-white'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {sheetName === activeSheetName
                            ? hasUnsavedChanges
                              ? '当前页 · 已改'
                              : '当前页'
                            : '待核对'}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <div className="rounded-[24px] border border-slate-200 bg-white px-6 py-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
            <div className="mb-5 flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-slate-950">{activeSheetName}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {hasUnsavedChanges
                    ? '当前页面存在待保存修改，请确认后提交。'
                    : isEditMode
                      ? '当前处于编辑模式，可核对后保存回原始文件。'
                      : '当前处于只读预览模式，可用于审核与核对。'}
                </p>
                {saveFeedback ? <p className="mt-2 text-sm font-medium text-emerald-700">{saveFeedback}</p> : null}
                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    空白单元格 {emptyCellCount}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    金额字段 {amountColumnCount}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                    当前工作表 {activeSheetName}
                  </span>
                </div>
              </div>
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {[
                { label: '工作表', value: `${workbook.sheetNames.length}`, tone: 'text-slate-950' },
                { label: '当前表数据行', value: `${bodyRows.length}`, tone: 'text-slate-950' },
                { label: '金额相关列', value: `${amountColumnCount}`, tone: 'text-slate-950' },
                {
                  label: '待保存单元格',
                  value: `${dirtyCellCount}`,
                  tone: hasUnsavedChanges ? 'text-amber-700' : 'text-emerald-700',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-4 py-3"
                >
                  <p className="text-xs font-medium tracking-[0.08em] text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-2xl font-semibold tabular-nums ${item.tone}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-auto rounded-[20px] border border-slate-200 bg-white">
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 z-10">
                  <tr>
                    <th className="sticky left-0 z-20 min-w-[64px] border-b border-r border-slate-200 bg-slate-100 px-3 py-3 text-left text-xs font-semibold tracking-[0.08em] text-slate-500">
                      行号
                    </th>
                    {headerRow.map((cell, columnIndex) => (
                      <th
                        key={`header-${columnIndex}`}
                        className={`${getColumnWidthClass(cell)} whitespace-nowrap border-b border-r border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-950 ${
                          isNumericLikeColumn(cell) ? 'text-right' : 'text-left'
                        }`}
                      >
                        {cell}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bodyRows.map((row, rowIndex) => {
                    const rowHasDirtyCell = row.some((cell, columnIndex) => {
                      const originalValue = activeSheet?.rows[rowIndex + 1]?.[columnIndex] ?? ''
                      return cell !== originalValue
                    })

                    return (
                    <tr
                      key={`${activeSheetName}-${rowIndex + 1}`}
                      className={`odd:bg-white even:bg-slate-50/40 ${rowHasDirtyCell ? 'bg-amber-50/40' : ''}`}
                    >
                      <td className="sticky left-0 z-[1] border-b border-r border-slate-200 bg-inherit px-3 py-3 text-sm font-medium tabular-nums text-slate-500">
                        {rowIndex + 1}
                      </td>
                      {row.map((cell, columnIndex) => {
                        const columnLabel = headerRow[columnIndex] || ''
                        const numericLike = isNumericLikeColumn(columnLabel)
                        const identifierLike = isIdentifierLikeColumn(columnLabel)
                        const originalValue = activeSheet?.rows[rowIndex + 1]?.[columnIndex] ?? ''
                        const isDirtyCell = cell !== originalValue
                        return (
                          <td
                            key={`${rowIndex + 1}-${columnIndex}`}
                            className="border-b border-r border-slate-200 p-0"
                          >
                            <input
                              data-dirty={isDirtyCell ? 'true' : 'false'}
                              value={cell}
                              readOnly={!isEditMode}
                              onChange={(event) => handleCellChange(rowIndex + 1, columnIndex, event.target.value)}
                              className={`${getColumnWidthClass(columnLabel)} border-0 px-3 py-3 text-sm outline-none transition ${
                                numericLike
                                  ? 'bg-transparent text-right tabular-nums text-slate-800'
                                  : identifierLike
                                    ? 'bg-transparent tabular-nums text-slate-800'
                                    : 'bg-transparent text-slate-800'
                              } ${
                                isDirtyCell ? 'bg-amber-50 text-slate-950 ring-1 ring-inset ring-amber-200' : ''
                              } ${
                                !isEditMode
                                  ? 'cursor-default text-slate-700'
                                  : 'focus:bg-sky-50 focus:ring-2 focus:ring-inset focus:ring-sky-200'
                              }`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
