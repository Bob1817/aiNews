import { create } from 'zustand'
import type { NewsArticle, SavedNews, ConversationMessage } from '@/types'

interface AppState {
  newsArticles: NewsArticle[]
  savedNews: SavedNews[]
  conversationMessages: ConversationMessage[]
  selectedNews: NewsArticle | null
  isLoading: boolean

  setNewsArticles: (articles: NewsArticle[]) => void
  setSavedNews: (news: SavedNews[]) => void
  setConversationMessages: (messages: ConversationMessage[]) => void
  addConversationMessage: (message: ConversationMessage) => void
  setSelectedNews: (news: NewsArticle | null) => void
  setIsLoading: (loading: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  newsArticles: [],
  savedNews: [],
  conversationMessages: [],
  selectedNews: null,
  isLoading: false,

  setNewsArticles: (articles) => set({ newsArticles: articles }),
  setSavedNews: (news) => set({ savedNews: news }),
  setConversationMessages: (messages) => set({ conversationMessages: messages }),
  addConversationMessage: (message) =>
    set((state) => ({
      conversationMessages: [...state.conversationMessages, message],
    })),
  setSelectedNews: (news) => set({ selectedNews: news }),
  setIsLoading: (loading) => set({ isLoading: loading }),
}))
