import { existsSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import * as XLSX from 'xlsx'

type SheetMatrix = Array<Array<unknown>>

type HeaderCandidate = {
  rowIndex: number
  headers: string[]
}

type AggregatedEmployee = {
  name: string
  idCard: string
  income: number
  communicationFee: number
  pension: number
  medical: number
  unemployment: number
  housingFund: number
}

type PayoutRow = {
  name: string
  idCard: string
  grossAmount: number
  communicationFee: number
}

type SettlementIncomeRow = {
  idCard: string
  income: number
}

type SocialSecurityRow = {
  idCard: string
  pension: number
  medical: number
  unemployment: number
  housingFund: number
}

const TAX_DECLARATION_HEADERS = [
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
]

const FIXED_TEMPLATE_RELATIVE_PATH = path.join('resources', 'templates', '个税申报表.xlsx')

export class TaxReportWorkflowService {
  async generateReport(input: {
    workspaceRootPath: string
    uploadedRelativePaths: string[]
    templatePath?: string
  }) {
    const workbookPaths = input.uploadedRelativePaths.map((relativePath) =>
      path.resolve(input.workspaceRootPath, relativePath)
    )
    const templatePath =
      input.templatePath ||
      this.resolveFixedTemplatePath()
    const sourceWorkbookPaths = workbookPaths

    const payoutRows: PayoutRow[] = []
    const incomeRows: SettlementIncomeRow[] = []
    const socialRows: SocialSecurityRow[] = []
    const warnings: string[] = []
    let totalPayoutFiles = 0
    let totalSettlementFiles = 0

    for (const workbookPath of sourceWorkbookPaths) {
      const workbook = XLSX.read(await fs.readFile(workbookPath), { type: 'buffer' })
      const parsedPayoutRows = this.extractPayoutRows(workbook)
      const parsedIncomeRows = this.extractSettlementIncomeRows(workbook)
      const parsedSocialRows = this.extractSocialRows(workbook)

      if (parsedPayoutRows.length > 0) {
        totalPayoutFiles += 1
        payoutRows.push(...parsedPayoutRows)
      }

      if (parsedIncomeRows.length > 0 || parsedSocialRows.length > 0) {
        totalSettlementFiles += 1
        incomeRows.push(...parsedIncomeRows)
        socialRows.push(...parsedSocialRows)
      }

      if (parsedPayoutRows.length === 0 && parsedIncomeRows.length === 0 && parsedSocialRows.length === 0) {
        warnings.push(`${path.basename(workbookPath)} 未识别为发放记录表或结算发放表，已跳过`)
      }
    }

    if (totalPayoutFiles === 0) {
      throw new Error('至少需要一个发放记录表')
    }

    const employees = this.aggregateEmployees(payoutRows, incomeRows, socialRows)
    const outputFilePath = await this.writeTemplate({
      templatePath,
      workspaceRootPath: input.workspaceRootPath,
      employees,
    })

    return {
      outputFileName: '个税申报表.xlsx',
      outputFilePath,
      summary: {
        totalPayoutFiles,
        totalSettlementFiles,
        totalEmployees: employees.length,
        warnings,
      },
    }
  }

  private resolveFixedTemplatePath() {
    const candidates = [
      path.resolve(process.cwd(), FIXED_TEMPLATE_RELATIVE_PATH),
      path.resolve(__dirname, '../../resources/templates/个税申报表.xlsx'),
      path.resolve(__dirname, '../../../resources/templates/个税申报表.xlsx'),
    ]

    return candidates.find((candidate) => existsSync(candidate)) || candidates[0]
  }

  private extractPayoutRows(workbook: XLSX.WorkBook) {
    const rows: PayoutRow[] = []

    workbook.SheetNames.forEach((sheetName) => {
      const matrix = this.getSheetMatrix(workbook.Sheets[sheetName])
      const header = this.findHeader(matrix, (headers) =>
        this.hasHeader(headers, '发薪月份') &&
        this.hasHeader(headers, '姓名') &&
        this.hasHeader(headers, '身份证号') &&
        (this.hasHeader(headers, '应发金额') || this.hasHeader(headers, '通讯费'))
      )

      if (!header) {
        return
      }

      const nameIndex = this.findHeaderIndex(header.headers, ['姓名'])
      const idCardIndex = this.findHeaderIndex(header.headers, ['身份证号'])
      const grossAmountIndex = this.findHeaderIndex(header.headers, ['应发金额'])
      const communicationFeeIndex = this.findHeaderIndex(header.headers, ['通讯费'])

      for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex] || []
        const idCard = this.toText(row[idCardIndex])
        if (!idCard) {
          continue
        }

        rows.push({
          name: this.toText(row[nameIndex]),
          idCard,
          grossAmount: this.toNumber(row[grossAmountIndex]),
          communicationFee: this.toNumber(row[communicationFeeIndex]),
        })
      }
    })

    return rows
  }

  private extractSettlementIncomeRows(workbook: XLSX.WorkBook) {
    const rows: SettlementIncomeRow[] = []

    workbook.SheetNames.forEach((sheetName) => {
      const matrix = this.getSheetMatrix(workbook.Sheets[sheetName])
      const header = this.findHeader(matrix, (headers) =>
        this.hasHeader(headers, '姓名') &&
        this.hasHeader(headers, '身份证号') &&
        this.hasHeader(headers, '收入')
      )

      if (!header) {
        return
      }

      const idCardIndex = this.findHeaderIndex(header.headers, ['身份证号'])
      const incomeIndex = this.findHeaderIndex(header.headers, ['收入', '应发金额'])

      for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex] || []
        const idCard = this.toText(row[idCardIndex])
        if (!idCard) {
          continue
        }

        rows.push({
          idCard,
          income: this.toNumber(row[incomeIndex]),
        })
      }
    })

    return rows
  }

  private extractSocialRows(workbook: XLSX.WorkBook) {
    const rows: SocialSecurityRow[] = []

    workbook.SheetNames.forEach((sheetName) => {
      const matrix = this.getSheetMatrix(workbook.Sheets[sheetName])
      const header = this.findHeader(matrix, (headers) =>
        this.hasHeader(headers, '身份证号') &&
        (this.hasHeader(headers, '个人养老') ||
          this.hasHeader(headers, '养老个人') ||
          this.hasHeader(headers, '基本养老保险费'))
      )

      if (!header) {
        return
      }

      const idCardIndex = this.findHeaderIndex(header.headers, ['身份证号'])
      const pensionIndex = this.findHeaderIndex(header.headers, ['个人养老', '养老个人', '基本养老保险费'])
      const medicalIndex = this.findHeaderIndex(header.headers, ['个人医疗', '医疗个人', '基本医疗保险费'])
      const unemploymentIndex = this.findHeaderIndex(header.headers, ['个人失业', '失业个人', '失业保险费'])
      const housingFundIndex = this.findHeaderIndex(header.headers, ['个人公积金', '公积金个人', '住房公积金'])

      for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
        const row = matrix[rowIndex] || []
        const idCard = this.toText(row[idCardIndex])
        if (!idCard) {
          continue
        }

        rows.push({
          idCard,
          pension: this.toNumber(row[pensionIndex]),
          medical: this.toNumber(row[medicalIndex]),
          unemployment: this.toNumber(row[unemploymentIndex]),
          housingFund: this.toNumber(row[housingFundIndex]),
        })
      }
    })

    return rows
  }

  private aggregateEmployees(
    payoutRows: PayoutRow[],
    incomeRows: SettlementIncomeRow[],
    socialRows: SocialSecurityRow[]
  ) {
    const employees = new Map<string, AggregatedEmployee>()
    const incomeById = new Map<string, number>()
    const socialById = new Map<string, Omit<SocialSecurityRow, 'idCard'>>()

    incomeRows.forEach((row) => {
      incomeById.set(row.idCard, (incomeById.get(row.idCard) || 0) + row.income)
    })

    socialRows.forEach((row) => {
      const current = socialById.get(row.idCard) || {
        pension: 0,
        medical: 0,
        unemployment: 0,
        housingFund: 0,
      }

      socialById.set(row.idCard, {
        pension: current.pension + row.pension,
        medical: current.medical + row.medical,
        unemployment: current.unemployment + row.unemployment,
        housingFund: current.housingFund + row.housingFund,
      })
    })

    payoutRows.forEach((row) => {
      const current = employees.get(row.idCard) || {
        name: row.name,
        idCard: row.idCard,
        income: 0,
        communicationFee: 0,
        pension: 0,
        medical: 0,
        unemployment: 0,
        housingFund: 0,
      }

      current.name = current.name || row.name
      current.income += row.grossAmount
      current.communicationFee += row.communicationFee
      employees.set(row.idCard, current)
    })

    employees.forEach((employee, idCard) => {
      const income = incomeById.get(idCard)
      const social = socialById.get(idCard)

      if (typeof income === 'number' && income > 0) {
        employee.income = income
      }

      if (social) {
        employee.pension = social.pension
        employee.medical = social.medical
        employee.unemployment = social.unemployment
        employee.housingFund = social.housingFund
      }
    })

    return Array.from(employees.values()).sort((left, right) => left.idCard.localeCompare(right.idCard))
  }

  private async writeTemplate(input: {
    templatePath: string
    workspaceRootPath: string
    employees: AggregatedEmployee[]
  }) {
    const workbook = await this.loadTemplateWorkbook(input.templatePath)
    const firstSheetName = workbook.SheetNames[0] || '扣缴申报表'
    const sheet = workbook.Sheets[firstSheetName]
    const rows = sheet ? this.getSheetMatrix(sheet) : []
    const headerRow = rows[0]?.length ? rows[0] : TAX_DECLARATION_HEADERS
    const outputRows: SheetMatrix = [headerRow]

    input.employees.forEach((employee, index) => {
      outputRows.push([
        index + 1,
        employee.name,
        '居民身份证',
        employee.idCard,
        employee.income,
        0,
        employee.pension,
        employee.medical,
        employee.unemployment,
        employee.housingFund,
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
        employee.communicationFee,
        0,
        0,
        0,
        0,
        0,
        '',
      ])
    })

    workbook.Sheets[firstSheetName] = XLSX.utils.aoa_to_sheet(outputRows)

    const generatedDir = path.join(input.workspaceRootPath, 'uploads', 'generated')
    await fs.mkdir(generatedDir, { recursive: true })
    const outputFilePath = path.join(generatedDir, `个税申报表-${Date.now()}.xlsx`)
    XLSX.writeFile(workbook, outputFilePath)
    return outputFilePath
  }

  private async loadTemplateWorkbook(templatePath: string) {
    try {
      return XLSX.read(await fs.readFile(templatePath), { type: 'buffer' })
    } catch (error) {
      if ((error as NodeJS.ErrnoException)?.code !== 'ENOENT') {
        throw error
      }

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.aoa_to_sheet([TAX_DECLARATION_HEADERS]),
        '扣缴申报表'
      )
      return workbook
    }
  }

  private getSheetMatrix(sheet: XLSX.WorkSheet) {
    return (XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true }) as SheetMatrix).map((row) =>
      Array.isArray(row) ? row : []
    )
  }

  private findHeader(matrix: SheetMatrix, predicate: (headers: string[]) => boolean): HeaderCandidate | null {
    const maxRows = Math.min(matrix.length, 6)

    for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
      const single = this.buildHeaderCandidate(matrix, rowIndex)
      if (predicate(single.headers)) {
        return single
      }

      if (rowIndex + 1 < maxRows) {
        const combined = this.buildHeaderCandidate(matrix, rowIndex, rowIndex + 1)
        if (predicate(combined.headers)) {
          return combined
        }
      }
    }

    return null
  }

  private buildHeaderCandidate(matrix: SheetMatrix, primaryRowIndex: number, secondaryRowIndex?: number): HeaderCandidate {
    const primaryRow = matrix[primaryRowIndex] || []
    const secondaryRow = typeof secondaryRowIndex === 'number' ? matrix[secondaryRowIndex] || [] : []
    const maxLength = Math.max(primaryRow.length, secondaryRow.length)
    const headers = Array.from({ length: maxLength }, (_, index) => {
      const primary = this.normalizeHeader(primaryRow[index])
      const secondary = this.normalizeHeader(secondaryRow[index])

      if (!secondary) {
        return primary
      }

      if (!primary || primary === secondary) {
        return secondary
      }

      return `${primary}${secondary}`
    })

    return {
      rowIndex: typeof secondaryRowIndex === 'number' ? secondaryRowIndex : primaryRowIndex,
      headers,
    }
  }

  private normalizeHeader(value: unknown) {
    return this.toText(value).replace(/\s+/g, '')
  }

  private hasHeader(headers: string[], expectedHeader: string) {
    return headers.some((header) => header === expectedHeader)
  }

  private findHeaderIndex(headers: string[], candidates: string[]) {
    const index = headers.findIndex((header) => candidates.includes(header))
    return index >= 0 ? index : -1
  }

  private toText(value: unknown) {
    if (value === null || value === undefined) {
      return ''
    }

    return String(value).trim()
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return 0
    }

    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : 0
    }

    const parsed = Number(String(value).replace(/,/g, '').trim())
    return Number.isFinite(parsed) ? parsed : 0
  }
}
