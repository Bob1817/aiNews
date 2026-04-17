import cron from 'node-cron'
import { NewsService } from './NewsService'

export class ScheduledService {
  private newsService: NewsService

  constructor() {
    this.newsService = new NewsService()
    this.setupCronJobs()
  }

  // 设置定时任务
  private setupCronJobs() {
    // 每天早上 8 点更新新闻
    cron.schedule('0 8 * * *', async () => {
      console.log('Running morning news update at 8:00 AM')
      await this.newsService.updateNewsFeeds()
    })

    // 每天下午 3 点更新新闻
    cron.schedule('0 15 * * *', async () => {
      console.log('Running afternoon news update at 3:00 PM')
      await this.newsService.updateNewsFeeds()
    })

    console.log('Cron jobs scheduled')
  }

  // 手动触发所有任务
  async runAllJobs() {
    console.log('Running all scheduled jobs')
    await this.newsService.updateNewsFeeds()
  }
}
