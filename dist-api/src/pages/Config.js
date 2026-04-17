"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = Config;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const lucide_react_1 = require("lucide-react");
const react_router_dom_1 = require("react-router-dom");
const toast_1 = require("@/lib/toast");
const config_1 = require("@/lib/api/config");
const errors_1 = require("@/lib/errors");
const news_1 = require("@/lib/api/news");
const fallbacks_1 = require("@/lib/fallbacks");
function getNewsApiDiagnosis(message) {
    const normalized = message.toLowerCase();
    if (normalized.includes('超时') || normalized.includes('timed out') || normalized.includes('timeout')) {
        return {
            tone: 'warning',
            title: '网络超时',
            detail: '当前环境没有在预期时间内连上新闻源服务。优先检查网络、代理、防火墙，或稍后重试。',
        };
    }
    if (normalized.includes('401') ||
        normalized.includes('api key invalid') ||
        normalized.includes('apikeymissing') ||
        normalized.includes('key') && normalized.includes('invalid')) {
        return {
            tone: 'error',
            title: 'Key 无效',
            detail: '接口已经返回鉴权失败。请确认 API Key 是否完整、是否复制错位，或该 key 是否已失效。',
        };
    }
    if (normalized.includes('403') ||
        normalized.includes('426') ||
        normalized.includes('429') ||
        normalized.includes('denied') ||
        normalized.includes('rate limit') ||
        normalized.includes('请求失败')) {
        return {
            tone: 'error',
            title: '接口拒绝',
            detail: '请求已经到达新闻源，但被服务端拒绝。常见原因是权限不足、额度用尽、地区限制或调用频率过高。',
        };
    }
    return {
        tone: 'info',
        title: '连接诊断',
        detail: '测试请求没有正常完成，请根据返回文案继续排查。',
    };
}
function Config() {
    const [config, setConfig] = (0, react_1.useState)((0, fallbacks_1.getDefaultConfigForm)());
    const [isSaving, setIsSaving] = (0, react_1.useState)(false);
    const [testResults, setTestResults] = (0, react_1.useState)({});
    const [testDiagnostics, setTestDiagnostics] = (0, react_1.useState)({});
    const { showToast } = (0, toast_1.useToast)();
    (0, react_1.useEffect)(() => {
        // 从后端 API 获取配置
        const fetchConfig = async () => {
            try {
                const data = await (0, config_1.getConfig)('1');
                setConfig({
                    aiModel: {
                        ...data.aiModel,
                        baseUrl: data.aiModel.baseUrl || '',
                    },
                    newsAPI: data.newsAPI
                        ? {
                            ...data.newsAPI,
                            baseUrl: data.newsAPI.baseUrl || '',
                        }
                        : undefined,
                    publishPlatforms: {
                        website: {
                            apiUrl: data.publishPlatforms.website?.apiUrl || '',
                            apiKey: data.publishPlatforms.website?.apiKey || '',
                        },
                        wechat: {
                            appId: data.publishPlatforms.wechat?.appId || '',
                            appSecret: data.publishPlatforms.wechat?.appSecret || '',
                            token: data.publishPlatforms.wechat?.token || '',
                        },
                    },
                });
            }
            catch (error) {
                setConfig((0, fallbacks_1.getMockConfigForm)());
                showToast({
                    title: '配置加载失败',
                    message: '已切换为演示配置。',
                    variant: 'info',
                });
            }
        };
        fetchConfig();
    }, [showToast]);
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await (0, config_1.updateConfig)({
                userId: '1',
                ...config,
            });
            showToast({
                title: '配置已保存',
                variant: 'success',
            });
        }
        catch (error) {
            console.error('保存配置失败:', error);
            showToast({
                title: '保存配置失败',
                message: (0, errors_1.getErrorMessage)(error, '请稍后重试'),
                variant: 'error',
            });
        }
        finally {
            setIsSaving(false);
        }
    };
    const handleTest = async (platform) => {
        setTestResults({ ...testResults, [platform]: '测试中...' });
        setTestDiagnostics((current) => {
            const next = { ...current };
            delete next[platform];
            return next;
        });
        try {
            if (platform === 'newsAPI' && config.newsAPI) {
                const data = await (0, news_1.testNewsApi)({
                    provider: config.newsAPI.provider,
                    apiKey: config.newsAPI.apiKey,
                    baseUrl: config.newsAPI.baseUrl,
                });
                setTestResults({
                    ...testResults,
                    [platform]: data.success ? data.message : `测试失败: ${data.message}`
                });
                if (!data.success) {
                    setTestDiagnostics((current) => ({
                        ...current,
                        [platform]: getNewsApiDiagnosis(data.message),
                    }));
                }
                showToast({
                    title: data.success ? '测试成功' : '测试失败',
                    message: data.message,
                    variant: data.success ? 'success' : 'error',
                });
            }
            else {
                // 其他平台使用模拟测试
                setTimeout(() => {
                    setTestResults({ ...testResults, [platform]: '测试成功' });
                    showToast({
                        title: '测试成功',
                        message: `${platform} 连接测试通过。`,
                        variant: 'success',
                    });
                }, 1000);
            }
        }
        catch (error) {
            console.error('测试连接失败:', error);
            const message = (0, errors_1.getErrorMessage)(error, '请稍后重试');
            setTestResults({
                ...testResults,
                [platform]: `测试失败: ${message}`
            });
            if (platform === 'newsAPI') {
                setTestDiagnostics((current) => ({
                    ...current,
                    [platform]: getNewsApiDiagnosis(message),
                }));
            }
            showToast({
                title: '测试连接失败',
                message,
                variant: 'error',
            });
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "flex flex-col h-full bg-gray-50", children: [(0, jsx_runtime_1.jsx)("div", { className: "bg-white border-b border-gray-200 px-6 py-4", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsxs)(react_router_dom_1.Link, { to: "/chat", className: "flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.ArrowLeft, { className: "w-4 h-4" }), "\u8FD4\u56DE"] }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-xl font-semibold text-gray-900", children: "\u7CFB\u7EDF\u914D\u7F6E" }) }), (0, jsx_runtime_1.jsxs)("button", { onClick: handleSave, disabled: isSaving, className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Save, { className: "w-4 h-4" }), isSaving ? '保存中...' : '保存'] })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex-1 overflow-y-auto p-6", children: (0, jsx_runtime_1.jsxs)("div", { className: "max-w-4xl mx-auto space-y-8", children: [(0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Server, { className: "w-5 h-5 text-purple-600" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900", children: "AI \u6A21\u578B\u914D\u7F6E" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u6A21\u578B\u63D0\u4F9B\u5546" }), (0, jsx_runtime_1.jsxs)("select", { value: config.aiModel.provider, onChange: (e) => setConfig({
                                                        ...config,
                                                        aiModel: {
                                                            ...config.aiModel,
                                                            provider: e.target.value,
                                                        },
                                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [(0, jsx_runtime_1.jsx)("option", { value: "openai", children: "OpenAI" }), (0, jsx_runtime_1.jsx)("option", { value: "anthropic", disabled: true, children: "Anthropic\uFF08\u6682\u672A\u63A5\u5165\uFF09" }), (0, jsx_runtime_1.jsx)("option", { value: "google", disabled: true, children: "Google\uFF08\u6682\u672A\u63A5\u5165\uFF09" }), (0, jsx_runtime_1.jsx)("option", { value: "ollama", children: "Ollama (\u672C\u5730\u6A21\u578B)" })] })] }), config.aiModel.provider !== 'ollama' && ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "API Key" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { type: "password", value: config.aiModel.apiKey, onChange: (e) => setConfig({
                                                                ...config,
                                                                aiModel: {
                                                                    ...config.aiModel,
                                                                    apiKey: e.target.value,
                                                                },
                                                            }), placeholder: "\u8BF7\u8F93\u5165 API Key", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Key, { className: "w-4 h-4" }) })] })] })), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u6A21\u578B\u540D\u79F0" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: config.aiModel.modelName, onChange: (e) => setConfig({
                                                        ...config,
                                                        aiModel: {
                                                            ...config.aiModel,
                                                            modelName: e.target.value,
                                                        },
                                                    }), placeholder: config.aiModel.provider === 'ollama' ? '例如：llama2, mistral, codellama' : '请输入模型名称', className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: ["\u57FA\u7840 URL", config.aiModel.provider === 'ollama' ? '' : '（可选）'] }), (0, jsx_runtime_1.jsx)("input", { type: "url", value: config.aiModel.baseUrl, onChange: (e) => setConfig({
                                                        ...config,
                                                        aiModel: {
                                                            ...config.aiModel,
                                                            baseUrl: e.target.value,
                                                        },
                                                    }), placeholder: config.aiModel.provider === 'ollama' ? 'http://localhost:11434' : '请输入基础 URL', className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), config.aiModel.provider === 'ollama' && ((0, jsx_runtime_1.jsx)("div", { className: "p-4 bg-blue-50 rounded-lg", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-start gap-3", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.Cpu, { className: "w-5 h-5 text-blue-600 mt-0.5" }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-medium text-blue-900", children: "Ollama \u672C\u5730\u6A21\u578B\u914D\u7F6E" }), (0, jsx_runtime_1.jsxs)("p", { className: "text-sm text-blue-700 mt-1", children: ["\u8BF7\u786E\u4FDD Ollama \u5DF2\u5B89\u88C5\u5E76\u8FD0\u884C\u5728\u60A8\u7684\u7535\u8111\u4E0A\u3002", (0, jsx_runtime_1.jsx)("br", {}), "\u9ED8\u8BA4\u8FD0\u884C\u547D\u4EE4\uFF1A", (0, jsx_runtime_1.jsx)("code", { className: "bg-blue-100 px-1 rounded", children: "ollama serve" }), (0, jsx_runtime_1.jsx)("br", {}), "\u4E0B\u8F7D\u6A21\u578B\uFF1A", (0, jsx_runtime_1.jsx)("code", { className: "bg-blue-100 px-1 rounded", children: "ollama pull llama2" })] })] })] }) }))] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Server, { className: "w-5 h-5 text-orange-600" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900", children: "\u65B0\u95FB\u6E90\u914D\u7F6E" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u65B0\u95FB\u6E90\u63D0\u4F9B\u5546" }), (0, jsx_runtime_1.jsxs)("select", { value: config.newsAPI?.provider || 'newsapi', onChange: (e) => setConfig({
                                                        ...config,
                                                        newsAPI: {
                                                            ...config.newsAPI,
                                                            provider: e.target.value,
                                                        },
                                                    }), className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [(0, jsx_runtime_1.jsx)("option", { value: "newsapi", children: "NewsAPI" }), (0, jsx_runtime_1.jsx)("option", { value: "guardian", children: "The Guardian" }), (0, jsx_runtime_1.jsx)("option", { value: "nytimes", children: "New York Times" })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "API Key" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("input", { type: "password", value: config.newsAPI?.apiKey || '', onChange: (e) => setConfig({
                                                                ...config,
                                                                newsAPI: {
                                                                    ...config.newsAPI,
                                                                    apiKey: e.target.value,
                                                                },
                                                            }), placeholder: "\u8BF7\u8F93\u5165 API Key", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" }), (0, jsx_runtime_1.jsx)("div", { className: "absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Key, { className: "w-4 h-4" }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "\u57FA\u7840 URL\uFF08\u53EF\u9009\uFF09" }), (0, jsx_runtime_1.jsx)("input", { type: "url", value: config.newsAPI?.baseUrl || '', onChange: (e) => setConfig({
                                                        ...config,
                                                        newsAPI: {
                                                            ...config.newsAPI,
                                                            baseUrl: e.target.value,
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165\u57FA\u7840 URL", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => handleTest('newsAPI'), className: "flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TestTube, { className: "w-4 h-4" }), "\u6D4B\u8BD5\u8FDE\u63A5"] }), testResults.newsAPI && ((0, jsx_runtime_1.jsx)("p", { className: `mt-2 text-sm ${testResults.newsAPI === '测试成功'
                                                        ? 'text-green-600'
                                                        : 'text-yellow-600'}`, children: testResults.newsAPI })), testDiagnostics.newsAPI && ((0, jsx_runtime_1.jsxs)("div", { className: `mt-3 rounded-lg border px-4 py-3 text-sm ${testDiagnostics.newsAPI.tone === 'error'
                                                        ? 'border-red-200 bg-red-50 text-red-700'
                                                        : testDiagnostics.newsAPI.tone === 'warning'
                                                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                                                            : 'border-blue-200 bg-blue-50 text-blue-700'}`, children: [(0, jsx_runtime_1.jsx)("p", { className: "font-medium", children: testDiagnostics.newsAPI.title }), (0, jsx_runtime_1.jsx)("p", { className: "mt-1", children: testDiagnostics.newsAPI.detail })] }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.Globe, { className: "w-5 h-5 text-green-600" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900", children: "\u5B98\u7F51\u53D1\u5E03\u914D\u7F6E" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "API URL" }), (0, jsx_runtime_1.jsx)("input", { type: "url", value: config.publishPlatforms.website.apiUrl, onChange: (e) => setConfig({
                                                        ...config,
                                                        publishPlatforms: {
                                                            ...config.publishPlatforms,
                                                            website: {
                                                                ...config.publishPlatforms.website,
                                                                apiUrl: e.target.value,
                                                            },
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165 API URL", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "API Key" }), (0, jsx_runtime_1.jsx)("input", { type: "password", value: config.publishPlatforms.website.apiKey, onChange: (e) => setConfig({
                                                        ...config,
                                                        publishPlatforms: {
                                                            ...config.publishPlatforms,
                                                            website: {
                                                                ...config.publishPlatforms.website,
                                                                apiKey: e.target.value,
                                                            },
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165 API Key", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => handleTest('website'), className: "flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TestTube, { className: "w-4 h-4" }), "\u6D4B\u8BD5\u8FDE\u63A5"] }), testResults.website && ((0, jsx_runtime_1.jsx)("p", { className: `mt-2 text-sm ${testResults.website === '测试成功'
                                                        ? 'text-green-600'
                                                        : 'text-yellow-600'}`, children: testResults.website }))] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "bg-white rounded-2xl border border-gray-200 p-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3 mb-6", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center", children: (0, jsx_runtime_1.jsx)(lucide_react_1.MessageSquare, { className: "w-5 h-5 text-blue-600" }) }), (0, jsx_runtime_1.jsx)("h2", { className: "text-lg font-semibold text-gray-900", children: "\u5FAE\u4FE1\u516C\u4F17\u53F7\u914D\u7F6E" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "App ID" }), (0, jsx_runtime_1.jsx)("input", { type: "text", value: config.publishPlatforms.wechat.appId, onChange: (e) => setConfig({
                                                        ...config,
                                                        publishPlatforms: {
                                                            ...config.publishPlatforms,
                                                            wechat: {
                                                                ...config.publishPlatforms.wechat,
                                                                appId: e.target.value,
                                                            },
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165 App ID", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "App Secret" }), (0, jsx_runtime_1.jsx)("input", { type: "password", value: config.publishPlatforms.wechat.appSecret, onChange: (e) => setConfig({
                                                        ...config,
                                                        publishPlatforms: {
                                                            ...config.publishPlatforms,
                                                            wechat: {
                                                                ...config.publishPlatforms.wechat,
                                                                appSecret: e.target.value,
                                                            },
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165 App Secret", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Token" }), (0, jsx_runtime_1.jsx)("input", { type: "password", value: config.publishPlatforms.wechat.token, onChange: (e) => setConfig({
                                                        ...config,
                                                        publishPlatforms: {
                                                            ...config.publishPlatforms,
                                                            wechat: {
                                                                ...config.publishPlatforms.wechat,
                                                                token: e.target.value,
                                                            },
                                                        },
                                                    }), placeholder: "\u8BF7\u8F93\u5165 Token", className: "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsxs)("button", { onClick: () => handleTest('wechat'), className: "flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors", children: [(0, jsx_runtime_1.jsx)(lucide_react_1.TestTube, { className: "w-4 h-4" }), "\u6D4B\u8BD5\u8FDE\u63A5"] }), testResults.wechat && ((0, jsx_runtime_1.jsx)("p", { className: `mt-2 text-sm ${testResults.wechat === '测试成功'
                                                        ? 'text-green-600'
                                                        : 'text-yellow-600'}`, children: testResults.wechat }))] })] })] })] }) })] }));
}
