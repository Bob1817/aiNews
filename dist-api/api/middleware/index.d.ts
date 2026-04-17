export * from './security';
export * from './auth';
export * from './validators';
import securityMiddleware from './security';
import authMiddleware from './auth';
import validators from './validators';
export { securityMiddleware, authMiddleware, validators };
declare const _default: {
    security: {
        securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
        rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
        corsConfig: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => import("express").Response<any, Record<string, any>> | undefined;
        validateInput: (validations: any[]) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
        xssProtection: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        sqlInjectionProtection: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => import("express").Response<any, Record<string, any>> | undefined;
        requestLogger: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        errorHandler: (error: Error, req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        securityCheck: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => import("express").Response<any, Record<string, any>> | undefined;
        securityMiddleware: ((req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void)[];
    };
    auth: {
        authenticate: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
        requireRole: (...roles: string[]) => (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        requireAdmin: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        refreshToken: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
        optionalAuth: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
        rateLimitExempt: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        requireUser: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => void;
        checkSession: (req: import("express").Request, res: import("express").Response, next: import("express").NextFunction) => Promise<void>;
    };
    validators: {
        user: {
            register: import("express-validator").ValidationChain[];
            login: import("express-validator").ValidationChain[];
            updateProfile: import("express-validator").ValidationChain[];
        };
        news: {
            create: import("express-validator").ValidationChain[];
            update: import("express-validator").ValidationChain[];
            getById: import("express-validator").ValidationChain[];
            list: import("express-validator").ValidationChain[];
        };
        savedNews: {
            save: import("express-validator").ValidationChain[];
            remove: import("express-validator").ValidationChain[];
        };
        category: {
            create: import("express-validator").ValidationChain[];
            update: import("express-validator").ValidationChain[];
        };
        aiConfig: {
            update: import("express-validator").ValidationChain[];
        };
        newsApiConfig: {
            update: import("express-validator").ValidationChain[];
        };
        chat: {
            sendMessage: import("express-validator").ValidationChain[];
        };
        common: {
            idParam: import("express-validator").ValidationChain[];
            pagination: import("express-validator").ValidationChain[];
            search: import("express-validator").ValidationChain[];
        };
    };
};
export default _default;
//# sourceMappingURL=index.d.ts.map