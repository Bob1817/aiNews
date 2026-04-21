"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowCommandService = void 0;
const WorkflowService_1 = require("./WorkflowService");
class WorkflowCommandService {
    constructor() {
        this.workflowService = new WorkflowService_1.WorkflowService();
    }
    async parseCommand(message) {
        const trimmed = message.trim();
        const match = trimmed.match(/^(\/\+?)([^\s]+)(?:\s+([\s\S]*))?$/);
        if (!match) {
            return { matched: false };
        }
        const workflows = await this.workflowService.listWorkflows();
        const rawCommand = `${match[1]}${match[2]}`;
        const remainingInput = match[3]?.trim() || '';
        const normalizedToken = this.normalizeToken(rawCommand);
        const workflow = workflows.find((item) => this.matchesInvocation(item, normalizedToken));
        if (!workflow) {
            return {
                matched: false,
                rawCommand,
                invocation: rawCommand,
                remainingInput,
                error: '未找到对应工作流',
            };
        }
        return {
            matched: true,
            rawCommand,
            invocation: rawCommand,
            remainingInput,
            workflow,
        };
    }
    matchesInvocation(workflow, normalizedToken) {
        const candidates = [workflow.invocation.primary, ...workflow.invocation.aliases];
        return candidates.some((item) => this.normalizeToken(item) === normalizedToken);
    }
    normalizeToken(value) {
        return value.trim().toLowerCase();
    }
}
exports.WorkflowCommandService = WorkflowCommandService;
//# sourceMappingURL=WorkflowCommandService.js.map