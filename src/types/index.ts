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
  outputType?: 'news' | 'file'
  fileName?: string
  fileFormat?: 'md' | 'txt' | 'json' | 'html'
  filePath?: string
  downloadUrl?: string
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

export interface ActiveAIModelInfo {
  configured: boolean
  provider: AIModelConfig['provider'] | null
  configuredName: string
  configuredModelName: string
  effectiveModelName: string
  baseUrl: string
  source: 'primary' | 'fallback' | null
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
  workspace: {
    rootPath: string
    allowAiAccess: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  referencedNewsId?: string
  workflowId?: string
  workflowInvocation?: string
  messageType?: 'plain' | 'workflow' | 'system' | 'result'
  executionId?: string
  artifacts?: WorkflowArtifact[]
  timestamp: string
}

export interface WorkflowInvocation {
  primary: string
  aliases: string[]
  examples: string[]
}

export interface WorkflowStep {
  id: string
  title: string
  instruction: string
  expectedOutput?: string
}

export interface WorkflowFieldDefinition {
  name: string
  type: 'text' | 'textarea' | 'tags' | 'json'
  label: string
  placeholder?: string
  required?: boolean
}

export interface WorkflowArtifact {
  id: string
  type: 'text' | 'markdown' | 'news-draft' | 'summary'
  title: string
  content: string
}

export interface WorkflowDefinition {
  id: string
  name: string
  displayName: string
  description: string
  invocation: WorkflowInvocation
  systemInstruction: string
  steps: WorkflowStep[]
  inputSchema: WorkflowFieldDefinition[]
  outputSchema: WorkflowFieldDefinition[]
  constraints: string[]
  tools: string[]
  capabilities: string[]
  examples: string[]
  extensionNotes: string
  isBuiltIn: boolean
  status: 'active' | 'draft'
  createdAt: string
  updatedAt: string
}

export interface WorkflowCommandParseResult {
  matched: boolean
  rawCommand?: string
  invocation?: string
  remainingInput?: string
  workflow?: WorkflowDefinition
  error?: string
}

export interface WorkflowExecution {
  id: string
  workflowId: string
  workflowName: string
  invocation: string
  userId: string
  input: string
  output: string
  status: 'running' | 'completed' | 'failed'
  artifacts: WorkflowArtifact[]
  createdAt: string
  completedAt?: string
  error?: string
}

export interface ConversationHistory {
  id: string
  title: string
  messages: ConversationMessage[]
  createdAt: string
  updatedAt: string
}
