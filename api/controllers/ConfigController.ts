import { spawn } from 'node:child_process'
import { Request, Response } from 'express'
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { ConfigService } from '../services/ConfigService'

export class ConfigController {
  private configService: ConfigService

  constructor() {
    this.configService = new ConfigService()
  }

  private sanitizeFileName(fileName: string) {
    const ext = path.extname(fileName)
    const baseName = path.basename(fileName, ext)
    const safeBaseName =
      baseName.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').replace(/\s+/g, ' ').trim() || 'workspace-file'

    return {
      ext: ext || '',
      safeBaseName,
    }
  }

  private shouldIgnoreImportedPath(relativePath: string) {
    const normalized = relativePath.replace(/\\/g, '/')
    const segments = normalized.split('/').filter(Boolean).map((item) => item.toLowerCase())
    return segments.includes('output') || segments.includes('generated')
  }

  private async collectImportableFiles(rootPath: string, currentPath: string, files: string[] = []) {
    const entries = await readdir(currentPath, { withFileTypes: true })

    for (const entry of entries) {
      const absolutePath = path.join(currentPath, entry.name)
      const relativePath = path.relative(rootPath, absolutePath)

      if (this.shouldIgnoreImportedPath(relativePath)) {
        continue
      }

      if (entry.isDirectory()) {
        await this.collectImportableFiles(rootPath, absolutePath, files)
        continue
      }

      if (entry.isFile() && /\.(xlsx|xls)$/i.test(entry.name)) {
        files.push(absolutePath)
      }
    }

    return files
  }

