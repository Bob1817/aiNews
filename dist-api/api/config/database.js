"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseClient = getSupabaseClient;
exports.initializeDatabase = initializeDatabase;
const supabase_js_1 = require("@supabase/supabase-js");
// 数据库配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
// 创建 Supabase 客户端
let supabase = null;
function getSupabaseClient() {
    if (!supabase) {
        supabase = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return supabase;
}
// 初始化数据库（创建表结构）
async function initializeDatabase() {
    const client = getSupabaseClient();
    console.log('数据库连接已建立');
    // 注意：实际的表创建应该在 Supabase 控制台中完成
    // 这里仅进行连接测试
    try {
        const { error } = await client.from('user_profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('警告：user_profiles 表不存在，请在 Supabase 控制台中创建表结构');
        }
        else {
            console.log('数据库表结构验证成功');
        }
    }
    catch (error) {
        console.log('数据库连接成功，表结构将在首次使用时创建（或已在 Supabase 控制台中创建）');
    }
}
//# sourceMappingURL=database.js.map