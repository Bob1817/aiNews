
import { AIService } from './api/services/AIService'
import { AICrawlerService } from './api/services/AICrawlerService'
import { NewsService } from './api/services/NewsService'

console.log('开始测试 AI 功能修复...\n')

// 测试 1: 测试 AICrawlerService
console.log('1. 测试 AICrawlerService:')
const crawlerService = new AICrawlerService()

crawlerService.crawlNews(undefined, '1')
  .then(result =&gt; {
    console.log('   爬虫结果:', result.success ? '成功' : '失败')
    console.log('   新闻数量:', result.articles.length)
    if (result.articles.length &gt; 0) {
      console.log('   第一条新闻标题:', result.articles[0].title)
    }
    console.log()
  })
  .catch(error =&gt; {
    console.log('   爬虫错误:', error)
    console.log()
  })

// 测试 2: 测试 NewsService
console.log('2. 测试 NewsService:')
const newsService = new NewsService()

newsService.getRecentNews('1')
  .then(news =&gt; {
    console.log('   获取新闻数量:', news.length)
    if (news.length &gt; 0) {
      console.log('   第一条新闻:', news[0].title)
    }
    console.log()
  })
  .catch(error =&gt; {
    console.log('   获取新闻错误:', error)
    console.log()
  })

// 测试 3: 测试 AIService
console.log('3. 测试 AIService:')
const aiService = new AIService()

aiService.chat('1', '你好，请介绍一下自己')
  .then(response =&gt; {
    console.log('   AI 响应成功:')
    console.log('   响应内容:', response.content.substring(0, 100) + '...')
    console.log()
  })
  .catch(error =&gt; {
    console.log('   AI 对话错误:', error)
    console.log()
  })

console.log('\n测试完成！')
