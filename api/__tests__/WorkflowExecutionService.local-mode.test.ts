/**
 * @jest-environment node
 */

import { ConfigService } from '../services/ConfigService'
import { WorkflowExecutionService } from '../services/WorkflowExecutionService'

describe('WorkflowExecutionService local mode protection', () => {
  const configSpy = jest.spyOn(ConfigService.prototype, 'getConfig')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    configSpy.mockRestore()
  })

  test('rejects AI workflows when localWorkflowOnly is enabled', async () => {
    configSpy.mockResolvedValue({
      id: 'config-1',
      userId: 'user-1',
      aiModel: {
        id: '',
        name: '',
        provider: 'ollama',
        apiKey: '',
        modelName: '',
        baseUrl: '',
      },
      aiModels: [],
      publishPlatforms: {},
      workspace: {
        rootPath: '/tmp/workspace',
        allowAiAccess: true,
        localWorkflowOnly: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const service = new WorkflowExecutionService()
    const parsed = await service.parseCommand('/新闻助手 帮我写一个摘要')

    await expect(
      service.executeParsedCommand({
        userId: 'user-1',
        parsed,
        message: '/新闻助手 帮我写一个摘要',
      })
    ).rejects.toThrow('当前未配置可用 AI 模型，该工作流暂不可用')
  })

  test('continues executing local workflows in local mode', async () => {
    configSpy.mockResolvedValue({
      id: 'config-1',
      userId: 'user-1',
      aiModel: {
        id: '',
        name: '',
        provider: 'ollama',
        apiKey: '',
        modelName: '',
        baseUrl: '',
      },
      aiModels: [],
      publishPlatforms: {},
      workspace: {
        rootPath: '/tmp/workspace',
        allowAiAccess: true,
        localWorkflowOnly: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    const service = new WorkflowExecutionService()
    const parsed = await service.parseCommand('/个税报表 生成本月报表')

    await expect(
      service.executeParsedCommand({
        userId: 'user-1',
        parsed,
        message: '/个税报表 生成本月报表',
      })
    ).rejects.toThrow('请先上传包含发放记录表和结算发放表的文件夹')
  })
})
