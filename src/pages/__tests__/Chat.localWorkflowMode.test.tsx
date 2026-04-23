import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Chat } from '../Chat'
import { useAppStore } from '@/store'

const mockChat = jest.fn()
const mockExecuteWorkflow = jest.fn()
const mockParseWorkflowCommand = jest.fn()
const mockGetConfig = jest.fn()
const mockGetWorkflows = jest.fn()
const mockGetWorkflowExecutions = jest.fn()
const mockImportWorkspaceFolder = jest.fn()
const mockUpdateConfig = jest.fn()
const mockSwitchAIModel = jest.fn()
const mockUploadWorkspaceAsset = jest.fn()
const mockOpenWorkspaceFolder = jest.fn()
const mockCreateSavedNews = jest.fn()

const localWorkflow = {
  id: 'workflow-tax-report',
  name: 'tax-report',
  displayName: '/个税报表',
  description: '本地个税报表',
  invocation: {
    primary: '/个税报表',
    aliases: ['/税报'],
    examples: ['/个税报表'],
  },
  systemInstruction: '',
  steps: [],
  inputSchema: [],
  outputSchema: [],
  constraints: [],
  tools: [],
  capabilities: [],
  examples: [],
  extensionNotes: '',
  isBuiltIn: true,
  status: 'active',
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  executionMode: 'local',
}

const aiWorkflow = {
  id: 'workflow-news-push',
  name: 'news-push',
  displayName: '/新闻推送',
  description: 'AI 新闻推送',
  invocation: {
    primary: '/新闻推送',
    aliases: ['/news'],
    examples: ['/新闻推送'],
  },
  systemInstruction: '',
  steps: [],
  inputSchema: [],
  outputSchema: [],
  constraints: [],
  tools: [],
  capabilities: [],
  examples: [],
  extensionNotes: '',
  isBuiltIn: true,
  status: 'active',
  createdAt: '2026-04-23T00:00:00.000Z',
  updatedAt: '2026-04-23T00:00:00.000Z',
  executionMode: 'ai',
}

jest.mock('@/components/ConversationItem', () => ({
  ConversationItem: ({ message }: { message: { id: string; content: string; messageType?: string } }) => (
    <div data-testid={`message-${message.id}`} data-message-type={message.messageType || 'plain'}>
      {message.content}
    </div>
  ),
}))

jest.mock('@/lib/toast', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}))

jest.mock('@/lib/api/chat', () => ({
  chat: (...args: unknown[]) => mockChat(...args),
}))

jest.mock('@/lib/api/news', () => ({
  createSavedNews: (...args: unknown[]) => mockCreateSavedNews(...args),
}))

jest.mock('@/lib/api/config', () => ({
  getConfig: (...args: unknown[]) => mockGetConfig(...args),
  importWorkspaceFolder: (...args: unknown[]) => mockImportWorkspaceFolder(...args),
  openWorkspaceFolder: (...args: unknown[]) => mockOpenWorkspaceFolder(...args),
  switchAIModel: (...args: unknown[]) => mockSwitchAIModel(...args),
  updateConfig: (...args: unknown[]) => mockUpdateConfig(...args),
  uploadWorkspaceAsset: (...args: unknown[]) => mockUploadWorkspaceAsset(...args),
}))

jest.mock('@/lib/api/workflows', () => ({
  executeWorkflow: (...args: unknown[]) => mockExecuteWorkflow(...args),
  parseWorkflowCommand: (...args: unknown[]) => mockParseWorkflowCommand(...args),
  getWorkflowExecutions: (...args: unknown[]) => mockGetWorkflowExecutions(...args),
  getWorkflows: (...args: unknown[]) => mockGetWorkflows(...args),
}))

describe('Chat local workflow mode', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
      writable: true,
    })

    useAppStore.setState({
      conversationMessages: [],
      conversationHistories: [],
      currentConversationId: null,
      workflows: [],
      workflowExecutions: [],
      selectedWorkflow: null,
      isLoading: false,
      savedNews: [],
    })

    mockChat.mockReset()
    mockExecuteWorkflow.mockReset()
    mockParseWorkflowCommand.mockReset()
    mockGetConfig.mockReset()
    mockGetWorkflows.mockReset()
    mockGetWorkflowExecutions.mockReset()
    mockImportWorkspaceFolder.mockReset()
    mockUpdateConfig.mockReset()
    mockSwitchAIModel.mockReset()
    mockUploadWorkspaceAsset.mockReset()
    mockOpenWorkspaceFolder.mockReset()
    mockCreateSavedNews.mockReset()

    mockGetConfig.mockResolvedValue({
      id: 'config-1',
      userId: '1',
      aiModel: {
        id: '',
        name: '',
        provider: '',
        apiKey: '',
        modelName: '',
        baseUrl: '',
      },
      aiModels: [],
      publishPlatforms: {},
      workspace: {
        rootPath: '/workspace',
        allowAiAccess: false,
        localWorkflowOnly: true,
      },
      createdAt: '2026-04-23T00:00:00.000Z',
      updatedAt: '2026-04-23T00:00:00.000Z',
    })
    mockGetWorkflows.mockResolvedValue({
      data: [localWorkflow, aiWorkflow],
    })
    mockGetWorkflowExecutions.mockResolvedValue({
      data: [],
    })
    mockParseWorkflowCommand.mockResolvedValue({
      matched: true,
      rawCommand: '/个税报表',
      invocation: '/个税报表',
      remainingInput: '生成本月报表',
      workflow: localWorkflow,
    })
    mockExecuteWorkflow.mockResolvedValue({
      content: '本地工作流执行成功',
      workflow: localWorkflow,
      execution: {
        id: 'execution-1',
        workflowId: localWorkflow.id,
        workflowName: localWorkflow.displayName,
        invocation: localWorkflow.invocation.primary,
        userId: '1',
        input: '生成本月报表',
        output: '本地工作流执行成功',
        status: 'completed',
        artifacts: [],
        createdAt: '2026-04-23T00:00:00.000Z',
      },
      artifacts: [],
    })
    mockImportWorkspaceFolder.mockResolvedValue({
      data: {
        folderName: '个税资料',
        folderPath: '/workspace/tax',
        assets: [
          {
            fileName: 'tax.xlsx',
            relativePath: 'uploads/tax.xlsx',
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            originalFileName: 'tax.xlsx',
          },
        ],
      },
    })

    ;(window as any).electronAPI = {
      selectDirectory: jest.fn().mockResolvedValue('/workspace/tax'),
    }
  })

  test('local workflow only mode hides ai workflows and keeps local workflow execution', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/chat/new']}>
        <Routes>
          <Route path="/chat/:conversationId" element={<Chat />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: '/个税报表' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '/新闻推送' })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox'), '帮我总结一下今天的新闻{Enter}')

    await waitFor(() => {
      expect(screen.getByText('当前未配置 AI 模型，无法使用 AI 进行沟通，请前往【设置】中的【系统配置】配置 AI 模型。')).toBeInTheDocument()
    })
    expect(mockChat).not.toHaveBeenCalled()
  })

  test('local workflow command still executes when ai is unavailable', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/chat/new']}>
        <Routes>
          <Route path="/chat/:conversationId" element={<Chat />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '/个税报表' }))
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toHaveValue('/个税报表')
    })

    await user.click(screen.getByRole('button', { name: '发送消息' }))

    await waitFor(() => {
      expect(mockExecuteWorkflow).toHaveBeenCalled()
    })
    expect(mockChat).not.toHaveBeenCalled()
  })
})
