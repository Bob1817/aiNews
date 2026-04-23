"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowController = void 0;
const WorkflowExecutionService_1 = require("../services/WorkflowExecutionService");
const WorkflowService_1 = require("../services/WorkflowService");
class WorkflowController {
    constructor() {
        this.workflowService = new WorkflowService_1.WorkflowService();
        this.workflowExecutionService = new WorkflowExecutionService_1.WorkflowExecutionService();
    }
    async list(req, res) {
        try {
            const workflows = await this.workflowService.listWorkflows();
            res.json({ data: workflows });
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : '获取工作流失败' });
        }
    }
    async get(req, res) {
        try {
            const workflow = await this.workflowService.getWorkflowById(req.params.id);
            if (!workflow) {
                res.status(404).json({ error: '工作流不存在' });
                return;
            }
            res.json({ data: workflow });
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : '获取工作流失败' });
        }
    }
    async create(req, res) {
        try {
            const workflow = await this.workflowService.createWorkflow(req.body);
            res.status(201).json({ data: workflow });
        }
        catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : '创建工作流失败' });
        }
    }
    async update(req, res) {
        try {
            const workflow = await this.workflowService.updateWorkflow(req.params.id, req.body);
            res.json({ data: workflow });
        }
        catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : '更新工作流失败' });
        }
    }
    async delete(req, res) {
        try {
            await this.workflowService.deleteWorkflow(req.params.id);
            res.json({ success: true });
        }
        catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : '删除工作流失败' });
        }
    }
    async parseCommand(req, res) {
        try {
            const result = await this.workflowExecutionService.parseCommand(req.body.message || '');
            res.json(result);
        }
        catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : '解析工作流命令失败' });
        }
    }
    async execute(req, res) {
        try {
            const { userId, message, uploadedAssetPaths, referencedNewsId, history, invocation } = req.body;
            const result = await this.workflowExecutionService.execute({
                userId,
                workflowId: req.params.id,
                invocation,
                message,
                uploadedAssetPaths,
                referencedNewsId,
                history,
            });
            res.json(result);
        }
        catch (error) {
            res.status(400).json({ error: error instanceof Error ? error.message : '执行工作流失败' });
        }
    }
    async listExecutions(req, res) {
        try {
            const userId = String(req.query.userId || req.body.userId || '1');
            const data = await this.workflowExecutionService.listExecutions(userId);
            res.json({ data });
        }
        catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : '获取执行记录失败' });
        }
    }
    async downloadArtifact(req, res) {
        try {
            const userId = String(req.query.userId || '1');
            const artifact = await this.workflowExecutionService.getExecutionArtifact(userId, req.params.executionId, req.params.artifactId);
            return res.download(artifact.filePath, artifact.fileName);
        }
        catch (error) {
            return res.status(404).json({
                error: '下载失败',
                message: error instanceof Error ? error.message : '文件不存在',
            });
        }
    }
}
exports.WorkflowController = WorkflowController;
//# sourceMappingURL=WorkflowController.js.map