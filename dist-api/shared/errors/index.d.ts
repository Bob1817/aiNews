export declare class AppError extends Error {
    statusCode: number;
    code: string;
    isOperational: boolean;
    constructor(message: string, statusCode?: number, code?: string, isOperational?: boolean);
}
export declare class ValidationError extends AppError {
    constructor(message: string, details?: any);
    details?: any;
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    constructor(resource?: string);
}
export declare class ConflictError extends AppError {
    constructor(message?: string);
}
export declare class RateLimitError extends AppError {
    constructor(message?: string);
}
export declare class ExternalApiError extends AppError {
    service: string;
    originalError?: Error | undefined;
    constructor(message: string, service: string, originalError?: Error | undefined);
}
export declare class DatabaseError extends AppError {
    operation: string;
    originalError?: Error | undefined;
    constructor(message: string, operation: string, originalError?: Error | undefined);
}
export declare class ErrorHandler {
    static handleSyncError(error: Error): never;
    static handleAsyncError<T>(promise: Promise<T>, context?: string): Promise<T>;
    static wrapAsync(fn: Function, context?: string): (...args: any[]) => any;
    static createErrorResponse(error: AppError, includeStackTrace?: boolean): any;
    static logError(error: Error, context?: any): void;
    static withRetry<T>(operation: () => Promise<T>, maxRetries?: number, delayMs?: number, context?: string): Promise<T>;
    static validateInput(input: any, rules: {
        required?: string[];
        minLength?: {
            [key: string]: number;
        };
        maxLength?: {
            [key: string]: number;
        };
        pattern?: {
            [key: string]: RegExp;
        };
    }): void;
}
declare const _default: {
    AppError: typeof AppError;
    ValidationError: typeof ValidationError;
    AuthenticationError: typeof AuthenticationError;
    AuthorizationError: typeof AuthorizationError;
    NotFoundError: typeof NotFoundError;
    ConflictError: typeof ConflictError;
    RateLimitError: typeof RateLimitError;
    ExternalApiError: typeof ExternalApiError;
    DatabaseError: typeof DatabaseError;
    ErrorHandler: typeof ErrorHandler;
};
export default _default;
//# sourceMappingURL=index.d.ts.map