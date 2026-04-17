"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getErrorMessage = getErrorMessage;
function getErrorMessage(error, fallback = '操作失败') {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return fallback;
}
