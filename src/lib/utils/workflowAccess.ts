import type { WorkflowDefinition } from '@/types'

export type WorkflowExecutionMode = 'ai' | 'local'

type WorkflowWithExecutionMode = WorkflowDefinition & {
  executionMode?: WorkflowExecutionMode
}

export interface WorkflowAccessState {
  hasAiModel: boolean
  localWorkflowOnly: boolean
}

export function canUseWorkflow(workflow: WorkflowDefinition, config: WorkflowAccessState) {
  const workflowWithMode = workflow as WorkflowWithExecutionMode

  if (workflowWithMode.executionMode === 'local') {
    return true
  }

  return config.hasAiModel && !config.localWorkflowOnly
}

export function getVisibleWorkflows(
  workflows: WorkflowDefinition[],
  config: WorkflowAccessState
) {
  return workflows.filter((workflow) => canUseWorkflow(workflow, config))
}
