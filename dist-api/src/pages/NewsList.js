"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsList = NewsList;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const store_1 = require("@/store");
const categories_1 = require("@/lib/api/categories");
const news_1 = require("@/lib/api/news");
const fallbacks_1 = require("@/lib/fallbacks");
function NewsList() {
    const { savedNews, setSavedNews } = (0, store_1.useAppStore)();
    const [filter, setFilter] = (0, react_1.useState)('all');
    const [searchKeyword, setSearchKeyword] = (0, react_1.useState)('');
    const [industryFilter, setIndustryFilter] = (0, react_1.useState)('all');
    const industries = ['科技', '医疗', '汽车', '新能源', '云计算'];
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [, setIsLoadingCategories] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // 从后端 API 获取保存的新闻
        const fetchSavedNews = async () => {
            try {
                const news = await (0, news_1.getSavedNews)('1');
                setSavedNews(news);
            }
            catch (error) {
                setSavedNews((0, fallbacks_1.getMockSavedNews)());
            }
        };
        // 从后端 API 获取分类列表
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const data = await (0, categories_1.getCategories)();
                setCategories(data);
            }
            catch (error) {
                setCategories((0, fallbacks_1.getDefaultCategories)());
            }
            finally {
                setIsLoadingCategories(false);
            }
        };
        fetchSavedNews();
        fetchCategories();
    }, [setSavedNews]);
    const filteredNews = savedNews.filter((news) => {
        // 状态过滤
        if (filter === 'published' && !news.isPublished)
            return false;
        if (filter === 'draft' && news.isPublished)
            return false;
        // 关键词搜索
        if (searchKeyword && !news.title.includes(searchKeyword) && !news.content.includes(searchKeyword)) {
            return false;
        }
        // 行业筛选
        if (industryFilter !== 'all') {
            return news.industries?.includes(industryFilter) || false;
        }
        return true;
    });
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-gray-50", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-white border-b border-gray-200 p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "\u65B0\u95FB\u7BA1\u7406" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mt-1", children: "\u7BA1\u7406\u60A8\u4FDD\u5B58\u548C\u521B\u4F5C\u7684\u6240\u6709\u65B0\u95FB" })] }), (0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/news/edit", className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-4 h-4" }), "\u65B0\u5EFA\u65B0\u95FB"] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white border-b border-gray-200 px-6 py-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col md:flex-row gap-4 mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative flex-1", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Search, { className: "w-4 h-4 text-gray-400" }) }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: searchKeyword, onChange: (e) => setSearchKeyword(e.target.value), placeholder: "\u641C\u7D22\u65B0\u95FB\u6807\u9898\u6216\u5185\u5BB9...", className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "relative w-full md:w-48", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Filter, { className: "w-4 h-4 text-gray-400" }) }), (0, jsx_runtime_1.jsxs)("select", { value: industryFilter, onChange: (e) => setIndustryFilter(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "\u5168\u884C\u4E1A" }), industries.map((industry) => ((0, jsx_runtime_1.jsx)("option", { value: industry, children: industry }, industry)))] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-4", children: ['all', 'published', 'draft'].map((f) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setFilter(f), className: `px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filter === f
                                ? 'bg-blue-100 text-blue-700'
                                : 'text-gray-600 hover:bg-gray-100'}`, children: [f === 'all' && '全部', f === 'published' && '已发布', f === 'draft' && '草稿'] }, f))) })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-6", children: filteredNews.length === 0 ? ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col items-center justify-center h-full text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-10 h-10 text-gray-400" }) }), (0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "\u6682\u65E0\u65B0\u95FB" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mb-4", children: "\u5F00\u59CB\u521B\u5EFA\u60A8\u7684\u7B2C\u4E00\u7BC7\u65B0\u95FB\u5427" }), (0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/news/edit", className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-4 h-4" }), "\u65B0\u5EFA\u65B0\u95FB"] })] })) : ((0, jsx_runtime_1.jsx)("div", { className: "grid gap-4 md:grid-cols-2 lg:grid-cols-3", children: filteredNews.map((news) => ((0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-start justify-between mb-3 gap-2", children: [(0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2", children: news.isPublished ? ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "w-3 h-3" }), "\u5DF2\u53D1\u5E03"] })) : ((0, jsx_runtime_1.jsx)("span", { className: "text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded", children: "\u8349\u7A3F" })) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [news.industries && news.industries.map((industry) => ((0, jsx_runtime_1.jsx)("span", { className: "text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded", children: industry }, industry))), news.categories && news.categories.map((categoryId) => {
                                                const category = categories.find(cat => cat.id === categoryId);
                                                return category ? ((0, jsx_runtime_1.jsx)("span", { className: "text-xs font-medium text-purple-600 bg-purple-50 px-2 py-1 rounded", children: category.name }, categoryId)) : null;
                                            })] })] }), (0, jsx_runtime_1.jsx)("h3", { className: "font-semibold text-gray-900 mb-2 line-clamp-2", children: news.title }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-600 line-clamp-3 mb-4", children: news.content }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between text-xs text-gray-400 mb-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Calendar, { className: "w-3 h-3" }), new Date(news.updatedAt).toLocaleDateString('zh-CN')] }), news.publishedTo.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-1", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Share2, { className: "w-3 h-3" }), news.publishedTo.length, " \u5E73\u53F0"] }))] }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2", children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: `/news/edit/${news.id}`, className: "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Edit, { className: "w-4 h-4" }), "\u7F16\u8F91"] }) })] }, news.id))) })) })] }));
}
