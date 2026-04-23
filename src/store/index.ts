import { create } from 'zustand'
import type {
  ConversationHistory,
  ConversationMessage,
  NewsArticle,
  SavedNews,
  WorkflowDefinition,
  WorkflowExecution,
} from '@/types'

type WorkflowExecutionMode = 'ai' | 'local'

type WorkflowDefinitionWithExecutionMode = WorkflowDefinition & {
  executionMode?: WorkflowExecutionMode
}

interface AppState {
  newsArticles: NewsArticle[]
  savedNews: SavedNews[]
  conversationMessages: ConversationMessage[]
  conversationHistories: ConversationHistory[]
  currentConversationId: string | null
  workflows: WorkflowDefinition[]
  workflowExecutions: WorkflowExecution[]
  selectedNews: NewsArticle | null
  selectedWorkflow: WorkflowDefinition | null
  isLoading: boolean

  setNewsArticles: (articles: NewsArticle[]) => void
  setSavedNews: (news: SavedNews[]) => void
  setConversationMessages: (messages: ConversationMessage[]) => void
  addConversationMessage: (message: ConversationMessage) => void
  setConversationHistories: (histories: ConversationHistory[]) => void
  upsertConversationHistory: (history: ConversationHistory) => void
  removeConversationHistory: (historyId: string) => void
  setCurrentConversationId: (conversationId: string | null) => void
  setWorkflows: (workflows: WorkflowDefinition[]) => void
  setWorkflowExecutions: (executions: WorkflowExecution[]) => void
  addWorkflowExecution: (execution: WorkflowExecution) => void
  setSelectedNews: (news: NewsArticle | null) => void
  setSelectedWorkflow: (workflow: WorkflowDefinition | null) => void
  setIsLoading: (loading: boolean) => void
  clearConversationMessages: () => void
  loadConversationMessages: (messages: ConversationMessage[]) => void
  startNewConversation: () => void
}

const conversationHistoryStorageKey = 'conversationHistories'

const normalizeConversationHistory = (value: unknown): ConversationHistory | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ConversationHistory>

  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.title !== 'string' ||
    !Array.isArray(candidate.messages) ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.updatedAt !== 'string'
  ) {
    return null
  }

  return {
    id: candidate.id,
    title: candidate.title,
    messages: candidate.messages.filter(
      (message): message is ConversationMessage =>
        !!message &&
        typeof message === 'object' &&
        typeof message.id === 'string' &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string' &&
        typeof message.timestamp === 'string'
    ),
    createdAt: candidate.createdAt,
    updatedAt: candidate.updatedAt,
  }
}

const readConversationHistories = (): ConversationHistory[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const saved = window.localStorage.getItem(conversationHistoryStorageKey)
    if (!saved) {
      return []
    }

    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(normalizeConversationHistory)
      .filter((history): history is ConversationHistory => history !== null)
  } catch (error) {
    console.error('读取任务历史失败:', error)
    return []
  }
}

const persistConversationHistories = (histories: ConversationHistory[]) => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const normalizedHistories = histories
      .map(normalizeConversationHistory)
      .filter((history): history is ConversationHistory => history !== null)
    window.localStorage.setItem(
      conversationHistoryStorageKey,
      JSON.stringify(normalizedHistories)
    )
  } catch (error) {
    console.error('保存任务历史失败:', error)
  }
}

const normalizeSavedNews = (value: unknown): SavedNews[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (item): item is SavedNews =>
      !!item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.userId === 'string' &&
      typeof item.title === 'string' &&
      typeof item.content === 'string'
  )
}

const normalizeWorkflowDefinitions = (value: unknown): WorkflowDefinition[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      return item as WorkflowDefinition
    }

    const workflow = item as WorkflowDefinitionWithExecutionMode

    return {
      ...workflow,
      executionMode: workflow.executionMode || (workflow.id === 'workflow-tax-report' ? 'local' : 'ai'),
    }
  })
}

const normalizeWorkflowExecutions = (value: unknown): WorkflowExecution[] => {
  return Array.isArray(value) ? value : []
}

const normalizeConversationMessages = (value: unknown): ConversationMessage[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(
    (message): message is ConversationMessage =>
      !!message &&
      typeof message === 'object' &&
      typeof message.id === 'string' &&
      (message.role === 'user' || message.role === 'assistant') &&
      typeof message.content === 'string' &&
      typeof message.timestamp === 'string'
  )
}

export const useAppStore = create<AppState>((set) => ({
  newsArticles: [],
  savedNews: [],
  conversationMessages: [],
  conversationHistories: readConversationHistories(),
  currentConversationId: null,
  workflows: [],
  workflowExecutions: [],
  selectedNews: null,
  selectedWorkflow: null,
  isLoading: false,

  setNewsArticles: (articles) => set({ newsArticles: Array.isArray(articles) ? articles : [] }),
  setSavedNews: (news) => set({ savedNews: normalizeSavedNews(news) }),
  setConversationMessages: (messages) => set({ conversationMessages: normalizeConversationMessages(messages) }),
  addConversationMessage: (message) =>
    set((state) => ({
      conversationMessages: [...state.conversationMessages, message],
    })),
  setConversationHistories: (histories) => {
    const normalizedHistories = Array.isArray(histories) ? histories : []
    persistConversationHistories(normalizedHistories)
    set({ conversationHistories: normalizedHistories })
  },
  upsertConversationHistory: (history) =>
    set((state) => {
      const existingIndex = state.conversationHistories.findIndex((item) => item.id === history.id)
      const nextHistories =
        existingIndex >= 0
          ? state.conversationHistories.map((item, index) =>
              index === existingIndex ? history : item
            )
          : [history, ...state.conversationHistories]

      nextHistories.sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      persistConversationHistories(nextHistories)

      return {
        conversationHistories: nextHistories,
        currentConversationId: history.id,
      }
    }),
  removeConversationHistory: (historyId) =>
    set((state) => {
      const nextHistories = state.conversationHistories.filter((item) => item.id !== historyId)
      persistConversationHistories(nextHistories)

      return {
        conversationHistories: nextHistories,
        currentConversationId:
          state.currentConversationId === historyId ? null : state.currentConversationId,
      }
    }),
  setCurrentConversationId: (conversationId) => set({ currentConversationId: conversationId }),
  setWorkflows: (workflows) => set({ workflows: normalizeWorkflowDefinitions(workflows) }),
  setWorkflowExecutions: (workflowExecutions) => set({ workflowExecutions: normalizeWorkflowExecutions(workflowExecutions) }),
  addWorkflowExecution: (execution) =>
    set((state) => ({
      workflowExecutions: [execution, ...state.workflowExecutions],
    })),
  setSelectedNews: (news) => set({ selectedNews: news }),
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearConversationMessages: () => set({ conversationMessages: [], currentConversationId: null }),
  loadConversationMessages: (messages) => set({ conversationMessages: normalizeConversationMessages(messages) }),
  startNewConversation: () =>
    set({
      conversationMessages: [],
      currentConversationId: null,
      selectedWorkflow: null,
    }),
}))
