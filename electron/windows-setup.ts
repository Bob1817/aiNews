import { app, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { execSync } from 'child_process'
import os from 'os'

/**
 * Windows 安装修复工具
 * 在首次启动时自动检测并修复常见问题
 */
export class WindowsSetup {
  private static readonly SETUP_FLAG_FILE = 'setup-completed.flag'
  private static readonly LOG_FILE = 'setup-log.txt'

  /**
   * 检查是否已完成初始设置
   */
  static isSetupCompleted(): boolean {
    const flagPath = path.join(app.getPath('userData'), this.SETUP_FLAG_FILE)
    return fs.existsSync(flagPath)
  }

  /**
   * 标记设置已完成
   */
  static markSetupCompleted(): void {
    const flagPath = path.join(app.getPath('userData'), this.SETUP_FLAG_FILE)
    fs.writeFileSync(flagPath, new Date().toISOString(), 'utf-8')
  }

  /**
   * 记录日志
   */
  private static log(message: string): void {
    const logPath = path.join(app.getPath('userData'), this.LOG_FILE)
    const timestamp = new Date().toISOString()
    const logMessage = `[${timestamp}] ${message}\n`
    fs.appendFileSync(logPath, logMessage, 'utf-8')
    console.log(`[WindowsSetup] ${message}`)
  }

  /**
   * 执行 Windows 安装修复
   */
  static async performSetup(): Promise<boolean> {
    if (process.platform !== 'win32') {
      this.log('非 Windows 平台，跳过设置')
      return true
    }

    if (this.isSetupCompleted()) {
      this.log('设置已完成，跳过')
      return true
    }

    this.log('开始 Windows 安装修复...')

    try {
      // 1. 检查并修复 Windows 防火墙规则
      await this.fixFirewallRules()

      // 2. 检查并修复 hosts 文件
      await this.fixHostsFile()

      // 3. 检查端口占用
      await this.checkPortAvailability()

      // 4. 创建必要的目录
      await this.createRequiredDirectories()

      // 5. 验证 API 服务器文件
      await this.verifyApiServerFiles()

      // 6. 设置环境变量
      await this.setupEnvironmentVariables()

      // 标记设置完成
      this.markSetupCompleted()
      this.log('Windows 安装修复完成')

      return true
    } catch (error) {
      this.log(`设置失败: ${error instanceof Error ? error.message : '未知错误'}`)
      return false
    }
  }

  /**
   * 修复 Windows 防火墙规则
   */
  private static async fixFirewallRules(): Promise<void> {
    this.log('检查 Windows 防火墙规则...')

    try {
      // 检查是否存在规则
      const checkCmd = 'netsh advfirewall firewall show rule name="AI News Tool API"'
      let ruleExists = false

      try {
        execSync(checkCmd, { encoding: 'utf-8' })
        ruleExists = true
      } catch {
        ruleExists = false
      }

      if (!ruleExists) {
        this.log('添加 Windows 防火墙规则...')
        // 添加入站规则允许 3001 端口
        const addRuleCmd = `netsh advfirewall firewall add rule name="AI News Tool API" dir=in action=allow protocol=tcp localport=3001`
        execSync(addRuleCmd, { encoding: 'utf-8' })
        this.log('防火墙规则添加成功')
      } else {
        this.log('防火墙规则已存在')
      }
    } catch (error) {
      this.log(`防火墙规则设置失败: ${error}`)
      // 非致命错误，继续
    }
  }

  /**
   * 修复 hosts 文件
   */
  private static async fixHostsFile(): Promise<void> {
    this.log('检查 hosts 文件...')

    try {
      const hostsPath = path.join(os.homedir(), '..', 'Windows', 'System32', 'drivers', 'etc', 'hosts')
      const localhostEntry = '127.0.0.1 localhost'

      if (fs.existsSync(hostsPath)) {
        const content = fs.readFileSync(hostsPath, 'utf-8')
        if (!content.includes(localhostEntry)) {
          this.log('添加 localhost 到 hosts 文件...')
          fs.appendFileSync(hostsPath, `\n${localhostEntry}\n`, 'utf-8')
          this.log('hosts 文件修复完成')
        } else {
          this.log('hosts 文件正常')
        }
      }
    } catch (error) {
      this.log(`hosts 文件修复失败: ${error}`)
      // 非致命错误，继续
    }
  }

  /**
   * 检查端口可用性
   */
  private static async checkPortAvailability(): Promise<void> {
    this.log('检查端口 3001 可用性...')

    try {
      // 使用 netstat 检查端口
      const netstatCmd = 'netstat -ano | findstr :3001'
      try {
        const result = execSync(netstatCmd, { encoding: 'utf-8' })
        if (result.includes('3001')) {
          this.log('警告: 端口 3001 已被占用')
          // 尝试查找并终止进程
          this.log('尝试释放端口...')
        } else {
          this.log('端口 3001 可用')
        }
      } catch {
        this.log('端口 3001 可用')
      }
    } catch (error) {
      this.log(`端口检查失败: ${error}`)
    }
  }

  /**
   * 创建必要的目录
   */
  private static async createRequiredDirectories(): Promise<void> {
    this.log('创建必要的目录...')

    const dirs = [
      app.getPath('userData'),
      path.join(app.getPath('userData'), 'logs'),
      path.join(app.getPath('userData'), 'cache'),
    ]

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        this.log(`创建目录: ${dir}`)
      }
    }
  }

  /**
   * 验证 API 服务器文件
   */
  private static async verifyApiServerFiles(): Promise<void> {
    this.log('验证 API 服务器文件...')

    const possiblePaths = [
      path.join(app.getAppPath(), 'dist-api', 'api', 'index.js'),
      path.join(process.resourcesPath, 'dist-api', 'api', 'index.js'),
      path.join(__dirname, '..', 'dist-api', 'api', 'index.js'),
    ]

    let found = false
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        this.log(`找到 API 服务器: ${p}`)
        found = true
        break
      }
    }

    if (!found) {
      this.log('错误: 未找到 API 服务器文件')
      throw new Error('API 服务器文件缺失')
    }
  }

  /**
   * 设置环境变量
   */
  private static async setupEnvironmentVariables(): Promise<void> {
    this.log('设置环境变量...')

    // 设置 Node 环境
    process.env.NODE_ENV = 'production'
    process.env.PORT = '3001'
    process.env.HOST = '127.0.0.1'

    // 设置 CORS 来源
    process.env.CORS_ORIGINS = 'http://localhost:5173,http://localhost:3000,null'

    this.log('环境变量设置完成')
  }

  /**
   * 显示设置结果
   */
  static showSetupResult(success: boolean): void {
    if (!success) {
      dialog.showErrorBox(
        '安装修复失败',
        '首次启动设置失败。请尝试以下解决方案:\n\n' +
        '1. 以管理员身份运行应用\n' +
        '2. 检查 Windows 防火墙设置\n' +
        '3. 重新安装应用\n\n' +
        `日志文件: ${path.join(app.getPath('userData'), this.LOG_FILE)}`
      )
    }
  }
}
