"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
exports.apiUrl = apiUrl;
exports.apiRequest = apiRequest;
exports.withJsonBody = withJsonBody;
function resolveApiBaseUrl() {
    if (typeof window === 'undefined') {
        return 'http://localhost:3001';
    }
    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        return window.location.origin.replace(/:\d+$/, ':3001');
    }
    return 'http://localhost:3001';
}
const API_BASE_URL = resolveApiBaseUrl().replace(/\/$/, '');
class ApiError extends Error {
    constructor(message, status, data) {
        super(message);
        Object.defineProperty(this, "status", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "data", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = 'ApiError';
        this.status = status;
        this.data = data;
    }
}
exports.ApiError = ApiError;
function apiUrl(path) {
    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
async function apiRequest(path, init) {
    const response = await fetch(apiUrl(path), init);
    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();
    if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'message' in data
            ? String(data.message)
            : typeof data === 'object' && data !== null && 'error' in data
                ? String(data.error)
                : `请求失败: ${response.status}`;
        throw new ApiError(message, response.status, data);
    }
    return data;
}
function withJsonBody(body, init) {
    return {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
        body: JSON.stringify(body),
    };
}
