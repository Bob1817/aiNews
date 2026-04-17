import { Request, Response, NextFunction } from 'express';
export interface JwtPayload {
    userId: string;
    email: string;
    role?: string;
    iat?: number;
    exp?: number;
}
export declare class AuthError extends Error {
    statusCode: number;
    code: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare const authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitExempt: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireUser: (req: Request, res: Response, next: NextFunction) => void;
export declare const checkSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authMiddleware: {
    authenticate: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    requireRole: (...roles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
    requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
    refreshToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    rateLimitExempt: (req: Request, res: Response, next: NextFunction) => void;
    requireUser: (req: Request, res: Response, next: NextFunction) => void;
    checkSession: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export default authMiddleware;
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
            rateLimitExempt?: boolean;
            session?: {
                lastActivity: number;
                [key: string]: any;
            };
        }
    }
}
//# sourceMappingURL=auth.d.ts.map