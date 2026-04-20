import { create } from 'zustand'
import type {
  ConversationHistory,
  ConversationMessage,
  NewsArticle,
  SavedNews,
  WorkflowDefinition,
  WorkflowExecution,
} from '@/types'

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

  setNewsArticles: (articles) => set({ newsArticles: articles }),
  setSavedNews: (news) => set({ savedNews: news }),
  setConversationMessages: (messages) => set({ conversationMessages: messages }),
  addConversationMessage: (message) =>
    set((state) => ({
      conversationMessages: [...state.conversationMessages, message],
    })),
  setConversationHistories: (histories) => {
    persistConversationHistories(histories)
    set({ conversationHistories: histories })
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
  setWorkflows: (workflows) => set({ workflows }),
  setWorkflowExecutions: (workflowExecutions) => set({ workflowExecutions }),
  addWorkflowExecution: (execution) =>
    set((state) => ({
      workflowExecutions: [execution, ...state.workflowExecutions],
    })),
  setSelectedNews: (news) => set({ selectedNews: news }),
  setSelectedWorkflow: (workflow) => set({ selectedWorkflow: workflow }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  clearConversationMessages: () => set({ conversationMessages: [], currentConversationId: null }),
  loadConversationMessages: (messages) => set({ conversationMessages: messages }),
  startNewConversation: () =>
    set({
      conversationMessages: [],
      currentConversationId: null,
      selectedWorkflow: null,
    }),
}))
