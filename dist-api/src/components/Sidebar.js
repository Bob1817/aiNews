"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Sidebar = Sidebar;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const lucide_react_1 = require("lucide-react");
const auth_1 = require("@/lib/auth");
function Sidebar() {
    const location = (0, react_router_dom_1.useLocation)();
    const [isSettingsOpen, setIsSettingsOpen] = (0, react_1.useState)(false);
    const menuItems = [
        { path: '/chat', label: '对话创作', icon: lucide_react_1.MessageSquare },
        { path: '/news', label: '新闻管理', icon: lucide_react_1.Newspaper },
    ];
    const settingsItems = [
        { path: '/settings', label: '用户设置', icon: lucide_react_1.Settings },
        { path: '/config', label: '系统配置', icon: lucide_react_1.Server },
    ];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "w-64 bg-white border-r border-gray-200 flex flex-col", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-6 border-b border-gray-200", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Bot, { className: "w-6 h-6 text-white" }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h1", { className: "font-bold text-gray-900", children: "AI \u65B0\u95FB\u52A9\u624B" }), (0, jsx_runtime_1.jsx)("p", { className: "text-xs text-gray-500", children: "\u667A\u80FD\u521B\u4F5C\u5E73\u53F0" })] })] }) }), (0, jsx_runtime_1.jsx)("nav", { className: "flex-1 p-4 space-y-2", children: menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: item.path, className: `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-50'}`, children: [(0, jsx_runtime_1.jsx)(Icon, { className: "w-5 h-5" }), (0, jsx_runtime_1.jsx)("span", { children: item.label })] }, item.path));
                }) }), (0, jsx_runtime_1.jsxs)("div", { className: "p-4 border-t border-gray-200", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between gap-3 px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors", onClick: () => setIsSettingsOpen(!isSettingsOpen), children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Settings, { className: "w-5 h-5" }), (0, jsx_runtime_1.jsx)("span", { children: "\u8BBE\u7F6E" })] }), isSettingsOpen ? (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronUp, { className: "w-4 h-4" }) : (0, jsx_runtime_1.jsx)(lucide_react_1.ChevronDown, { className: "w-4 h-4" })] }), isSettingsOpen && ((0, jsx_runtime_1.jsxs)("div", { className: "mt-2 space-y-1", children: [settingsItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return ((0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: item.path, className: `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-blue-50 text-blue-600 font-medium'
                                        : 'text-gray-600 hover:bg-gray-50'}`, onClick: () => setIsSettingsOpen(false), children: [(0, jsx_runtime_1.jsx)(Icon, { className: "w-4 h-4" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: item.label })] }, item.path));
                            }), (0, jsx_runtime_1.jsx)("div", { className: "border-t border-gray-100 my-2" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors", onClick: () => {
                                    (0, auth_1.clearAuthSession)();
                                    window.location.href = '/login';
                                }, children: [(0, jsx_runtime_1.jsxs)("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [(0, jsx_runtime_1.jsx)("path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" }), (0, jsx_runtime_1.jsx)("polyline", { points: "16 17 21 12 16 7" }), (0, jsx_runtime_1.jsx)("line", { x1: "21", y1: "12", x2: "9", y2: "12" })] }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm", children: "\u767B\u51FA" })] })] }))] })] }));
}
