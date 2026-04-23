/**
 * @jest-environment node
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import * as XLSX from 'xlsx'
import { TaxReportWorkflowService } from '../services/TaxReportWorkflowService'

async function createWorkbook(filePath: string, sheets: Array<{ name: string; rows: Array<Array<string | number | null>> }>) {
  const workbook = XLSX.utils.book_new()
  sheets.forEach(({ name, rows }) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows)
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  })
  XLSX.writeFile(workbook, filePath)
}

async function readSheetRows(filePath: string, sheetName: string) {
  const workbook = XLSX.read(await fs.readFile(filePath), { type: 'buffer' })
  const sheet = workbook.Sheets[sheetName]
  if (!sheet) {
    throw new Error(`未找到 sheet: ${sheetName}`)
  }
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as Array<Array<string | number | null>>
}

describe('TaxReportWorkflowService', () => {
  let tempDir: string
  let workspaceRoot: string
  let uploadsDir: string
  let templatePath: string

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tax-report-'))
    workspaceRoot = path.join(tempDir, 'workspace')
    uploadsDir = path.join(workspaceRoot, 'uploads')
    await fs.mkdir(uploadsDir, { recursive: true })
    templatePath = path.join(workspaceRoot, '个税申报表.xlsx')

    await createWorkbook(templatePath, [
      {
        name: '扣缴申报表',
        rows: [
          [
            '*工号',
            '*姓名',
            '*证件类型',
            '*证件号码',
            '本期收入',
            '本期免税收入',
            '基本养老保险费',
            '基本医疗保险费',
            '失业保险费',
            '住房公积金',
            '累计子女教育',
            '累计继续教育',
            '累计住房贷款利息',
            '累计住房租金',
            '累计赡养老人',
            '累计 3 岁以下婴幼儿照护',
            '累计个人养老金',
            '企业 (职业) 年金',
            '商业健康保险',
            '税延养老保险',
            '公务交通费用',
            '通讯费用',
            '律师办案费用',
            '西藏附加减除费用',
            '其他',
            '准予扣除的捐赠额',
            '减免税额',
            '备注',
          ],
        ],
      },
    ])
  })

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  test('classifies workbooks by structure, aggregates duplicate IDs, fills zeros, and exports declaration workbook', async () => {
    const payoutPath = path.join(uploadsDir, '自定义文件A.xlsx')
    const settlementPath = path.join(uploadsDir, '自定义文件B.xlsx')

    await createWorkbook(payoutPath, [
      {
        name: '任意sheet',
        rows: [
          [
            '发薪月份',
            '完成时间',
            '姓名',
            '身份证号',
            '手机号码',
            '项目名称',
            '客户公司',
            '银行名称',
            '银行卡号',
            '应发金额',
            '个税',
            '实发金额',
            '通讯费',
          ],
          [10, null, '张三', '110101199001011234', null, null, '客户A', null, null, 1000, 0, 1000, 50],
          [10, null, '张三', '110101199001011234', null, null, '客户A', null, null, 500, 0, 500, null],
          [10, null, '李四', '220202199202022222', null, null, '客户B', null, null, null, 0, 0, null],
        ],
      },
    ])

    await createWorkbook(settlementPath, [
      {
        name: '说明',
        rows: [['说明']],
      },
      {
        name: '业务明细',
        rows: [
          ['序号', '姓名', '身份证号', '收入', '应发金额'],
          [1, '张三', '110101199001011234', 1600, 1600],
          [2, '李四', '220202199202022222', 2000, 2000],
        ],
      },
      {
        name: '社保明细',
        rows: [
          ['姓名', '身份证号', '个人养老', '个人医疗', '个人失业', '个人公积金'],
          ['张三', '110101199001011234', 100, 20, 5, 50],
          ['李四', '220202199202022222', null, null, null, null],
        ],
      },
    ])

    const service = new TaxReportWorkflowService()
    const result = await service.generateReport({
      workspaceRootPath: workspaceRoot,
      uploadedRelativePaths: ['uploads/自定义文件A.xlsx', 'uploads/自定义文件B.xlsx'],
      templatePath,
    })

    expect(result.summary.totalPayoutFiles).toBe(1)
    expect(result.summary.totalSettlementFiles).toBe(1)
    expect(result.summary.totalEmployees).toBe(2)
    expect(result.outputFileName).toBe('个税申报表.xlsx')

    const rows = await readSheetRows(result.outputFilePath, '扣缴申报表')
    expect(rows[0]).toEqual([
      '*工号',
      '*姓名',
      '*证件类型',
      '*证件号码',
      '本期收入',
      '本期免税收入',
      '基本养老保险费',
      '基本医疗保险费',
      '失业保险费',
      '住房公积金',
      '累计子女教育',
      '累计继续教育',
      '累计住房贷款利息',
      '累计住房租金',
      '累计赡养老人',
      '累计 3 岁以下婴幼儿照护',
      '累计个人养老金',
      '企业 (职业) 年金',
      '商业健康保险',
      '税延养老保险',
      '公务交通费用',
      '通讯费用',
      '律师办案费用',
      '西藏附加减除费用',
      '其他',
      '准予扣除的捐赠额',
      '减免税额',
      '备注',
    ])
    expect(rows[1]).toEqual([
      1,
      '张三',
      '居民身份证',
      '110101199001011234',
      1600,
      0,
      100,
      20,
      5,
      50,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      50,
      0,
      0,
      0,
      0,
      0,
      '',
    ])
    expect(rows[2]).toEqual([
      2,
      '李四',
      '居民身份证',
      '220202199202022222',
      2000,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      '',
    ])
  })

  test('ignores uploaded declaration workbook as a data source and keeps payout detection correct', async () => {
    const uploadedTemplatePath = path.join(uploadsDir, '个税申报表.xlsx')
    const payoutPath = path.join(uploadsDir, '发放记录表.xlsx')

    await createWorkbook(uploadedTemplatePath, [
      {
        name: '扣缴申报表',
        rows: [
          [
            '*工号',
            '*姓名',
            '*证件类型',
            '*证件号码',
            '本期收入',
            '本期免税收入',
            '基本养老保险费',
            '基本医疗保险费',
            '失业保险费',
            '住房公积金',
            '累计子女教育',
            '累计继续教育',
            '累计住房贷款利息',
            '累计住房租金',
            '累计赡养老人',
            '累计 3 岁以下婴幼儿照护',
            '累计个人养老金',
            '企业 (职业) 年金',
            '商业健康保险',
            '税延养老保险',
            '公务交通费用',
            '通讯费用',
            '律师办案费用',
            '西藏附加减除费用',
            '其他',
            '准予扣除的捐赠额',
            '减免税额',
            '备注',
          ],
        ],
      },
    ])

    await createWorkbook(payoutPath, [
      {
        name: '任意sheet',
        rows: [
          ['发薪月份', '姓名', '身份证号', '应发金额', '通讯费'],
          [10, '张三', '110101199001011234', 1000, 50],
        ],
      },
    ])

    const service = new TaxReportWorkflowService()
    const result = await service.generateReport({
      workspaceRootPath: workspaceRoot,
      uploadedRelativePaths: ['uploads/个税申报表.xlsx', 'uploads/发放记录表.xlsx'],
    })

    expect(result.summary.totalPayoutFiles).toBe(1)
    expect(result.summary.totalSettlementFiles).toBe(0)
    expect(result.summary.warnings).toHaveLength(1)

    const rows = await readSheetRows(result.outputFilePath, '扣缴申报表')
    expect(rows[1]?.[1]).toBe('张三')
    expect(rows[1]?.[3]).toBe('110101199001011234')
  })

  test('falls back to built-in declaration template when no template file is available', async () => {
    const payoutPath = path.join(uploadsDir, '发放记录表.xlsx')

    await createWorkbook(payoutPath, [
      {
        name: '任意sheet',
        rows: [
          ['发薪月份', '姓名', '身份证号', '应发金额', '通讯费'],
          [10, '张三', '110101199001011234', 1000, 50],
        ],
      },
    ])

    await fs.rm(templatePath, { force: true })

    const service = new TaxReportWorkflowService()
    const result = await service.generateReport({
      workspaceRootPath: workspaceRoot,
      uploadedRelativePaths: ['uploads/发放记录表.xlsx'],
    })

    const rows = await readSheetRows(result.outputFilePath, '扣缴申报表')
    expect(rows[0]).toEqual([
      '*工号',
      '*姓名',
      '*证件类型',
      '*证件号码',
      '本期收入',
      '本期免税收入',
      '基本养老保险费',
      '基本医疗保险费',
      '失业保险费',
      '住房公积金',
      '累计子女教育',
      '累计继续教育',
      '累计住房贷款利息',
      '累计住房租金',
      '累计赡养老人',
      '累计 3 岁以下婴幼儿照护',
      '累计个人养老金',
      '企业 (职业) 年金',
      '商业健康保险',
      '税延养老保险',
      '公务交通费用',
      '通讯费用',
      '律师办案费用',
      '西藏附加减除费用',
      '其他',
      '准予扣除的捐赠额',
      '减免税额',
      '备注',
    ])
    expect(rows[1]?.[1]).toBe('张三')
  })

  test('throws when no payout workbook is present', async () => {
    const settlementPath = path.join(uploadsDir, '仅结算.xlsx')
    await createWorkbook(settlementPath, [
      {
        name: '业务明细',
        rows: [
          ['序号', '姓名', '身份证号', '收入', '应发金额'],
          [1, '张三', '110101199001011234', 1600, 1600],
        ],
      },
      {
        name: '社保明细',
        rows: [
          ['姓名', '身份证号', '个人养老', '个人医疗', '个人失业', '个人公积金'],
          ['张三', '110101199001011234', 100, 20, 5, 50],
        ],
      },
    ])

    const service = new TaxReportWorkflowService()

    await expect(
      service.generateReport({
        workspaceRootPath: workspaceRoot,
        uploadedRelativePaths: ['uploads/仅结算.xlsx'],
        templatePath,
      })
    ).rejects.toThrow('至少需要一个发放记录表')
  })
})
