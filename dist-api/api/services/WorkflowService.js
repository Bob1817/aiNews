"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowService = void 0;
function createTimestamp() {
    return new Date().toISOString();
}
function createBuiltInNewsWorkflow() {
    const now = createTimestamp();
    return {
        id: 'workflow-news-assistant',
        name: 'news-assistant',
        displayName: '新闻助手',
        description: '围绕新闻素材进行提炼、改写、扩写、摘要与成稿输出的内置工作流。',
        invocation: {
            primary: '/新闻助手',
            aliases: ['/+新闻助手', '/news-assistant', '/+news-assistant'],
            examples: [
                '/新闻助手 基于今天的 AI 医疗新闻写一篇公众号导语',
                '/+news-assistant 帮我整理这条新闻的三段式摘要',
            ],
        },
        systemInstruction: '你是 AI 助手中的内置新闻助手工作流。必须严格围绕给定新闻材料和工作流步骤执行，优先产出专业、准确、可直接继续编辑的新闻内容。',
        steps: [
            {
                id: 'understand-brief',
                title: '理解任务',
                instruction: '提炼用户目标、受众、文风和交付格式；如果新闻素材存在，先识别核心事实与主题。',
            },
            {
                id: 'structure-output',
                title: '规划结构',
                instruction: '在写作前先确定输出结构，保持信息密度、逻辑顺序与标题层级清晰。',
            },
            {
                id: 'draft-content',
                title: '生成内容',
                instruction: '输出新闻草稿、摘要或改写内容，确保语句自然、专业且可直接使用。',
                expectedOutput: '返回可直接复制的 Markdown 或纯文本内容。',
            },
        ],
        inputSchema: [
            { name: 'task', type: 'textarea', label: '任务说明', required: true, placeholder: '例如：写一篇简讯、摘要或评论导语' },
            { name: 'tone', type: 'text', label: '风格要求', placeholder: '例如：专业、简洁、公众号风格' },
        ],
        outputSchema: [
            { name: 'content', type: 'textarea', label: '生成内容', required: true },
            { name: 'highlights', type: 'tags', label: '重点要点' },
        ],
        constraints: [
            '不得编造未经提供的事实数据。',
            '若引用新闻素材，优先保留关键事实、时间与主体。',
            '输出应直接围绕用户任务，不额外展开无关解释。',
        ],
        tools: ['chat', 'news-reference', 'draft-save'],
        capabilities: ['news-summary', 'rewrite', 'drafting', 'briefing'],
        examples: [
            '把新闻改写成 300 字简讯',
            '生成 3 个标题备选',
            '输出一篇适合内部晨会播报的摘要',
        ],
        extensionNotes: '后续可扩展更多新闻领域模板，例如行业快报、公众号稿件、短视频口播稿。',
        isBuiltIn: true,
        executionMode: 'ai',
        status: 'active',
        createdAt: now,
        updatedAt: now,
    };
}
function createBuiltInNewsDigestWorkflow() {
    const now = createTimestamp();
    return {
        id: 'workflow-news-digest',
        name: 'news-digest',
        displayName: '新闻推送',
        description: '把对话输入内容和用户偏好一起作为 AI 爬虫关键词，抓取互联网上的相关新闻并在对话中汇总展示。',
        invocation: {
            primary: '/新闻推送',
            aliases: ['/+新闻推送', '/news-digest', '/+news-digest'],
            examples: [
                '/新闻推送',
                '/+新闻推送 帮我抓取和人工智能医疗相关的最新新闻',
            ],
        },
        systemInstruction: '你是 AI 助手中的内置新闻推送工作流。必须把用户在对话中输入的内容优先解析为 AI 爬虫关键词，并结合用户长期偏好去抓取互联网上的相关新闻，再整理成简洁可读的新闻简报。',
        steps: [
            {
                id: 'parse-conversation-keywords',
                title: '解析对话关键词',
                instruction: '先从当前对话输入中提炼本次新闻抓取关键词和关注方向，再与用户长期偏好合并。',
            },
            {
                id: 'ai-crawl-news',
                title: '执行 AI 爬虫',
                instruction: '使用解析后的关键词发起 AI 爬虫抓取，优先返回与对话目标最相关、时效性更高的新闻。',
            },
            {
                id: 'format-digest',
                title: '整理简报',
                instruction: '以办公场景友好的结构输出新闻简报，包含标题、来源、摘要和关联关键词，并明确本次抓取用了哪些关键词。',
                expectedOutput: '输出 Markdown 列表或编号摘要，便于直接浏览和继续追问。',
            },
        ],
        inputSchema: [
            { name: 'focus', type: 'text', label: '抓取关键词', placeholder: '例如：AI 医疗、机器人、自动驾驶、某家公司' },
        ],
        outputSchema: [
            { name: 'digest', type: 'textarea', label: '新闻简报', required: true },
        ],
        constraints: [
            '优先使用当前对话里给出的关键词作为抓取条件。',
            '在用户未提供明确关键词时，再回退到用户偏好配置。',
            '输出应以简报形式呈现，不展示实现过程。',
            '如果暂无足够结果，要明确说明并给出下一步建议。',
        ],
        tools: ['ai-crawler', 'news-fetch'],
        capabilities: ['news-digest', 'keyword-briefing', 'ai-crawling'],
        examples: [
            '返回今天与人工智能和医疗诊断相关的 5 条新闻',
            '根据我在对话里输入的公司名抓取相关新闻并汇总',
        ],
        extensionNotes: '该工作流以 AI 爬虫为核心执行方式，后续可扩展到更真实的网页抓取、信源打分和主题去重。',
        isBuiltIn: true,
        executionMode: 'ai',
        status: 'active',
        createdAt: now,
        updatedAt: now,
    };
}
function createBuiltInTaxReportWorkflow() {
    const now = createTimestamp();
    return {
        id: 'workflow-tax-report',
        name: 'tax-report',
        displayName: '个税报表',
        description: '上传包含发放记录表和结算发放表的文件夹，按身份证号聚合并生成标准个税申报表。',
        invocation: {
            primary: '/个税报表',
            aliases: ['/+个税报表', '/tax-report', '/+tax-report'],
            examples: [
                '/个税报表 生成本月个税申报表',
                '/+tax-report 请根据上传文件夹生成标准申报表',
            ],
        },
        systemInstruction: '你是 AI 助手中的内置个税报表工作流。该工作流不依赖大模型生成内容，必须严格按固定 Excel 规则处理上传文件并返回标准个税申报表。',
        steps: [
            {
                id: 'validate-input-folder',
                title: '校验输入',
                instruction: '确认用户已上传文件夹中的 Excel 文件，且至少识别到一个发放记录表。',
            },
            {
                id: 'merge-tax-data',
                title: '合并数据',
                instruction: '以发放记录表为主数据，按身份证号聚合，并将结算发放表中的收入与社保数据按规则合并。',
            },
            {
                id: 'export-template',
                title: '生成申报表',
                instruction: '使用固定个税申报表模板生成结果文件；模板字段不可改动，缺失值填 0.00。',
                expectedOutput: '返回可下载的标准个税申报表文件。',
            },
        ],
        inputSchema: [
            { name: 'task', type: 'textarea', label: '任务说明', placeholder: '例如：生成 2026 年 3 月个税申报表' },
        ],
        outputSchema: [{ name: 'file', type: 'text', label: '申报表文件', required: true }],
        constraints: [
            '必须至少存在一个发放记录表，否则直接报错。',
            '不可依赖文件名识别表格类型，必须按表头结构识别。',
            '个税申报表模板字段不可修改。',
            '缺失数据必须填 0.00，同一身份证号码多条数据必须合并累加。',
        ],
        tools: ['workspace-upload', 'excel-processing', 'file-download'],
        capabilities: ['tax-report', 'excel-merge', 'template-export'],
        examples: [
            '上传一个包含多个 Excel 的文件夹，自动生成个税申报表',
            '同身份证多条记录自动合并后导出标准模板',
        ],
        extensionNotes: '该工作流为固定规则流程，后续可扩展更完整的字段映射与校验报告。',
        isBuiltIn: true,
        executionMode: 'local',
        status: 'active',
        createdAt: now,
        updatedAt: now,
    };
}
class WorkflowService {
    async listWorkflows() {
        return [...WorkflowService.workflows].sort((a, b) => {
            if (a.isBuiltIn !== b.isBuiltIn) {
                return a.isBuiltIn ? -1 : 1;
            }
            return a.displayName.localeCompare(b.displayName, 'zh-CN');
        });
    }
    async getWorkflowById(id) {
        return WorkflowService.workflows.find((workflow) => workflow.id === id) || null;
    }
    async createWorkflow(input) {
        this.validateWorkflowInput(input);
        const now = createTimestamp();
        const workflow = {
            id: `workflow-${Date.now()}`,
            name: String(input.name).trim(),
            displayName: String(input.displayName).trim(),
            description: String(input.description).trim(),
            invocation: {
                primary: this.normalizeInvocation(String(input.invocation?.primary || `/${input.displayName}`)),
                aliases: (input.invocation?.aliases || []).map((item) => this.normalizeInvocation(item)),
                examples: input.invocation?.examples || [],
            },
            systemInstruction: String(input.systemInstruction || '').trim(),
            steps: input.steps || [],
            inputSchema: input.inputSchema || [],
            outputSchema: input.outputSchema || [],
            constraints: input.constraints || [],
            tools: input.tools || [],
            capabilities: input.capabilities || [],
            examples: input.examples || [],
            extensionNotes: String(input.extensionNotes || '').trim(),
            isBuiltIn: false,
            executionMode: input.executionMode || 'ai',
            status: input.status === 'draft' ? 'draft' : 'active',
            createdAt: now,
            updatedAt: now,
        };
        WorkflowService.workflows.push(workflow);
        return workflow;
    }
    async updateWorkflow(id, input) {
        const index = WorkflowService.workflows.findIndex((workflow) => workflow.id === id);
        if (index === -1) {
            throw new Error('工作流不存在');
        }
        const existing = WorkflowService.workflows[index];
        if (existing.isBuiltIn) {
            throw new Error('内置工作流不支持编辑');
        }
        const merged = {
            ...existing,
            ...input,
            name: String(input.name ?? existing.name).trim(),
            displayName: String(input.displayName ?? existing.displayName).trim(),
            description: String(input.description ?? existing.description).trim(),
            systemInstruction: String(input.systemInstruction ?? existing.systemInstruction).trim(),
            extensionNotes: String(input.extensionNotes ?? existing.extensionNotes).trim(),
            invocation: {
                primary: this.normalizeInvocation(String(input.invocation?.primary || existing.invocation.primary)),
                aliases: (input.invocation?.aliases || existing.invocation.aliases).map((item) => this.normalizeInvocation(item)),
                examples: input.invocation?.examples || existing.invocation.examples,
            },
            steps: input.steps || existing.steps,
            inputSchema: input.inputSchema || existing.inputSchema,
            outputSchema: input.outputSchema || existing.outputSchema,
            constraints: input.constraints || existing.constraints,
            tools: input.tools || existing.tools,
            capabilities: input.capabilities || existing.capabilities,
            examples: input.examples || existing.examples,
            status: input.status || existing.status,
            updatedAt: createTimestamp(),
        };
        this.validateWorkflowInput(merged);
        WorkflowService.workflows[index] = merged;
        return merged;
    }
    async deleteWorkflow(id) {
        const workflow = await this.getWorkflowById(id);
        if (!workflow) {
            throw new Error('工作流不存在');
        }
        if (workflow.isBuiltIn) {
            throw new Error('内置工作流不支持删除');
        }
        WorkflowService.workflows = WorkflowService.workflows.filter((item) => item.id !== id);
    }
    validateWorkflowInput(input) {
        if (!input.name?.trim()) {
            throw new Error('工作流名称不能为空');
        }
        if (!input.displayName?.trim()) {
            throw new Error('工作流展示名称不能为空');
        }
        if (!input.description?.trim()) {
            throw new Error('工作流描述不能为空');
        }
        if (!input.systemInstruction?.trim()) {
            throw new Error('工作流系统指令不能为空');
        }
        if (!input.steps || input.steps.length === 0) {
            throw new Error('至少需要一个工作流步骤');
        }
    }
    normalizeInvocation(value) {
        const trimmed = value.trim();
        if (!trimmed.startsWith('/')) {
            return `/${trimmed}`;
        }
        return trimmed;
    }
}
exports.WorkflowService = WorkflowService;
WorkflowService.workflows = [
    createBuiltInTaxReportWorkflow(),
    createBuiltInNewsDigestWorkflow(),
    createBuiltInNewsWorkflow(),
];
//# sourceMappingURL=WorkflowService.js.map