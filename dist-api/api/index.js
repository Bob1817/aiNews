"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const config_1 = require("../shared/config");
const news_1 = require("./routes/news");
const ai_1 = require("./routes/ai");
const user_1 = require("./routes/user");
const config_2 = require("./routes/config");
const category_1 = require("./routes/category");
const ScheduledService_1 = require("./services/ScheduledService");
const app = (0, express_1.default)();
const PORT = config_1.env.PORT;
// 基础中间件
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// 路由
app.use('/api/news', news_1.newsRoutes);
app.use('/api/ai', ai_1.aiRoutes);
app.use('/api/user', user_1.userRoutes);
app.use('/api/config', config_2.configRoutes);
app.use('/api/categories', category_1.categoryRoutes);
// 健康检查
app.get('/api/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: config_1.env.NODE_ENV
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
app.use((err, req, res, next) => {
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
app.listen(PORT, () => {
    console.log('🚀 AI News API 服务器启动成功');
    console.log('='.repeat(50));
    console.log(`端口: ${PORT}`);
    console.log(`环境: ${config_1.env.NODE_ENV}`);
    console.log(`地址: http://${config_1.env.HOST}:${PORT}`);
    console.log('='.repeat(50));
});
// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('❌ 未捕获的异常:', error);
    // 这里可以添加错误上报逻辑
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ 未处理的 Promise 拒绝:', { reason, promise });
    // 这里可以添加错误上报逻辑
});
exports.default = app;
//# sourceMappingURL=index.js.map