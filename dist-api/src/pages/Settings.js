"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Settings = Settings;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const toast_1 = require("@/lib/toast");
const categories_1 = require("@/lib/api/categories");
const errors_1 = require("@/lib/errors");
const settings_1 = require("@/lib/api/settings");
const fallbacks_1 = require("@/lib/fallbacks");
function Settings() {
    const [industries, setIndustries] = (0, react_1.useState)([]);
    const [keywords, setKeywords] = (0, react_1.useState)([]);
    const [newIndustry, setNewIndustry] = (0, react_1.useState)('');
    const [newKeyword, setNewKeyword] = (0, react_1.useState)('');
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    // 分类管理状态
    const [categories, setCategories] = (0, react_1.useState)([]);
    const [newCategoryName, setNewCategoryName] = (0, react_1.useState)('');
    const [newCategoryDescription, setNewCategoryDescription] = (0, react_1.useState)('');
    const [editingCategory, setEditingCategory] = (0, react_1.useState)(null);
    const [isLoadingCategories, setIsLoadingCategories] = (0, react_1.useState)(false);
    const { showToast } = (0, toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        // 从后端 API 获取用户设置
        const fetchUserSettings = async () => {
            try {
                const data = await (0, settings_1.getUserProfile)('1');
                setIndustries(data.industries || []);
                setKeywords(data.keywords || []);
            }
            catch (error) {
                const defaults = (0, fallbacks_1.getDefaultInterests)();
                setIndustries(defaults.industries);
                setKeywords(defaults.keywords);
                showToast({
                    title: '用户设置加载失败',
                    message: '已切换为默认兴趣配置。',
                    variant: 'info',
                });
            }
        };
        // 从后端 API 获取分类
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
        fetchUserSettings();
        fetchCategories();
    }, [showToast]);
    const handleAddIndustry = () => {
        if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
            setIndustries([...industries, newIndustry.trim()]);
            setNewIndustry('');
        }
    };
    const handleAddKeyword = () => {
        if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
            setKeywords([...keywords, newKeyword.trim()]);
            setNewKeyword('');
        }
    };
    const handleRemoveIndustry = (industry) => {
        setIndustries(industries.filter((item) => item !== industry));
    };
    const handleRemoveKeyword = (keyword) => {
        setKeywords(keywords.filter((item) => item !== keyword));
    };
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await (0, settings_1.updateUserProfile)({
                userId: '1',
                industries,
                keywords,
            });
            showToast({
                title: '保存成功',
                message: '用户设置已更新。',
                variant: 'success',
            });
        }
        catch (error) {
            console.error('保存设置失败:', error);
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
    // 分类管理函数
    const handleAddCategory = async () => {
        if (newCategoryName.trim()) {
            try {
                const newCategory = await (0, categories_1.createCategory)({
                    name: newCategoryName.trim(),
                    description: newCategoryDescription.trim(),
                });
                setCategories([...categories, newCategory]);
                setNewCategoryName('');
                setNewCategoryDescription('');
                showToast({
                    title: '分类已创建',
                    variant: 'success',
                });
            }
            catch (error) {
                console.error('创建分类失败:', error);
                showToast({
                    title: '创建分类失败',
                    message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                    variant: 'error',
                });
            }
        }
    };
    const handleEditCategory = (category) => {
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setNewCategoryDescription(category.description || '');
    };
    const handleUpdateCategory = async () => {
        if (editingCategory && newCategoryName.trim()) {
            try {
                const updatedCategory = await (0, categories_1.updateCategory)(editingCategory.id, {
                    name: newCategoryName.trim(),
                    description: newCategoryDescription.trim(),
                });
                setCategories(categories.map(cat => cat.id === editingCategory.id ? updatedCategory : cat));
                setEditingCategory(null);
                setNewCategoryName('');
                setNewCategoryDescription('');
                showToast({
                    title: '分类已更新',
                    variant: 'success',
                });
            }
            catch (error) {
                console.error('更新分类失败:', error);
                showToast({
                    title: '更新分类失败',
                    message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                    variant: 'error',
                });
            }
        }
    };
    const handleCancelEdit = () => {
        setEditingCategory(null);
        setNewCategoryName('');
        setNewCategoryDescription('');
    };
    const handleDeleteCategory = async (id) => {
        try {
            await (0, categories_1.deleteCategory)(id);
            setCategories(categories.filter(cat => cat.id !== id));
            showToast({
                title: '分类已删除',
                variant: 'success',
            });
        }
        catch (error) {
            console.error('删除分类失败:', error);
            showToast({
                title: '删除分类失败',
                message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                variant: 'error',
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-gray-50", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-white border-b border-gray-200 px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/chat", className: "flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "w-4 h-4" }), "\u8FD4\u56DE"] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-semibold text-gray-900", children: "\u7528\u6237\u8BBE\u7F6E" }) }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSave, disabled: isSaving, className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "w-4 h-4" }), isSaving ? '保存中...' : '保存'] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u5173\u6CE8\u7684\u884C\u4E1A" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mb-4", children: "\u9009\u62E9\u60A8\u5173\u6CE8\u7684\u884C\u4E1A\uFF0C\u7CFB\u7EDF\u5C06\u57FA\u4E8E\u8FD9\u4E9B\u884C\u4E1A\u4E3A\u60A8\u63A8\u9001\u76F8\u5173\u65B0\u95FB" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 mb-4", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newIndustry, onChange: (e) => setNewIndustry(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddIndustry(), placeholder: "\u6DFB\u52A0\u884C\u4E1A...", className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleAddIndustry, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-4 h-4" }), "\u6DFB\u52A0"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: industries.map((industry) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg", children: [(0, jsx_runtime_1.jsx)("span", { children: industry }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleRemoveIndustry(industry), className: "text-blue-500 hover:text-blue-700 transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "w-4 h-4" }) })] }, industry))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u5173\u952E\u8BCD\u8BBE\u7F6E" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mb-4", children: "\u6DFB\u52A0\u5173\u952E\u8BCD\uFF0C\u7CFB\u7EDF\u5C06\u57FA\u4E8E\u8FD9\u4E9B\u5173\u952E\u8BCD\u4E3A\u60A8\u63A8\u9001\u76F8\u5173\u65B0\u95FB" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2 mb-4", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newKeyword, onChange: (e) => setNewKeyword(e.target.value), onKeyPress: (e) => e.key === 'Enter' && handleAddKeyword(), placeholder: "\u6DFB\u52A0\u5173\u952E\u8BCD...", className: "flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleAddKeyword, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-4 h-4" }), "\u6DFB\u52A0"] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex flex-wrap gap-2", children: keywords.map((keyword) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg", children: [(0, jsx_runtime_1.jsx)("span", { children: keyword }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleRemoveKeyword(keyword), className: "text-gray-500 hover:text-gray-700 transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "w-4 h-4" }) })] }, keyword))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u901A\u77E5\u8BBE\u7F6E" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mb-4", children: "\u8BBE\u7F6E\u65B0\u95FB\u63A8\u9001\u901A\u77E5" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-gray-900", children: "\u65B0\u95FB\u66F4\u65B0\u901A\u77E5" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500", children: "\u65B0\u95FB\u66F4\u65B0\u65F6\u63A5\u6536\u684C\u9762\u901A\u77E5" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "relative inline-flex items-center cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "sr-only peer", defaultChecked: true }), (0, jsx_runtime_1.jsx)("div", { className: "w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-gray-900", children: "\u6BCF\u65E5\u65B0\u95FB\u6458\u8981" }), (0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500", children: "\u6BCF\u5929\u65E9\u4E0A 8 \u70B9\u63A5\u6536\u65B0\u95FB\u6458\u8981" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "relative inline-flex items-center cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", className: "sr-only peer", defaultChecked: true }), (0, jsx_runtime_1.jsx)("div", { className: "w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900 mb-4", children: "\u65B0\u95FB\u5206\u7C7B\u7BA1\u7406" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mb-4", children: "\u7BA1\u7406\u65B0\u95FB\u5206\u7C7B\uFF0C\u7528\u4E8E\u65B0\u95FB\u7684\u5206\u7C7B\u5C55\u793A" }), (0, jsx_runtime_1.jsxs)("div", { className: "mb-6", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-md font-medium text-gray-700 mb-3", children: editingCategory ? '编辑分类' : '添加分类' }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("input", { type: "text", value: newCategoryName, onChange: (e) => setNewCategoryName(e.target.value), placeholder: "\u5206\u7C7B\u540D\u79F0", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: newCategoryDescription, onChange: (e) => setNewCategoryDescription(e.target.value), placeholder: "\u5206\u7C7B\u63CF\u8FF0", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsx)("div", { className: "flex gap-2", children: editingCategory ? ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: handleUpdateCategory, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "w-4 h-4" }), "\u4FDD\u5B58\u4FEE\u6539"] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleCancelEdit, className: "px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors", children: "\u53D6\u6D88" })] })) : ((0, jsx_runtime_1.jsxs)("button", { onClick: handleAddCategory, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Plus, { className: "w-4 h-4" }), "\u6DFB\u52A0\u5206\u7C7B"] })) })] })] }), (0, jsx_runtime_1.jsx)("h3", { className: "text-md font-medium text-gray-700 mb-3", children: "\u5206\u7C7B\u5217\u8868" }), isLoadingCategories ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8", children: "\u52A0\u8F7D\u4E2D..." })) : categories.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "text-center py-8 text-gray-500", children: "\u6682\u65E0\u5206\u7C7B" })) : ((0, jsx_runtime_1.jsx)("div", { className: "space-y-3", children: categories.map((category) => ((0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between p-4 bg-gray-50 rounded-lg", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium text-gray-900", children: category.name }), category.description && ((0, jsx_runtime_1.jsx)("p", { className: "text-sm text-gray-500", children: category.description }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-2", children: [(0, jsx_runtime_1.jsx)("button", { onClick: () => handleEditCategory(category), className: "p-2 text-gray-500 hover:text-blue-600 transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Edit, { className: "w-4 h-4" }) }), (0, jsx_runtime_1.jsx)("button", { onClick: () => handleDeleteCategory(category.id), className: "p-2 text-gray-500 hover:text-red-600 transition-colors", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "w-4 h-4" }) })] })] }, category.id))) }))] })] }) })] }));
}