  private async resolveOllamaModelName(aiModel: {
    baseUrl?: string
    modelName?: string
  }): Promise<string> {
    if (aiModel.modelName?.trim()) {
      return aiModel.modelName.trim()
    }

    const baseUrl = (aiModel.baseUrl || 'http://localhost:11434').replace(/\/$/, '')

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json() as { models?: Array<{ name?: string; model?: string }> }
        const firstModel = data.models?.[0]
        const resolvedModelName = firstModel?.model || firstModel?.name

        if (resolvedModelName) {
          return resolvedModelName
        }
      }
    } catch (error) {
      console.warn('解析 Ollama 实际模型名失败:', error)
    }

    return process.env.OLLAMA_MODEL || 'gemma4:latest'
  }

  private getActiveConfiguredModel(config: Awaited<ReturnType<ConfigService['getConfig']>>) {
    if (this.hasConfiguredAIModel(config.aiModel)) {
      return {
        id: config.aiModel.id,
        name: config.aiModel.name,
        provider: config.aiModel.provider,
        apiKey: config.aiModel.apiKey,
        modelName: config.aiModel.modelName,
        baseUrl: config.aiModel.baseUrl,
        source: 'primary' as const,
      }
    }

    const activeModel = config.aiModels?.find((item) => item.isActive) || config.aiModels?.[0]
    if (!activeModel) {
      return null
    }

    return {
      id: activeModel.id,
      name: activeModel.name,
      provider: activeModel.provider,
      apiKey: activeModel.apiKey,
      modelName: activeModel.modelName,
      baseUrl: activeModel.baseUrl,
      source: 'fallback' as const,
    }
  }

  private hasConfiguredAIModel(aiModel: {
    provider?: string
    apiKey?: string
    modelName?: string
    baseUrl?: string
  }): boolean {
    switch (aiModel.provider) {
      case 'ollama':
      case 'llamacpp':
        return Boolean(aiModel.modelName || aiModel.baseUrl)
      case 'openai':
      case 'anthropic':
      case 'google':
        return Boolean(aiModel.apiKey || aiModel.modelName || aiModel.baseUrl)
      default:
        return false
    }
  }

  private async testCloudAIConnection(aiModel: {
    provider?: string
    apiKey?: string
    baseUrl?: string
    modelName?: string
  }): Promise<{ success: boolean; message: string }> {
    if (!aiModel.provider || !aiModel.apiKey) {
      return {
        success: false,
        message: '请提供有效的 API Key',
      }
    }

    const baseUrl =
      (aiModel.baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiModel.apiKey}`,
        },
        body: JSON.stringify({
          model: aiModel.modelName,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 5,
        }),
      })

      const contentType = response.headers.get('content-type') || ''
      const isJson = contentType.includes('application/json')
      const data = isJson ? await response.json() : await response.text()

      if (!response.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? JSON.stringify(data.error)
            : `模型连接失败: ${response.status}`

        return {
          success: false,
          message,
        }
      }

      return {
        success: true,
        message: 'AI 模型连接成功',
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '无法连接到云端 AI 模型',
      }
    }
  }

  private async testOllamaConnection(aiModel: {
    baseUrl?: string
    modelName?: string
  }): Promise<{ success: boolean; message: string }> {
    const baseUrl = (aiModel.baseUrl || 'http://localhost:11434').replace(/\/$/, '')

    try {
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Ollama API 调用失败: ${response.status}`)
      }

      const data = await response.json() as { models?: Array<{ name?: string; model?: string }> }
      const resolvedModelName = await this.resolveOllamaModelName(aiModel)
      const hasModel = data.models?.some((model) => {
        const candidate = model.model || model.name || ''
        return candidate === resolvedModelName || candidate.includes(resolvedModelName)
      })

      if (!hasModel) {
        return {
          success: false,
          message: `未找到 ${resolvedModelName} 模型，请确保已在 Ollama 中安装该模型`,
        }
      }

      const generateResponse = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: resolvedModelName,
          prompt: 'ping',
          stream: false,
        }),
      })

      if (!generateResponse.ok) {
        const contentType = generateResponse.headers.get('content-type') || ''
        const isJson = contentType.includes('application/json')
        const data = isJson ? await generateResponse.json() : await generateResponse.text()
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? String(data.error)
            : `Ollama generate 调用失败: ${generateResponse.status}`

        return {
          success: false,
          message,
        }
      }

      return {
        success: true,
        message: 'Ollama 模型连接成功',
      }
    } catch (error) {
      console.error('Ollama 连接测试错误:', error)
      return {
        success: false,
        message: 'Ollama 服务不可用，请确保 Ollama 正在运行并安装了相应模型',
      }
    }
  }

  private async testLlamaCppConnection(aiModel: {
    apiKey?: string
    baseUrl?: string
    modelName?: string
  }): Promise<{ success: boolean; message: string }> {
    const baseUrl = (aiModel.baseUrl || 'http://localhost:8080').replace(/\/$/, '')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (aiModel.apiKey) {
      headers.Authorization = `Bearer ${aiModel.apiKey}`
    }

    // 添加 5 秒超时
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('请求超时')), 5000)
    })

    try {
      const chatResponse = await Promise.race([
        fetch(`${baseUrl}/v1/chat/completions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: aiModel.modelName || 'llama.cpp',
            messages: [{ role: 'user', content: '测试连接，请简短回复。' }],
            max_tokens: 16,
          }),
        }),
        timeoutPromise
      ])

      if (chatResponse.ok) {
        return { success: true, message: 'llama.cpp 模型连接成功' }
      }
    } catch (error) {
      console.warn('llama.cpp chat/completions 测试失败，尝试 completion 回退:', error)
    }

    try {
      const completionResponse = await Promise.race([
        fetch(`${baseUrl}/completion`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: '测试连接，请简短回复。',
            n_predict: 16,
            stream: false,
          }),
        }),
        timeoutPromise
      ])

      if (completionResponse.ok) {
        return { success: true, message: 'llama.cpp 模型连接成功' }
      }

      return {
        success: false,
        message: `llama.cpp 模型连接失败: ${completionResponse.status}`,
      }
    } catch (error) {
      console.error('llama.cpp 连接测试失败:', error)
      return {
        success: false,
        message: '无法连接到 llama.cpp 模型，请检查服务是否正在运行',
      }
    }
  }

  // 获取配置
  async getConfig(req: Request, res: Response) {
    try {
      const { userId } = req.query
      const config = await this.configService.getConfig(userId as string)
      res.json(config)
    } catch (error) {
      res.status(500).json({ error: '获取配置失败' })
    }
  }

  async getActiveAIModel(req: Request, res: Response) {
    try {
      const { userId } = req.query
      const config = await this.configService.getConfig(userId as string)
      const activeModel = this.getActiveConfiguredModel(config)

      if (!activeModel) {
        return res.json({
          configured: false,
          provider: null,
          configuredName: '',
          configuredModelName: '',
          effectiveModelName: '',
          baseUrl: '',
          source: null,
        })
      }

      const effectiveModelName =
        activeModel.provider === 'ollama'
          ? await this.resolveOllamaModelName(activeModel)
          : activeModel.modelName || ''

      return res.json({
        configured: true,
        provider: activeModel.provider,
        configuredName: activeModel.name || '',
        configuredModelName: activeModel.modelName || '',
        effectiveModelName,
        baseUrl: activeModel.baseUrl || '',
        source: activeModel.source,
      })
    } catch (error) {
      console.error('获取当前生效 AI 模型失败:', error)
      res.status(500).json({ error: '获取当前生效 AI 模型失败' })
    }
  }

  async uploadWorkspaceAsset(req: Request, res: Response) {
    try {
      const { userId, fileName, contentBase64, mimeType } = req.body as {
        userId?: string
        fileName?: string
        contentBase64?: string
        mimeType?: string
      }

      if (!userId || !fileName || !contentBase64) {
        return res.status(400).json({
          error: '参数错误',
          message: '请提供 userId、fileName 和 contentBase64',
        })
      }

      const config = await this.configService.getConfig(userId)
      const uploadsDir = path.join(config.workspace.rootPath, 'uploads')
      await mkdir(uploadsDir, { recursive: true })

      const { ext, safeBaseName } = this.sanitizeFileName(fileName)
      const savedFileName = `${safeBaseName}-${Date.now()}${ext}`
      const savedFilePath = path.join(uploadsDir, savedFileName)

      await writeFile(savedFilePath, Buffer.from(contentBase64, 'base64'))

      return res.json({
        success: true,
        message: '文件上传成功',
        data: {
          fileName: savedFileName,
          filePath: savedFilePath,
          relativePath: `uploads/${savedFileName}`,
          assetUrl: `/api/config/workspace/asset?userId=${encodeURIComponent(userId)}&path=${encodeURIComponent(`uploads/${savedFileName}`)}`,
          mimeType: mimeType || 'application/octet-stream',
        },
      })
    } catch (error) {
      console.error('上传工作文件失败:', error)
      return res.status(500).json({
        error: '上传工作文件失败',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }

  async importWorkspaceFolder(req: Request, res: Response) {
    try {
      const { userId, folderPath } = req.body as {
        userId?: string
        folderPath?: string
      }

      if (!userId || !folderPath) {
        return res.status(400).json({
          error: '参数错误',
          message: '请提供 userId 和 folderPath',
        })
      }

      const sourceStat = await stat(folderPath)
      if (!sourceStat.isDirectory()) {
        return res.status(400).json({
          error: '参数错误',
          message: '请选择有效的文件夹',
        })
      }

      const config = await this.configService.getConfig(userId)
      const uploadsDir = path.join(config.workspace.rootPath, 'uploads')
      await mkdir(uploadsDir, { recursive: true })

      const sourceFiles = await this.collectImportableFiles(folderPath, folderPath)
      if (sourceFiles.length === 0) {
        return res.status(400).json({
          error: '未找到文件',
          message: '所选文件夹中没有可用的 Excel 文件',
        })
      }

      const assets = []
      for (const sourceFile of sourceFiles) {
        const originalFileName = path.basename(sourceFile)
        const { ext, safeBaseName } = this.sanitizeFileName(originalFileName)
        const savedFileName = `${safeBaseName}-${Date.now()}-${assets.length}${ext}`
        const savedFilePath = path.join(uploadsDir, savedFileName)
        await copyFile(sourceFile, savedFilePath)

        assets.push({
          fileName: savedFileName,
          originalFileName,
          filePath: savedFilePath,
          relativePath: `uploads/${savedFileName}`,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        })
      }

      return res.json({
        success: true,
        message: '文件夹导入成功',
        data: {
          folderName: path.basename(folderPath),
          folderPath,
          assets,
        },
      })
    } catch (error) {
      console.error('导入本地文件夹失败:', error)
      return res.status(500).json({
        error: '导入本地文件夹失败',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }

  async getWorkspaceAsset(req: Request, res: Response) {
    try {
      const userId = String(req.query.userId || '')
      const requestedPath = String(req.query.path || '')

      if (!userId || !requestedPath) {
        return res.status(400).json({
          error: '参数错误',
          message: '请提供 userId 和 path',
        })
      }

      if (!requestedPath.startsWith('uploads/')) {
        return res.status(400).json({
          error: '参数错误',
          message: '仅支持访问 uploads 目录中的文件',
        })
      }

      const config = await this.configService.getConfig(userId)
      const uploadsDir = path.resolve(config.workspace.rootPath, 'uploads')
      const absolutePath = path.resolve(config.workspace.rootPath, requestedPath)

      if (!absolutePath.startsWith(`${uploadsDir}${path.sep}`) && absolutePath !== uploadsDir) {
        return res.status(403).json({
          error: '访问被拒绝',
          message: '无权访问该文件',
        })
      }

      return res.sendFile(absolutePath)
    } catch (error) {
      console.error('读取工作文件失败:', error)
      return res.status(500).json({
        error: '读取工作文件失败',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }

  async openWorkspaceFolder(req: Request, res: Response) {
    try {
      const { userId, relativePath } = req.body as {
        userId?: string
        relativePath?: string
      }

      if (!userId || !relativePath) {
        return res.status(400).json({
          error: '参数错误',
          message: '请提供 userId 和 relativePath',
        })
      }

      const config = await this.configService.getConfig(userId)
      const uploadsDir = path.resolve(config.workspace.rootPath, 'uploads')
      const absolutePath = path.resolve(config.workspace.rootPath, relativePath)

      if (!absolutePath.startsWith(`${uploadsDir}${path.sep}`) && absolutePath !== uploadsDir) {
        return res.status(403).json({
          error: '访问被拒绝',
          message: '无权打开该目录',
        })
      }

      const folderStat = await stat(absolutePath)
      if (!folderStat.isDirectory()) {
        return res.status(400).json({
          error: '参数错误',
          message: '目标路径不是文件夹',
        })
      }

      const command =
        process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open'

      const child = spawn(command, [absolutePath], {
        detached: true,
        stdio: 'ignore',
      })
      child.unref()

      return res.json({
        success: true,
        message: '文件夹已打开',
      })
    } catch (error) {
      console.error('打开工作区目录失败:', error)
      return res.status(500).json({
        error: '打开工作区目录失败',
        message: error instanceof Error ? error.message : '未知错误',
      })
    }
  }

  // 保存配置
  async saveConfig(req: Request, res: Response) {
    try {
      const { userId, aiModel, publishPlatforms, aiModels, workspace } = req.body

      // 仅在用户实际配置了 AI 模型时才校验，避免保存其他设置被空白模型配置阻塞
      if (aiModel && this.hasConfiguredAIModel(aiModel)) {
        if (aiModel.provider === 'ollama') {
          const ollamaTest = await this.testOllamaConnection(aiModel)
          if (!ollamaTest.success) {
            return res.status(400).json({ 
              error: 'AI 模型测试失败',
              message: ollamaTest.message 
            })
          }
        } else if (aiModel.provider === 'llamacpp') {
          const llamaTest = await this.testLlamaCppConnection(aiModel)
          if (!llamaTest.success) {
            return res.status(400).json({ 
              error: 'AI 模型测试失败',
              message: llamaTest.message,
            })
          }
        } else if (aiModel.provider === 'openai' || aiModel.provider === 'anthropic' || aiModel.provider === 'google') {
          const cloudTest = await this.testCloudAIConnection(aiModel)
          if (!cloudTest.success) {
            return res.status(400).json({ 
              error: 'AI 模型测试失败',
              message: cloudTest.message,
            })
          }
        } else {
          return res.status(400).json({ 
            error: '参数错误',
            message: '不支持的模型提供商' 
          })
        }
      }

      // 保存配置
      const savedConfig = await this.configService.saveConfig(userId, {
        aiModel,
        publishPlatforms,
        aiModels,
        workspace,
      })

      res.json(savedConfig)
    } catch (error) {
      console.error('保存配置失败:', error)
      res.status(500).json({ 
        error: '保存配置失败',
        message: error instanceof Error ? error.message : '未知错误' 
      })
    }
  }

  // 切换 AI 模型
  async switchAIModel(req: Request, res: Response) {
    try {
      const { userId, modelId } = req.body

      if (!userId || !modelId) {
        return res.status(400).json({ 
          error: '参数错误',
          message: '请提供 userId 和 modelId' 
        })
      }

      const updatedConfig = await this.configService.switchAIModel(userId, modelId)
      res.json(updatedConfig)
    } catch (error) {
      console.error('切换 AI 模型失败:', error)
      res.status(500).json({ 
        error: '切换 AI 模型失败',
        message: error instanceof Error ? error.message : '未知错误' 
      })
    }
  }

  // 删除 AI 模型
  async deleteAIModel(req: Request, res: Response) {
    try {
      const { userId, modelId } = req.body

      if (!userId || !modelId) {
        return res.status(400).json({ 
          error: '参数错误',
          message: '请提供 userId 和 modelId' 
        })
      }

      const updatedConfig = await this.configService.deleteAIModel(userId, modelId)
      res.json(updatedConfig)
    } catch (error) {
      console.error('删除 AI 模型失败:', error)
      res.status(500).json({ 
        error: '删除 AI 模型失败',
        message: error instanceof Error ? error.message : '未知错误' 
      })
    }
  }

  // 测试 AI 模型连通性
  async testAIModel(req: Request, res: Response) {
    try {
      const { aiModel } = req.body

      if (!aiModel) {
        return res.status(400).json({ 
          error: '参数错误',
          message: '请提供 AI 模型配置' 
        })
      }

      let testResult
      if (aiModel.provider === 'ollama') {
        testResult = await this.testOllamaConnection(aiModel)
      } else if (aiModel.provider === 'llamacpp') {
        testResult = await this.testLlamaCppConnection(aiModel)
      } else if (aiModel.provider === 'openai' || aiModel.provider === 'anthropic' || aiModel.provider === 'google') {
        testResult = await this.testCloudAIConnection(aiModel)
      } else {
        return res.status(400).json({ 
          error: '参数错误',
          message: '不支持的模型提供商' 
        })
      }

      res.json(testResult)
    } catch (error) {
      console.error('测试 AI 模型失败:', error)
      res.status(500).json({ 
        success: false,
        error: '测试 AI 模型失败',
        message: error instanceof Error ? error.message : '未知错误' 
      })
    }
  }
}
