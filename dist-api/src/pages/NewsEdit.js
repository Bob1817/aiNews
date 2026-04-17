"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NewsEdit = NewsEdit;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const toast_1 = require("@/lib/toast");
const store_1 = require("@/store");
const errors_1 = require("@/lib/errors");
const categories_1 = require("@/lib/api/categories");
const news_1 = require("@/lib/api/news");
const fallbacks_1 = require("@/lib/fallbacks");
function NewsEdit() {
    const { id } = (0, react_router_dom_1.useParams)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { savedNews, setSavedNews } = (0, store_1.useAppStore)();
    const [formData, setFormData] = (0, react_1.useState)({
        title: '',
        content: '',
        categories: [],
    });
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [isPublishing, setIsPublishing] = (0, react_1.useState)(false);
    const [showPublishOptions, setShowPublishOptions] = (0, react_1.useState)(false);
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [isLoadingCategories, setIsLoadingCategories] = (0, react_1.useState)(false);
    const [selectedPlatforms, setSelectedPlatforms] = (0, react_1.useState)([]);
    const { showToast } = (0, toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        // 获取分类列表
        const fetchCategories = async () => {
            setIsLoadingCategories(true);
            try {
                const data = await (0, categories_1.getCategories)();
                setCategories(data);
            }
            catch (error) {
                setCategories((0, fallbacks_1.getDefaultCategories)());
                showToast({
                    title: '分类加载失败',
                    message: '已切换为默认分类。',
                    variant: 'info',
                });
            }
            finally {
                setIsLoadingCategories(false);
            }
        };
        fetchCategories();
        if (id) {
            const news = savedNews.find((n) => n.id === id);
            if (news) {
                setFormData({
                    title: news.title,
                    content: news.content,
                    categories: news.categories || [],
                });
                setSelectedPlatforms(news.publishedTo || []);
            }
        }
    }, [id, savedNews, showToast]);
    const handleSave = async () => {
        if (!formData.title.trim() || !formData.content.trim())
            return;
        setIsSaving(true);
        try {
            if (id) {
                const data = await (0, news_1.updateSavedNews)(id, formData);
                setSavedNews(savedNews.map((news) => (news.id === id ? data.data : news)));
            }
            else {
                const data = await (0, news_1.createSavedNews)({
                    userId: '1',
                    ...formData,
                    industries: [],
                });
                setSavedNews([data.data, ...savedNews]);
            }
            showToast({
                title: '保存成功',
                message: id ? '新闻内容已更新。' : '新闻已创建。',
                variant: 'success',
            });
            navigate('/news');
        }
        catch (error) {
            console.error('保存新闻失败:', error);
            showToast({
                title: '保存失败',
                message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handlePublish = async (platforms) => {
        if (!id)
            return;
        setIsPublishing(true);
        try {
            await (0, news_1.publishNews)(id, platforms);
            setSavedNews(savedNews.map((news) => news.id === id
                ? {
                    ...news,
                    isPublished: true,
                    publishedTo: [...new Set([...news.publishedTo, ...platforms])],
                    updatedAt: new Date().toISOString(),
                }
                : news));
            setShowPublishOptions(false);
            showToast({
                title: '发布成功',
                message: `已发布到 ${platforms.join('、')}`,
                variant: 'success',
            });
        }
        catch (error) {
            console.error('发布新闻失败:', error);
            showToast({
                title: '发布失败',
                message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                variant: 'error',
            });
        }
        finally {
            setIsPublishing(false);
        }
    };
    const currentNews = id ? savedNews.find((n) => n.id === id) : null;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-gray-50", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-white border-b border-gray-200 px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/news", className: "flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "w-4 h-4" }), "\u8FD4\u56DE"] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-semibold text-gray-900", children: id ? '编辑新闻' : '新建新闻' }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [id && currentNews && ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-2", children: currentNews.isPublished && ((0, jsx_runtime_1.jsxs)("span", { className: "flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.CheckCircle2, { className: "w-3 h-3" }), "\u5DF2\u53D1\u5E03"] })) })), id && ((0, jsx_runtime_1.jsxs)("button", { onClick: () => setShowPublishOptions(true), disabled: isPublishing, className: "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Share2, { className: "w-4 h-4" }), isPublishing ? '发布中...' : '发布'] })), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSave, disabled: isSaving, className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "w-4 h-4" }), isSaving ? '保存中...' : '保存'] })] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u65B0\u95FB\u6807\u9898" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: formData.title, onChange: (e) => setFormData({ ...formData, title: e.target.value }), placeholder: "\u8BF7\u8F93\u5165\u65B0\u95FB\u6807\u9898...", className: "w-full px-4 py-3 border border-gray-300 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u65B0\u95FB\u5206\u7C7B" }), isLoadingCategories ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-4", children: "\u52A0\u8F7D\u5206\u7C7B\u4E2D..." })) : ((0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: categories.map((category) => ((0, jsx_runtime_1.jsxs)("label", { className: `flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${formData.categories.includes(category.id)
                                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                                            : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200'}`, children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: formData.categories.includes(category.id), onChange: (e) => {
                                                    if (e.target.checked) {
                                                        setFormData({
                                                            ...formData,
                                                            categories: [...formData.categories, category.id],
                                                        });
                                                    }
                                                    else {
                                                        setFormData({
                                                            ...formData,
                                                            categories: formData.categories.filter((id) => id !== category.id),
                                                        });
                                                    }
                                                }, className: "sr-only" }), (0, jsx_runtime_1.jsx)("span", { children: category.name })] }, category.id))) }))] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u65B0\u95FB\u5185\u5BB9" }), (0, jsx_runtime_1.jsx)("textarea", { value: formData.content, onChange: (e) => setFormData({ ...formData, content: e.target.value }), placeholder: "\u8BF7\u8F93\u5165\u65B0\u95FB\u5185\u5BB9...", rows: 20, className: "w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" })] })] }) }), showPublishOptions && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl p-6 w-full max-w-md mx-4", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u9009\u62E9\u53D1\u5E03\u5E73\u53F0" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3 mb-6", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Globe, { className: "w-5 h-5 text-blue-600" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-gray-900", children: "\u5B98\u7F51\u65B0\u95FB\u677F\u5757" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500", children: "\u53D1\u5E03\u5230\u516C\u53F8\u5B98\u7F51" })] }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "w-5 h-5 text-blue-600 rounded", value: "website", checked: selectedPlatforms.includes('website'), onChange: (e) => {
                                                setSelectedPlatforms((current) => e.target.checked
                                                    ? [...new Set([...current, 'website'])]
                                                    : current.filter((platform) => platform !== 'website'));
                                            } })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:bg-gray-50 cursor-pointer transition-colors", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "w-5 h-5 text-green-600" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-gray-900", children: "\u5FAE\u4FE1\u516C\u4F17\u53F7" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500", children: "\u63A8\u9001\u5230\u5FAE\u4FE1\u516C\u4F17\u53F7" })] }), (0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "w-5 h-5 text-green-600 rounded", value: "wechat", checked: selectedPlatforms.includes('wechat'), onChange: (e) => {
                                                setSelectedPlatforms((current) => e.target.checked
                                                    ? [...new Set([...current, 'wechat'])]
                                                    : current.filter((platform) => platform !== 'wechat'));
                                            } })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-3", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => setShowPublishOptions(false), className: "flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors", children: "\u53D6\u6D88" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                        if (selectedPlatforms.length > 0) {
                                            handlePublish(selectedPlatforms);
                                        }
                                    }, disabled: isPublishing, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors", children: isPublishing ? '发布中...' : '确认发布' })] })] }) }))] }));
}
