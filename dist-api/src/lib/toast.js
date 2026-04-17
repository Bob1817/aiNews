"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToastContext = void 0;
exports.useToast = useToast;
const react_1 = require("react");
exports.ToastContext = (0, react_1.createContext)(null);
function useToast() {
    const context = (0, react_1.useContext)(exports.ToastContext);
    if (!context) {
        throw new Error('useToast 必须在 ToastProvider 内使用');
    }
    return context;
}
