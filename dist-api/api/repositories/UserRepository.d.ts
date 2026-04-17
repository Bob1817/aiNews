import { UserProfile } from '../../shared/types';
export declare class UserRepository {
    private supabase;
    getProfile(userId: string): Promise<UserProfile | null>;
    updateProfile(userId: string, data: {
        industries?: string[];
        keywords?: string[];
        isOnboardingComplete?: boolean;
    }): Promise<UserProfile | null>;
}
//# sourceMappingURL=UserRepository.d.ts.map