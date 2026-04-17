"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastProvider = ToastProvider;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const toast_1 = require("@/lib/toast");
function getToastIcon(variant) {
    switch (variant) {
        case 'success':
            return lucide_react_1.CheckCircle2;
        case 'error':
            return lucide_react_1.AlertCircle;
        default:
            return lucide_react_1.Info;
    }
}
function getToastStyles(variant) {
    switch (variant) {
        case 'success':
            return 'border-green-200 bg-green-50 text-green-900';
        case 'error':
            return 'border-red-200 bg-red-50 text-red-900';
        default:
            return 'border-blue-200 bg-blue-50 text-blue-900';
    }
}
function ToastProvider({ children }) {
    const [toasts, setToasts] = (0, react_1.useState)([]);
    const timeoutMap = (0, react_1.useRef)({});
    const removeToast = (0, react_1.useCallback)((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
        const timeoutId = timeoutMap.current[id];
        if (timeoutId) {
            window.clearTimeout(timeoutId);
            delete timeoutMap.current[id];
        }
    }, []);
    const showToast = (0, react_1.useCallback)(({ title, message, variant = 'info' }) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setToasts((current) => [...current, { id, title, message, variant }]);
        timeoutMap.current[id] = window.setTimeout(() => {
            removeToast(id);
        }, 4000);
    }, [removeToast]);
    (0, react_1.useEffect)(() => {
        const timeouts = timeoutMap.current;
        return () => {
            Object.values(timeouts).forEach((timeoutId) => window.clearTimeout(timeoutId));
        };
    }, []);
    const value = (0, react_1.useMemo)(() => ({ showToast }), [showToast]);
    return ((0, jsx_runtime_1.jsxs)(toast_1.ToastContext.Provider, { value: value, children: [children, (0, jsx_runtime_1.jsx)("div", { className: "pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3", children: toasts.map((toast) => {
                    const Icon = getToastIcon(toast.variant);
                    return ((0, jsx_runtime_1.jsx)("div", { className: `pointer-events-auto rounded-2xl border p-4 shadow-lg backdrop-blur-sm ${getToastStyles(toast.variant)}`, children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)(Icon, { className: "mt-0.5 h-5 w-5 shrink-0" }), (0, jsx_runtime_1.jsxs)("div", { className: "min-w-0 flex-1", children: [(0, jsx_runtime_1.jsx)("p", { className: "text-sm font-semibold", children: toast.title }), toast.message && (0, jsx_runtime_1.jsx)("p", { className: "mt-1 text-sm opacity-80", children: toast.message })] }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: () => removeToast(toast.id), className: "rounded-md p-1 opacity-60 transition-opacity hover:opacity-100", "aria-label": "\u5173\u95ED\u63D0\u793A", children: (0, jsx_runtime_1.jsx)(lucide_react_1.X, { className: "h-4 w-4" }) })] }) }, toast.id));
                }) })] }));
}
