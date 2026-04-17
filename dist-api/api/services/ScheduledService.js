"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const NewsService_1 = require("./NewsService");
class ScheduledService {
    constructor() {
        this.newsService = new NewsService_1.NewsService();
        this.setupCronJobs();
    }
    // 设置定时任务
    setupCronJobs() {
        // 每天早上 8 点更新新闻
        node_cron_1.default.schedule('0 8 * * *', async () => {
            console.log('Running morning news update at 8:00 AM');
            await this.newsService.updateNewsFeeds();
        });
        // 每天下午 3 点更新新闻
        node_cron_1.default.schedule('0 15 * * *', async () => {
            console.log('Running afternoon news update at 3:00 PM');
            await this.newsService.updateNewsFeeds();
        });
        console.log('Cron jobs scheduled');
    }
    // 手动触发所有任务
    async runAllJobs() {
        console.log('Running all scheduled jobs');
        await this.newsService.updateNewsFeeds();
    }
}
exports.ScheduledService = ScheduledService;
//# sourceMappingURL=ScheduledService.js.map