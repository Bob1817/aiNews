"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Login = Login;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const toast_1 = require("@/lib/toast");
const auth_1 = require("@/lib/auth");
const auth_2 = require("@/lib/api/auth");
const errors_1 = require("@/lib/errors");
function Login() {
    const [formData, setFormData] = (0, react_1.useState)({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = (0, react_1.useState)(false);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)('');
    const navigate = (0, react_router_dom_1.useNavigate)();
    const { showToast } = (0, toast_1.useToast)();
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError('请填写所有字段');
            return;
        }
        setIsLoading(true);
        setError('');
        try {
            const data = await (0, auth_2.login)({
                email: formData.email,
                password: formData.password,
            });
            // 登录成功，保存用户信息到本地存储
            (0, auth_1.setAuthSession)(data.user, data.profile);
            // 跳转到主页
            navigate('/chat');
        }
        catch (error) {
            const message = (0, errors_1.getErrorMessage)(error, '登录失败');
            setError(message);
            showToast({
                title: '登录失败',
                message,
                variant: 'error',
            });
        }
        finally {
            setIsLoading(false);
        }
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex items-center justify-center min-h-screen bg-gray-50", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-md p-8 bg-white rounded-2xl shadow-lg", children: [(0, jsx_runtime_1.jsxs)("div", { className: "text-center mb-8", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-20 h-20 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4", children: (0, jsx_runtime_1.jsx)(lucide_react_1.UserPlus, { className: "w-10 h-10 text-white" }) }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "\u767B\u5F55" }), (0, jsx_runtime_1.jsx)("p", { className: "text-gray-500 mt-2", children: "\u767B\u5F55\u5230\u60A8\u7684 AI \u65B0\u95FB\u521B\u4F5C\u5DE5\u5177\u8D26\u53F7" })] }), error && ((0, jsx_runtime_1.jsx)("div", { className: "mb-4 p-3 bg-red-50 text-red-600 rounded-lg", children: error })), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u90AE\u7BB1" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Mail, { className: "w-5 h-5 text-gray-400" }) }), (0, jsx_runtime_1.jsx)("input", { type: "email", value: formData.email, onChange: (e) => setFormData({ ...formData, email: e.target.value }), placeholder: "\u8BF7\u8F93\u5165\u90AE\u7BB1", className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u5BC6\u7801" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Lock, { className: "w-5 h-5 text-gray-400" }) }), (0, jsx_runtime_1.jsx)("input", { type: showPassword ? 'text' : 'password', value: formData.password, onChange: (e) => setFormData({ ...formData, password: e.target.value }), placeholder: "\u8BF7\u8F93\u5165\u5BC6\u7801", className: "w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => setShowPassword(!showPassword), className: "absolute inset-y-0 right-0 pr-3 flex items-center", children: showPassword ? ((0, jsx_runtime_1.jsx)(lucide_react_1.EyeOff, { className: "w-5 h-5 text-gray-400" })) : ((0, jsx_runtime_1.jsx)(lucide_react_1.Eye, { className: "w-5 h-5 text-gray-400" })) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [(0, jsx_runtime_1.jsx)("input", { id: "remember-me", name: "remember-me", type: "checkbox", className: "h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" }), (0, jsx_runtime_1.jsx)("label", { htmlFor: "remember-me", className: "ml-2 block text-sm text-gray-900", children: "\u8BB0\u4F4F\u6211" })] }), (0, jsx_runtime_1.jsx)("div", { className: "text-sm", children: (0, jsx_runtime_1.jsx)("a", { href: "#", className: "font-medium text-blue-600 hover:text-blue-500", children: "\u5FD8\u8BB0\u5BC6\u7801\uFF1F" }) })] }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: isLoading, className: "w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors", children: isLoading ? ((0, jsx_runtime_1.jsx)("div", { className: "w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" })) : ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsx)("span", { children: "\u767B\u5F55" }), (0, jsx_runtime_1.jsx)(lucide_react_1.ArrowRight, { className: "w-4 h-4" })] })) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "text-center text-sm text-gray-500", children: ["\u8FD8\u6CA1\u6709\u8D26\u53F7\uFF1F", ' ', (0, jsx_runtime_1.jsx)(react_router_dom_1.Link, { to: "/register", className: "font-medium text-blue-600 hover:text-blue-500", children: "\u6CE8\u518C" })] })] })] }) }));
}
