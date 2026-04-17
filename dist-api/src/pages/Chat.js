"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Chat = Chat;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const NewsCard_1 = require("@/components/NewsCard");
const ConversationItem_1 = require("@/components/ConversationItem");
const toast_1 = require("@/lib/toast");
const store_1 = require("@/store");
const chat_1 = require("@/lib/api/chat");
const errors_1 = require("@/lib/errors");
const news_1 = require("@/lib/api/news");
const fallbacks_1 = require("@/lib/fallbacks");
function Chat() {
    const [inputMessage, setInputMessage] = (0, react_1.useState)('');
    const messagesEndRef = (0, react_1.useRef)(null);
    const { showToast } = (0, toast_1.useToast)();
    const { newsArticles, conversationMessages, selectedNews, isLoading, setNewsArticles, addConversationMessage, setSelectedNews, setIsLoading, } = (0, store_1.useAppStore)();
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    (0, react_1.useEffect)(() => {
        scrollToBottom();
    }, [conversationMessages]);
    (0, react_1.useEffect)(() => {
        // 从后端 API 获取新闻
        const fetchNews = async () => {
            try {
                setIsLoading(true);
                const news = await (0, news_1.getRecentNews)('1');
                // 检查返回的数据是否是数组
                if (Array.isArray(news)) {
                    // 检查是否有新新闻
                    const previousNewsIds = newsArticles.map(article => article.id);
                    const newNews = news.filter(article => !previousNewsIds.includes(article.id));
                    // 发送通知
                    if (newNews.length > 0) {
                        const latestNews = newNews[0];
                        if (window.electronAPI) {
                            window.electronAPI.sendNotification('新闻更新', `最新新闻：${latestNews.title}`);
                        }
                    }
                    setNewsArticles(news);
                }
                else {
                    throw new Error('返回的数据格式不正确');
                }
            }
            catch (error) {
                console.error('获取新闻失败:', error);
                setNewsArticles((0, fallbacks_1.getMockNewsArticles)());
                showToast({
                    title: '新闻加载失败',
                    message: '已切换为本地示例新闻，你仍然可以继续体验。',
                    variant: 'info',
                });
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchNews();
        // 每5分钟检查一次新闻更新
        const intervalId = setInterval(fetchNews, 5 * 60 * 1000);
        return () => clearInterval(intervalId);
    }, [newsArticles, setIsLoading, setNewsArticles, showToast]);
    const handleQuoteNews = (article) => {
        setSelectedNews(article);
    };
    const handleSendMessage = async () => {
        if (!inputMessage.trim())
            return;
        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputMessage,
            referencedNewsId: selectedNews?.id,
            timestamp: new Date().toISOString(),
        };
        addConversationMessage(userMessage);
        setInputMessage('');
        setIsLoading(true);
        try {
            const data = await (0, chat_1.chat)({
                userId: '1',
                message: inputMessage,
                referencedNewsId: selectedNews?.id,
                history: conversationMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content,
                })),
            });
            const aiMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content,
                timestamp: new Date().toISOString(),
            };
            addConversationMessage(aiMessage);
        }
        catch (error) {
            console.error('AI 对话失败:', error);
            addConversationMessage((0, fallbacks_1.getMockChatResponse)(selectedNews));
            showToast({
                title: 'AI 服务暂时不可用',
                message: `${(0, errors_1.getErrorMessage)(error, '请求失败')}，已为你切换到本地演示回复。`,
                variant: 'info',
            });
        }
        finally {
            setIsLoading(false);
            setSelectedNews(null);
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full", children: [(0, jsx_runtime_1.jsxs)("div", { className: "border-b border-gray-200 bg-white", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-4 border-b border-gray-100", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between mb-2", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900", children: "\u4ECA\u65E5\u65B0\u95FB\u63A8\u9001" }), (0, jsx_runtime_1.jsxs)("button", { className: "flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "w-4 h-4" }), "\u5237\u65B0"] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "p-4 overflow-x-auto", children: (0, jsx_runtime_1.jsx)("div", { className: "flex gap-4 min-w-max", children: newsArticles.map((article) => ((0, jsx_runtime_1.jsx)("div", { className: "w-80 flex-shrink-0", children: (0, jsx_runtime_1.jsx)(NewsCard_1.NewsCard, { article: article, onQuote: handleQuoteNews, isSelected: selectedNews?.id === article.id }) }, article.id))) }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-6 bg-gray-50", children: conversationMessages.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "w-10 h-10 text-white" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-semibold text-gray-900 mb-2", children: "\u5F00\u59CB\u521B\u4F5C\u65B0\u95FB" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 max-w-md", children: "\u9009\u62E9\u4E0A\u65B9\u7684\u65B0\u95FB\u8FDB\u884C\u5F15\u7528\uFF0C\u6216\u76F4\u63A5\u8F93\u5165\u60A8\u7684\u9700\u6C42\uFF0C\u8BA9 AI \u5E2E\u60A8\u521B\u4F5C\u51FA\u4E13\u4E1A\u7684\u65B0\u95FB\u7A3F\u4EF6\u3002" })] })) : ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 max-w-4xl mx-auto", children: [conversationMessages.map((message) => ((0, jsx_runtime_1.jsx)(ConversationItem_1.ConversationItem, { message: message, referencedNews: message.referencedNewsId
                                ? newsArticles.find((n) => n.id === message.referencedNewsId)
                                : null }, message.id))), isLoading && ((0, jsx_runtime_1.jsxs)("div", { className: "flex gap-4", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.RefreshCw, { className: "w-5 h-5 text-white animate-spin" }) }), (0, jsx_runtime_1.jsx)("div", { className: "bg-white px-4 py-3 rounded-2xl rounded-tl-md border border-gray-200", children: (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500", children: "AI \u6B63\u5728\u601D\u8003\u4E2D..." }) })] })), (0, jsx_runtime_1.jsx)("div", { ref: messagesEndRef })] })) }), (0, jsx_runtime_1.jsx)("div", { className: "border-t border-gray-200 bg-white p-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto", children: [selectedNews && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-medium text-blue-600", children: "\u5DF2\u5F15\u7528:" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-blue-800", children: selectedNews.title })] }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setSelectedNews(null), className: "text-blue-600 hover:text-blue-800 text-sm", children: "\u53D6\u6D88" })] })), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: inputMessage, onChange: (e) => setInputMessage(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleSendMessage(), placeholder: selectedNews ? '基于此新闻进行创作...' : '输入您的需求...', className: "flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSendMessage, disabled: !inputMessage.trim() || isLoading, className: "px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Send, { className: "w-4 h-4" }), "\u53D1\u9001"] })] })] }) })] }));
}
