import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import XLSX from 'xlsx'
import { SavedNewsService } from '../services/SavedNewsService'

describe('SavedNewsService workbook operations', () => {
  beforeEach(() => {
    ;(SavedNewsService as unknown as { savedNews: unknown[] }).savedNews = []
  })

  test('stores generated xlsx file as task result file item', async () => {
    const service = new SavedNewsService()

    const saved = await service.registerGeneratedFile({
      userId: '1',
      title: '个税申报表 2026-04-22 16:00:00',
      content: '个税报表工作流已生成标准申报表文件。',
      fileName: '个税申报表.xlsx',
      filePath: '/tmp/generated/个税申报表.xlsx',
      downloadUrl: '/api/workflows/executions/execution-1/artifacts/artifact-1/download?userId=1',
      fileFormat: 'xlsx',
    })

    expect(saved.outputType).toBe('file')
    expect(saved.fileFormat).toBe('xlsx')
    expect(saved.fileName).toBe('个税申报表.xlsx')
    expect(saved.downloadUrl).toContain('/api/workflows/executions/execution-1/artifacts/artifact-1/download')

    const all = await service.getSavedNews('1')
    expect(all.some((item) => item.id === saved.id)).toBe(true)
  })

  test('reads workbook sheets for xlsx saved file', async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'workbook-read-'))
    const filePath = path.join(tempDir, '个税申报表.xlsx')
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['姓名', '收入'],
        ['张三', '1000'],
      ]),
      'Sheet1'
    )
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
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['姓名', '收入'],
        ['张三', '1000'],
      ]),
      'Sheet1'
    )
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

  test('deletes saved xlsx record and removes physical file', async () => {
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
})
