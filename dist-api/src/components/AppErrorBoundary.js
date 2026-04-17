"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppErrorBoundary = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
class AppErrorBoundary extends react_1.Component {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "state", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: {
                hasError: false,
            }
        });
        Object.defineProperty(this, "handleReload", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: () => {
                window.location.reload();
            }
        });
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error, errorInfo) {
        console.error('应用渲染异常:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return ((0, jsx_runtime_1.jsx)("div", { className: "flex min-h-screen items-center justify-center bg-gray-50 px-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-lg rounded-3xl border border-red-100 bg-white p-8 shadow-xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600", children: "!" }), (0, jsx_runtime_1.jsx)("h1", { className: "text-2xl font-bold text-gray-900", children: "\u9875\u9762\u9047\u5230\u5F02\u5E38" }), (0, jsx_runtime_1.jsx)("p", { className: "mt-3 text-sm leading-6 text-gray-600", children: "\u5E94\u7528\u521A\u521A\u53D1\u751F\u4E86\u4E00\u6B21\u672A\u5904\u7406\u9519\u8BEF\u3002\u4F60\u53EF\u4EE5\u5237\u65B0\u9875\u9762\u7EE7\u7EED\u4F7F\u7528\uFF0C\u5982\u679C\u95EE\u9898\u6301\u7EED\u51FA\u73B0\uFF0C\u518D\u68C0\u67E5\u521A\u624D\u7684\u64CD\u4F5C\u8DEF\u5F84\u3002" }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: this.handleReload, className: "mt-6 rounded-xl bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700", children: "\u5237\u65B0\u9875\u9762" })] }) }));
        }
        return this.props.children;
    }
}
exports.AppErrorBoundary = AppErrorBoundary;
