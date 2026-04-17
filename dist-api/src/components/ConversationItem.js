"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversationItem = ConversationItem;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
function ConversationItem({ message, referencedNews }) {
    const isUser = message.role === 'user';
    return ((0, jsx_runtime_1.jsxs)("div", { className: `flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`, children: [!isUser && ((0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center flex-shrink-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Bot, { className: "w-5 h-5 text-white" }) })), (0, jsx_runtime_1.jsxs)("div", { className: `max-w-2xl ${isUser ? 'order-1' : ''}`, children: [referencedNews && ((0, jsx_runtime_1.jsxs)("div", { className: "mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Quote, { className: "w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "text-xs text-blue-600 font-medium mb-1", children: "\u5F15\u7528\u65B0\u95FB" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-blue-800", children: referencedNews.title })] })] })), (0, jsx_runtime_1.jsx)("div", { className: `px-4 py-3 rounded-2xl ${isUser
                            ? 'bg-blue-600 text-white rounded-tr-md'
                            : 'bg-white text-gray-900 rounded-tl-md border border-gray-200'}`, children: (0, jsx_runtime_1.jsx)("p", { className: "whitespace-pre-wrap", children: message.content }) }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-400 mt-1 px-1", children: new Date(message.timestamp).toLocaleTimeString('zh-CN', {
                            hour: '2-digit',
                            minute: '2-digit',
                        }) })] }), isUser && ((0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0", children: (0, jsx_runtime_1.jsx)(lucide_react_1.User, { className: "w-5 h-5 text-gray-500" }) }))] }));
}
