import { Request, Response } from 'express';
export declare class UserController {
    private userService;
    constructor();
    getProfile(req: Request, res: Response): Promise<void>;
    updateProfile(req: Request, res: Response): Promise<void>;
    register(req: Request, res: Response): Promise<void>;
    login(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=UserController.d.ts.map