import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import http from 'http'
import { execSync } from 'child_process'

/**
 * 启动检查工具
 * 在应用启动时检查并修复常见问题
 */
export class StartupCheck {
  private static readonly CHECK_TIMEOUT = 5000
  private static readonly API_PORT = 3001

  /**
   * 执行启动检查
   */
  static async performChecks(): Promise<{ success: boolean; issues: string[] }> {
    const issues: string[] = []

    console.log('🔍 执行启动检查...')

    // 1. 检查 API 端口
    const portCheck = await this.checkApiPort()
    if (!portCheck.available) {
      issues.push(`端口 ${this.API_PORT} 被占用: ${portCheck.process}`)
      // 尝试释放端口
      const released = await this.releasePort()
      if (!released) {
        issues.push('无法释放端口')
      }
    }

    // 2. 检查 API 服务器文件
    const apiFileCheck = this.checkApiFiles()
    if (!apiFileCheck.exists) {
      issues.push(`API 服务器文件不存在: ${apiFileCheck.checkedPaths.join(', ')}`)
    }

    // 3. 检查用户数据目录
    const userDataCheck = this.checkUserDataDirectory()
    if (!userDataCheck.exists) {
      issues.push('用户数据目录创建失败')
    }

    // 4. Windows 特定检查
    if (process.platform === 'win32') {
      const windowsCheck = await this.checkWindowsSpecific()
      issues.push(...windowsCheck.issues)
    }

    const success = issues.length === 0
    console.log(success ? '✅ 启动检查通过' : `⚠️ 发现 ${issues.length} 个问题`)

    return { success, issues }
  }

  /**
   * 检查 API 端口是否可用
   */
  private static async checkApiPort(): Promise<{ available: boolean; process?: string }> {
    return new Promise((resolve) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: this.API_PORT,
        path: '/api/health',
        method: 'GET',
        timeout: this.CHECK_TIMEOUT
      }, (res) => {
        // 端口被占用（有响应）
        resolve({ available: false, process: '未知进程' })
      })

      req.on('error', () => {
        // 端口可用（无响应）
        resolve({ available: true })
      })

      req.on('timeout', () => {
        req.destroy()
        resolve({ available: true })
      })

      req.end()
    })
  }

  /**
   * 释放被占用的端口
   */
  private static async releasePort(): Promise<boolean> {
    if (process.platform !== 'win32') return true

    try {
      // 查找占用 3001 端口的进程
      const findCmd = `netstat -ano | findstr :${this.API_PORT}`
      const result = execSync(findCmd, { encoding: 'utf-8' })

      // 提取 PID
      const lines = result.split('\n')
      for (const line of lines) {
        const match = line.match(/(\d+)\s*$/)
        if (match) {
          const pid = match[1]
          console.log(`🔍 发现占用端口的进程 PID: ${pid}`)

          // 尝试终止进程
          try {
            execSync(`taskkill /F /PID ${pid}`, { encoding: 'utf-8' })
            console.log(`✅ 已终止进程 ${pid}`)
            return true
          } catch (e) {
            console.log(`⚠️ 无法终止进程 ${pid}: ${e}`)
          }
        }
      }
    } catch (error) {
      console.log('端口未被占用或无法检查')
    }

    return false
  }

  /**
   * 检查 API 服务器文件
   */
  private static checkApiFiles(): { exists: boolean; checkedPaths: string[] } {
    const possiblePaths = [
      path.join(app.getAppPath(), 'dist-api', 'api', 'index.js'),
      path.join(process.resourcesPath, 'dist-api', 'api', 'index.js'),
      path.join(__dirname, '..', 'dist-api', 'api', 'index.js'),
    ]

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return { exists: true, checkedPaths: [p] }
      }
    }

    return { exists: false, checkedPaths: possiblePaths }
  }

  /**
   * 检查用户数据目录
   */
  private static checkUserDataDirectory(): { exists: boolean } {
    const userDataPath = app.getPath('userData')
    try {
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true })
      }
      return { exists: true }
    } catch (error) {
      return { exists: false }
    }
  }

  /**
   * Windows 特定检查
   */
  private static async checkWindowsSpecific(): Promise<{ issues: string[] }> {
    const issues: string[] = []

    // 检查 .NET Framework
    try {
      execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\NET Framework Setup\\NDP\\v4\\Full" /v Version', { encoding: 'utf-8' })
    } catch {
      issues.push('未检测到 .NET Framework 4.0+')
    }

    // 检查 Visual C++ Redistributable
    try {
      execSync('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\x64" /v Version', { encoding: 'utf-8' })
    } catch {
      issues.push('未检测到 Visual C++ Redistributable 2015+')
    }

    return { issues }
  }

  /**
   * 显示检查结果
   */
  static showCheckResult(result: { success: boolean; issues: string[] }): void {
    if (!result.success) {
      const issueList = result.issues.map(i => `• ${i}`).join('\n')
      dialog.showWarningBox(
        '启动检查警告',
        `检测到以下问题：\n\n${issueList}\n\n` +
        '应用可能无法正常工作。建议：\n' +
        '1. 以管理员身份重新运行\n' +
        '2. 检查系统环境\n' +
        '3. 重新安装应用'
      )
    }
  }

  /**
   * 等待 API 服务器就绪
   */
  static async waitForApiServer(maxAttempts: number = 30): Promise<boolean> {
    console.log('⏳ 等待 API 服务器就绪...')

    for (let i = 0; i < maxAttempts; i++) {
      const check = await this.checkApiPort()
      if (!check.available) {
        // 端口被占用，说明服务器已启动
        console.log('✅ API 服务器已就绪')
        return true
      }
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('❌ API 服务器启动超时')
    return false
  }
}
