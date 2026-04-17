"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SavedNewsRepository = void 0;
const database_1 = require("../config/database");
class SavedNewsRepository {
    constructor() {
        Object.defineProperty(this, "supabase", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: (0, database_1.getSupabaseClient)()
        });
    }
    // 获取用户保存的所有新闻
    async getSavedNews(userId) {
        try {
            const { data, error } = await this.supabase
                .from('saved_news')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) {
                throw error;
            }
            return (data || []).map((item) => ({
                id: item.id,
                userId: item.user_id,
                title: item.title,
                content: item.content,
                originalNewsId: item.original_news_id,
                isPublished: item.is_published || false,
                publishedTo: item.published_to || [],
                categories: item.categories || [],
                industries: item.industries || [],
                createdAt: item.created_at,
                updatedAt: item.updated_at,
            }));
        }
        catch (error) {
            console.error('获取保存的新闻失败:', error);
            return [];
        }
    }
    // 根据ID获取保存的新闻
    async getSavedNewsById(id) {
        try {
            const { data, error } = await this.supabase
                .from('saved_news')
                .select('*')
                .eq('id', id)
                .single();
            if (error || !data) {
                return null;
            }
            return {
                id: data.id,
                userId: data.user_id,
                title: data.title,
                content: data.content,
                originalNewsId: data.original_news_id,
                isPublished: data.is_published || false,
                publishedTo: data.published_to || [],
                categories: data.categories || [],
                industries: data.industries || [],
                createdAt: data.created_at,
                updatedAt: data.updated_at,
            };
        }
        catch (error) {
            console.error('获取保存的新闻失败:', error);
            return null;
        }
    }
    // 保存新闻
    async saveNews(userId, data) {
        try {
            const { data: newData, error } = await this.supabase
                .from('saved_news')
                .insert({
                user_id: userId,
                title: data.title,
                content: data.content,
                original_news_id: data.originalNewsId,
                is_published: false,
                published_to: [],
                categories: data.categories || [],
                industries: data.industries || [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
                .select()
                .single();
            if (error) {
                throw error;
            }
            return {
                id: newData.id,
                userId: newData.user_id,
                title: newData.title,
                content: newData.content,
                originalNewsId: newData.original_news_id,
                isPublished: newData.is_published || false,
                publishedTo: newData.published_to || [],
                categories: newData.categories || [],
                industries: newData.industries || [],
                createdAt: newData.created_at,
                updatedAt: newData.updated_at,
            };
        }
        catch (error) {
            console.error('保存新闻失败:', error);
            return null;
        }
    }
    // 更新保存的新闻
    async updateNews(id, data) {
        try {
            const { data: updatedData, error } = await this.supabase
                .from('saved_news')
                .update({
                title: data.title,
                content: data.content,
                categories: data.categories,
                industries: data.industries,
                updated_at: new Date().toISOString(),
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                throw error;
            }
            return {
                id: updatedData.id,
                userId: updatedData.user_id,
                title: updatedData.title,
                content: updatedData.content,
                originalNewsId: updatedData.original_news_id,
                isPublished: updatedData.is_published || false,
                publishedTo: updatedData.published_to || [],
                categories: updatedData.categories || [],
                industries: updatedData.industries || [],
                createdAt: updatedData.created_at,
                updatedAt: updatedData.updated_at,
            };
        }
        catch (error) {
            console.error('更新新闻失败:', error);
            return null;
        }
    }
    // 更新发布状态
    async updatePublishStatus(id, platforms) {
        try {
            const { data: updatedData, error } = await this.supabase
                .from('saved_news')
                .update({
                is_published: true,
                published_to: platforms,
                updated_at: new Date().toISOString(),
            })
                .eq('id', id)
                .select()
                .single();
            if (error) {
                throw error;
            }
            return {
                id: updatedData.id,
                userId: updatedData.user_id,
                title: updatedData.title,
                content: updatedData.content,
                originalNewsId: updatedData.original_news_id,
                isPublished: updatedData.is_published || false,
                publishedTo: updatedData.published_to || [],
                categories: updatedData.categories || [],
                industries: updatedData.industries || [],
                createdAt: updatedData.created_at,
                updatedAt: updatedData.updated_at,
            };
        }
        catch (error) {
            console.error('更新发布状态失败:', error);
            return null;
        }
    }
}
exports.SavedNewsRepository = SavedNewsRepository;
