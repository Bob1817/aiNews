export interface NewsArticle {
  id: string
  title: string
  content: string
  source: string
  url: string
  publishedAt: string
  relatedIndustries: string[]
  relatedKeywords: string[]
}

export interface SavedNews {
  id: string
  userId: string
  title: string
  content: string
  originalNewsId?: string
  url?: string
  isPublished: boolean
  publishedTo: string[]
  categories?: string[]
  industries?: string[]
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  name: string
  email: string
  password?: string
  createdAt: string
  updatedAt: string
}

export interface NewsCategory {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  userId: string
  industries: string[]
  keywords: string[]
  isOnboardingComplete: boolean
  createdAt: string
  updatedAt: string
}

export interface AIModelConfig {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
  apiKey: string
  modelName: string
  baseUrl?: string
  isActive: boolean
}

export interface UserConfig {
  id: string
  userId: string
  aiModel: {
    id: string
    name: string
    provider: 'openai' | 'anthropic' | 'google' | 'ollama' | 'llamacpp'
    apiKey: string
    modelName: string
    baseUrl?: string
  }
  aiModels: AIModelConfig[]
  newsAPI?: {
    provider: 'newsapi' | 'guardian' | 'nytimes'
    apiKey: string
    baseUrl?: string
  }
  publishPlatforms: {
    website?: {
      apiUrl: string
      apiKey: string
    }
    wechat?: {
      appId: string
      appSecret: string
      token: string
    }
  }
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedNewsId?: string
  timestamp: string
}
