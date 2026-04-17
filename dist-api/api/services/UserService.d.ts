import { User, UserProfile } from '../../shared/types';
export declare class UserService {
    private static users;
    private static userProfiles;
    private userRepository;
    private useDatabase;
    constructor();
    private initializeMockData;
    getProfile(userId: string): Promise<UserProfile>;
    updateProfile(data: {
        userId: string;
        industries?: string[];
        keywords?: string[];
        isOnboardingComplete?: boolean;
    }): Promise<UserProfile>;
    getUserByEmail(email: string): Promise<User | null>;
    private hashPassword;
    private verifyPassword;
    private toSafeUser;
    register(data: {
        name: string;
        email: string;
        password: string;
    }): Promise<{
        user: User;
        profile: UserProfile;
    }>;
    login(data: {
        email: string;
        password: string;
    }): Promise<{
        user: User;
        profile: UserProfile;
    }>;
}
//# sourceMappingURL=UserService.d.ts.map