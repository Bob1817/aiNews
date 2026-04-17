"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const news_1 = require("./routes/news");
const ai_1 = require("./routes/ai");
const user_1 = require("./routes/user");
const config_1 = require("./routes/config");
const category_1 = require("./routes/category");
const ScheduledService_1 = require("./services/ScheduledService");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// 中间件
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// 路由
app.use('/api/news', news_1.newsRoutes);
app.use('/api/ai', ai_1.aiRoutes);
app.use('/api/user', user_1.userRoutes);
app.use('/api/config', config_1.configRoutes);
app.use('/api/categories', category_1.categoryRoutes);
// 健康检查
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});
// 初始化定时任务服务
new ScheduledService_1.ScheduledService();
// 启动服务器
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;
