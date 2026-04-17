"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsCard = NewsCard;
const jsx_runtime_1 = require("react/jsx-runtime");
const lucide_react_1 = require("lucide-react");
function NewsCard({ article, onQuote, isSelected }) {
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        if (hours < 1)
            return '刚刚';
        if (hours < 24)
            return `${hours}小时前`;
        return date.toLocaleDateString('zh-CN');
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: `bg-white rounded-xl border p-4 transition-all cursor-pointer ${isSelected ? 'border-blue-500 ring-2 ring-blue-100' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-start justify-between mb-3", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-xs font-medium px-2 py-1 bg-blue-50 text-blue-600 rounded", children: article.source }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1 text-gray-400 text-xs", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Clock, { className: "w-3 h-3" }), formatDate(article.publishedAt)] })] }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-gray-900 mb-2 line-clamp-2", children: article.title }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600 line-clamp-3 mb-4", children: article.content }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex gap-2", children: article.relatedKeywords.slice(0, 2).map((keyword) => ((0, jsx_runtime_1.jsx)("span", { className: "text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded", children: keyword }, keyword))) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("a", { href: article.url, target: "_blank", rel: "noopener noreferrer", className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.ExternalLink, { className: "w-4 h-4" }) }), onQuote && ((0, jsx_runtime_1.jsx)("button", { onClick: () => onQuote(article), className: "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", title: "\u5F15\u7528\u6B64\u65B0\u95FB", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Quote, { className: "w-4 h-4" }) }))] })] })] }));
}
