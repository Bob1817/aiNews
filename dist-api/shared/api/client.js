"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NYTApiAdapter = exports.GuardianApiAdapter = exports.NewsApiAdapter = exports.ApiClient = exports.ApiClientError = void 0;
const config_1 = require("../../shared/config");
const errors_1 = require("../../shared/errors");
// API 客户端错误
class ApiClientError extends errors_1.ExternalApiError {
    constructor(message, service, url, status, originalError) {
        super(message, service, originalError);
        this.service = service;
        this.url = url;
        this.status = status;
        this.name = 'ApiClientError';
    }
}
exports.ApiClientError = ApiClientError;
// 基础 API 客户端
class ApiClient {
    constructor(serviceName, baseConfig = {}) {
        this.serviceName = serviceName;
        this.baseConfig = baseConfig;
        this.defaultHeaders = {
            'User-Agent': 'AINews/1.0',
            'Content-Type': 'application/json',
            ...baseConfig.headers,
        };
        this.defaultTimeout = baseConfig.timeout || config_1.configUtils.getConfig().api.timeout;
    }
    // 发送请求
    async request(config) {
        const { url, method = 'GET', headers = {}, params = {}, body, timeout = this.defaultTimeout, retries = config_1.configUtils.getConfig().newsApi.maxRetries, } = config;
        // 构建完整 URL
        const fullUrl = this.buildUrl(url, params);
        // 合并请求头
        const requestHeaders = {
            ...this.defaultHeaders,
            ...headers,
        };
        // 使用重试策略发送请求
        return errors_1.ErrorHandler.withRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(fullUrl, {
                    method,
                    headers: requestHeaders,
                    body: body ? JSON.stringify(body) : undefined,
                    signal: controller.signal,
                });
                const responseData = await this.parseResponse(response);
                if (!response.ok) {
                    throw new ApiClientError(`API 请求失败: ${response.status}`, this.serviceName, fullUrl, response.status, new Error(responseData?.message || 'Unknown error'));
                }
                return {
                    data: responseData,
                    status: response.status,
                    headers: this.extractHeaders(response),
                };
            }
            finally {
                clearTimeout(timeoutId);
            }
        }, retries, 1000, // 初始延迟 1秒
        `${this.serviceName} API 请求`);
    }
    // GET 请求
    async get(url, params, config) {
        return this.request({
            url,
            method: 'GET',
            params,
            ...config,
        });
    }
    // POST 请求
    async post(url, body, config) {
        return this.request({
            url,
            method: 'POST',
            body,
            ...config,
        });
    }
    // 构建 URL
    buildUrl(baseUrl, params) {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.append(key, String(value));
            }
        });
        return url.toString();
    }
    // 解析响应
    async parseResponse(response) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            try {
                return await response.json();
            }
            catch (error) {
                // 如果 JSON 解析失败，尝试解析为文本
                const text = await response.text();
                console.warn(`JSON 解析失败，原始响应: ${text.substring(0, 200)}`);
                return text;
            }
        }
        return response.text();
    }
    // 提取响应头
    extractHeaders(response) {
        const headers = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        return headers;
    }
    // 创建特定服务的 API 客户端
    static createNewsApiClient(apiKey, baseUrl) {
        return new ApiClient('NewsAPI', {
            baseUrl: baseUrl || 'https://newsapi.org/v2',
            headers: {
                'X-Api-Key': apiKey,
            },
        });
    }
    static createGuardianApiClient(apiKey, baseUrl) {
        return new ApiClient('The Guardian', {
            baseUrl: baseUrl || 'https://content.guardianapis.com',
        });
    }
    static createNYTApiClient(apiKey, baseUrl) {
        return new ApiClient('New York Times', {
            baseUrl: baseUrl || 'https://api.nytimes.com/svc/search/v2',
        });
    }
}
exports.ApiClient = ApiClient;
// 新闻 API 适配器
class NewsApiAdapter {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    // 获取头条新闻
    async getTopHeadlines(params) {
        const response = await this.apiClient.get('/top-headlines', params);
        return response.data.articles || [];
    }
    // 搜索新闻
    async searchEverything(params) {
        const response = await this.apiClient.get('/everything', params);
        return response.data.articles || [];
    }
}
exports.NewsApiAdapter = NewsApiAdapter;
// Guardian API 适配器
class GuardianApiAdapter {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    // 搜索内容
    async searchContent(params) {
        const response = await this.apiClient.get('/search', {
            ...params,
            'api-key': this.getApiKeyFromClient(),
        });
        return response.data.response?.results || [];
    }
    // 从客户端获取 API 密钥
    getApiKeyFromClient() {
        // 从客户端配置中提取 API 密钥
        const config = this.apiClient;
        return config.baseConfig?.headers?.['api-key'] || '';
    }
}
exports.GuardianApiAdapter = GuardianApiAdapter;
// NYT API 适配器
class NYTApiAdapter {
    constructor(apiClient) {
        this.apiClient = apiClient;
    }
    // 文章搜索
    async articleSearch(params) {
        const response = await this.apiClient.get('/articlesearch.json', params);
        return response.data.response?.docs || [];
    }
}
exports.NYTApiAdapter = NYTApiAdapter;
// 导出所有 API 客户端和适配器
exports.default = {
    ApiClient,
    ApiClientError,
    NewsApiAdapter,
    GuardianApiAdapter,
    NYTApiAdapter,
};
//# sourceMappingURL=client.js.map