import { Request, Response, NextFunction } from 'express';
export declare const securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
export declare const rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const corsConfig: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const validateInput: (validations: any[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const xssProtection: (req: Request, res: Response, next: NextFunction) => void;
export declare const sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const requestLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
export declare const securityCheck: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const securityMiddleware: ((req: Request, res: Response, next: NextFunction) => void)[];
declare const _default: {
    securityHeaders: (req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void;
    rateLimiter: import("express-rate-limit").RateLimitRequestHandler;
    corsConfig: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    validateInput: (validations: any[]) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
    xssProtection: (req: Request, res: Response, next: NextFunction) => void;
    sqlInjectionProtection: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    requestLogger: (req: Request, res: Response, next: NextFunction) => void;
    errorHandler: (error: Error, req: Request, res: Response, next: NextFunction) => void;
    securityCheck: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
    securityMiddleware: ((req: Request, res: Response, next: NextFunction) => void)[];
};
export default _default;
//# sourceMappingURL=security.d.ts.map