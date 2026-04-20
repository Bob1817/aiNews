import type { WorkflowCommandParseResult, WorkflowDefinition } from '../../shared/types'
import { WorkflowService } from './WorkflowService'

export class WorkflowCommandService {
  private workflowService: WorkflowService

  constructor() {
    this.workflowService = new WorkflowService()
  }

  async parseCommand(message: string): Promise<WorkflowCommandParseResult> {
    const trimmed = message.trim()
    const match = trimmed.match(/^(\/\+?)([^\s]+)(?:\s+([\s\S]*))?$/)

    if (!match) {
      return { matched: false }
    }

    const workflows = await this.workflowService.listWorkflows()
    const rawCommand = `${match[1]}${match[2]}`
    const remainingInput = match[3]?.trim() || ''
    const normalizedToken = this.normalizeToken(rawCommand)

    const workflow = workflows.find((item) => this.matchesInvocation(item, normalizedToken))

    if (!workflow) {
      return {
        matched: false,
        rawCommand,
        invocation: rawCommand,
        remainingInput,
        error: '未找到对应工作流',
      }
    }

    return {
      matched: true,
      rawCommand,
      invocation: rawCommand,
      remainingInput,
      workflow,
    }
  }

  private matchesInvocation(workflow: WorkflowDefinition, normalizedToken: string) {
    const candidates = [workflow.invocation.primary, ...workflow.invocation.aliases]
    return candidates.some((item) => this.normalizeToken(item) === normalizedToken)
  }

  private normalizeToken(value: string) {
    return value.trim().toLowerCase()
  }
}
