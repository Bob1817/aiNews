import { ExternalApiError } from '../../shared/errors';
export interface ApiResponse<T = any> {
    data: T;
    status: number;
    headers: Record<string, string>;
}
export interface ApiRequestConfig {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    params?: Record<string, string | number | boolean>;
    body?: any;
    timeout?: number;
    retries?: number;
}
export declare class ApiClientError extends ExternalApiError {
    service: string;
    url: string;
    status?: number | undefined;
    constructor(message: string, service: string, url: string, status?: number | undefined, originalError?: Error);
}
export declare class ApiClient {
    private serviceName;
    private baseConfig;
    private defaultHeaders;
    private defaultTimeout;
    constructor(serviceName: string, baseConfig?: Partial<ApiRequestConfig>);
    request<T = any>(config: ApiRequestConfig): Promise<ApiResponse<T>>;
    get<T = any>(url: string, params?: Record<string, string | number | boolean>, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>;
    post<T = any>(url: string, body?: any, config?: Partial<ApiRequestConfig>): Promise<ApiResponse<T>>;
    private buildUrl;
    private parseResponse;
    private extractHeaders;
    static createNewsApiClient(apiKey: string, baseUrl?: string): ApiClient;
    static createGuardianApiClient(apiKey: string, baseUrl?: string): ApiClient;
    static createNYTApiClient(apiKey: string, baseUrl?: string): ApiClient;
}
export interface NewsApiArticle {
    title?: string;
    description?: string;
    content?: string;
    url?: string;
    publishedAt?: string;
    source?: {
        name?: string;
    };
}
export interface GuardianApiArticle {
    webTitle?: string;
    fields?: {
        headline?: string;
        trailText?: string;
        webUrl?: string;
        publicationDate?: string;
    };
    webUrl?: string;
    webPublicationDate?: string;
}
export interface NYTApiArticle {
    headline?: {
        main?: string;
    };
    abstract?: string;
    web_url?: string;
    pub_date?: string;
    source?: string;
}
export declare class NewsApiAdapter {
    private apiClient;
    constructor(apiClient: ApiClient);
    getTopHeadlines(params: {
        country?: string;
        category?: string;
        q?: string;
        pageSize?: number;
        page?: number;
    }): Promise<NewsApiArticle[]>;
    searchEverything(params: {
        q: string;
        from?: string;
        to?: string;
        language?: string;
        sortBy?: string;
        pageSize?: number;
        page?: number;
    }): Promise<NewsApiArticle[]>;
}
export declare class GuardianApiAdapter {
    private apiClient;
    constructor(apiClient: ApiClient);
    searchContent(params: {
        q: string;
        'show-fields'?: string;
        'page-size'?: number;
        page?: number;
        'from-date'?: string;
        'to-date'?: string;
        section?: string;
    }): Promise<GuardianApiArticle[]>;
    private getApiKeyFromClient;
}
export declare class NYTApiAdapter {
    private apiClient;
    constructor(apiClient: ApiClient);
    articleSearch(params: {
        q: string;
        fl?: string;
        fq?: string;
        sort?: string;
        page?: number;
        begin_date?: string;
        end_date?: string;
    }): Promise<NYTApiArticle[]>;
}
declare const _default: {
    ApiClient: typeof ApiClient;
    ApiClientError: typeof ApiClientError;
    NewsApiAdapter: typeof NewsApiAdapter;
    GuardianApiAdapter: typeof GuardianApiAdapter;
    NYTApiAdapter: typeof NYTApiAdapter;
};
export default _default;
//# sourceMappingURL=client.d.ts.map