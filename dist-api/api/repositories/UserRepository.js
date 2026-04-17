"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const database_1 = require("../config/database");
class UserRepository {
    constructor() {
        Object.defineProperty(this, "supabase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, database_1.getSupabaseClient)()
        });
    }
    // 获取用户资料
    async getProfile(userId) {
        try {
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', userId)
                .single();
            if (error || !data) {
                return null;
            }
            return {
                id: data.id,
                userId: data.user_id,
                industries: data.industries || [],
                keywords: data.keywords || [],
                isOnboardingComplete: data.is_onboarding_complete || false,
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        }
        catch (error) {
            console.error('获取用户资料失败:', error);
            return null;
        }
    }
    // 更新用户资料
    async updateProfile(userId, data) {
        try {
            // 首先检查是否存在用户资料
            const existingProfile = await this.getProfile(userId);
            const updateData = {
                industries: data.industries,
                keywords: data.keywords,
                is_onboarding_complete: data.isOnboardingComplete,
                updated_at: new Date().toISOString(),
            };
            if (existingProfile) {
                // 更新现有资料
                const { data: updatedData, error } = await this.supabase
                    .from('user_profiles')
                    .update(updateData)
                    .eq('user_id', userId)
                    .select()
                    .single();
                if (error) {
                    throw error;
                }
                return {
                    id: updatedData.id,
                    userId: updatedData.user_id,
                    industries: updatedData.industries || [],
                    keywords: updatedData.keywords || [],
                    isOnboardingComplete: updatedData.is_onboarding_complete || false,
                    createdAt: updatedData.created_at,
                    updatedAt: updatedData.updated_at,
                };
            }
            else {
                // 创建新资料
                const { data: newData, error } = await this.supabase
                    .from('user_profiles')
                    .insert({
                    user_id: userId,
                    ...updateData,
                    created_at: new Date().toISOString(),
                })
                    .select()
                    .single();
                if (error) {
                    throw error;
                }
                return {
                    id: newData.id,
                    userId: newData.user_id,
                    industries: newData.industries || [],
                    keywords: newData.keywords || [],
                    isOnboardingComplete: newData.is_onboarding_complete || false,
                    createdAt: newData.created_at,
                    updatedAt: newData.updated_at,
                };
            }
        }
        catch (error) {
            console.error('更新用户资料失败:', error);
            return null;
        }
    }
}
exports.UserRepository = UserRepository;
