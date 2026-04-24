"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const index_1 = require("../shared/config/index");
const news_1 = require("./routes/news");
const ai_1 = require("./routes/ai");
const user_1 = require("./routes/user");
const config_1 = require("./routes/config");
const category_1 = require("./routes/category");
const workflow_1 = require("./routes/workflow");
const ScheduledService_1 = require("./services/ScheduledService");
const app = (0, express_1.default)();
const PORT = index_1.env.PORT;
const HOST = index_1.env.HOST || '0.0.0.0';
// 信任代理（生产环境可能需要）
app.set('trust proxy', 1);
// 基础中间件
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 路由
app.use('/api/news', news_1.newsRoutes);
app.use('/api/ai', ai_1.aiRoutes);
app.use('/api/user', user_1.userRoutes);
app.use('/api/config', config_1.configRoutes);
app.use('/api/categories', category_1.categoryRoutes);
app.use('/api/workflows', workflow_1.workflowRoutes);
// 健康检查
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: index_1.env.NODE_ENV
    });
});
// 404 处理
app.use('*', (_req, res) => {
    res.status(404).json({
        error: '未找到资源',
        message: '请求的 API 端点不存在',
        path: _req.originalUrl,
        timestamp: new Date().toISOString(),
    });
});
// 错误处理中间件
app.use((err, _req, res, _next) => {
    console.error('错误:', err);
    res.status(500).json({
        error: '服务器内部错误',
        message: err.message || '未知错误',
        timestamp: new Date().toISOString(),
    });
});
// 初始化定时任务服务
new ScheduledService_1.ScheduledService();
// 启动服务器
const server = app.listen(PORT, HOST, () => {
    console.log('🚀 AI Assistant API 服务器启动成功');
    console.log('='.repeat(50));
    console.log(`端口: ${PORT}`);
    console.log(`环境: ${index_1.env.NODE_ENV}`);
    console.log(`地址: http://${HOST}:${PORT}`);
    console.log('='.repeat(50));
});
// 优雅关闭
const gracefulShutdown = (signal) => {
    console.log(`\n📥 接收到 ${signal}，正在优雅关闭...`);
    server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
    });
    // 强制关闭超时
    setTimeout(() => {
        console.error('❌ 强制关闭超时');
        process.exit(1);
    }, 10000);
};
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    // 这里可以添加错误上报逻辑
    gracefulShutdown('uncaughtException');
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', { reason, promise });
    // 这里可以添加错误上报逻辑
});
exports.default = app;
//# sourceMappingURL=index.js.map