# 新闻 API 服务工厂

## 概述

新闻 API 服务工厂是一个基于工厂模式和适配器模式的新闻源管理系统，用于统一管理不同的新闻 API 服务。它支持 NewsAPI、The Guardian 和 New York Times 三种新闻源。

## 核心组件

### 1. 接口定义 (`news-api.interface.ts`)

定义了新闻 API 的核心接口：
- `INewsAPI`: 新闻 API 接口
- `NewsAdapter`: 新闻适配器抽象类
- `NewsSourceConfig`: 新闻源配置接口

### 2. 适配器实现 (`news-adapters.ts`)

实现了三种新闻源的适配器：
- `NewsAPIAdapter`: NewsAPI 适配器
- `GuardianAPIAdapter`: The Guardian 适配器  
- `NYTAPIAdapter`: New York Times 适配器

### 3. 服务工厂 (`news-service-factory.ts`)

提供了新闻服务的创建和管理功能：
- `NewsServiceFactory`: 新闻服务工厂类

### 4. 重构后的 NewsService (`api/services/NewsService.ts`)

集成了工厂模式的现有新闻服务。

## 使用方法

### 1. 导入模块

```typescript
import { NewsServiceFactory } from '../shared/api/news-service-factory'
import { NewsSourceConfig } from '../shared/api/news-api.interface'
import { NewsArticle, UserProfile } from '../shared/types'
```

### 2. 创建单个新闻 API 实例

```typescript
// 配置 NewsAPI
const newsApiConfig: NewsSourceConfig = {
  provider: 'newsapi',
  apiKey: 'your-api-key',
  baseUrl: 'https://newsapi.org/v2',
  timeout: 12000
}

// 创建实例
const newsApi = NewsServiceFactory.createNewsAPI(newsApiConfig)

// 获取新闻
const articles = await newsApi.fetchNews(userProfile)

// 测试连接
const testResult = await newsApi.testConnection()
```

### 3. 批量获取新闻

```typescript
// 配置多个新闻源
const configs: NewsSourceConfig[] = [
  {
    provider: 'newsapi',
    apiKey: 'newsapi-key',
    timeout: 12000
  },
  {
    provider: 'guardian',
    apiKey: 'guardian-key',
    timeout: 12000
  },
  {
    provider: 'nytimes',
    apiKey: 'nyt-key',
    timeout: 12000
  }
]

// 批量获取新闻
const allArticles = await NewsServiceFactory.fetchNewsFromMultipleSources(configs, userProfile)
```

### 4. 测试多个新闻源

```typescript
const testResults = await NewsServiceFactory.testMultipleSources(configs)

testResults.forEach(result => {
  console.log(`${result.provider}: ${result.success ? '✓' : '✗'} ${result.message}`)
})
```

### 5. 使用重构后的 NewsService

```typescript
import { NewsService } from '../api/services/NewsService'

const newsService = new NewsService()

// 获取最近新闻
const articles = await newsService.getRecentNews(userId, userProfile)

// 测试新闻 API
const testResult = await newsService.testNewsAPI(config)

// 获取支持的新闻源列表
const providers = newsService.getSupportedProviders()

// 从多个源获取新闻
const multiSourceArticles = await newsService.fetchFromMultipleSources(configs, userProfile)
```

## 支持的新闻源

| 新闻源 | ID | 描述 |
|--------|----|------|
| NewsAPI | `newsapi` | 聚合全球新闻源，覆盖广泛 |
| The Guardian | `guardian` | 英国卫报新闻，国际视角 |
| New York Times | `nytimes` | 纽约时报，深度报道 |

## 配置参数

### NewsSourceConfig 接口

```typescript
interface NewsSourceConfig {
  provider: 'newsapi' | 'guardian' | 'nytimes'  // 新闻源类型
  apiKey: string                                 // API 密钥
  baseUrl?: string                               // API 基础 URL（可选）
  timeout?: number                               // 请求超时时间（毫秒，默认 12000）
}
```

## 错误处理

所有适配器都包含错误处理机制：

1. **网络超时**: 默认 12 秒超时
2. **API 错误**: 捕获并抛出详细的错误信息
3. **数据验证**: 验证 API 响应格式
4. **优雅降级**: 批量获取时，失败的源不会影响其他源

## 扩展新的新闻源

要添加新的新闻源，需要：

1. 在 `NewsSourceConfig.provider` 中添加新的类型
2. 创建新的适配器类继承 `NewsAdapter`
3. 在 `NewsServiceFactory.createNewsAPI()` 中添加新的 case
4. 在 `NewsServiceFactory.getSupportedProviders()` 中添加新的新闻源信息

## 性能优化

1. **并行获取**: 批量获取时使用 `Promise.all` 并行请求
2. **超时控制**: 可配置的超时时间防止长时间阻塞
3. **结果排序**: 按发布时间自动排序
4. **错误隔离**: 单个源失败不影响其他源

## 注意事项

1. 需要有效的 API 密钥
2. 注意 API 的调用频率限制
3. 生产环境建议配置合适的超时时间
4. 建议使用环境变量存储 API 密钥