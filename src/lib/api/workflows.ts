import type { WorkflowArtifact, WorkflowCommandParseResult, WorkflowDefinition, WorkflowExecution } from '@/types'
import { apiRequest, withJsonBody } from '@/lib/api'

export function getWorkflows() {
  return apiRequest<{ data: WorkflowDefinition[] }>('/api/workflows')
}

export function getWorkflowExecutions(userId: string) {
  return apiRequest<{ data: WorkflowExecution[] }>(`/api/workflows/executions?userId=${encodeURIComponent(userId)}`)
}

export function createWorkflow(payload: Partial<WorkflowDefinition>) {
  return apiRequest<{ data: WorkflowDefinition }>('/api/workflows', withJsonBody(payload, { method: 'POST' }))
}

export function updateWorkflow(id: string, payload: Partial<WorkflowDefinition>) {
  return apiRequest<{ data: WorkflowDefinition }>(`/api/workflows/${id}`, withJsonBody(payload, { method: 'PUT' }))
}

export function deleteWorkflow(id: string) {
  return apiRequest<{ success: boolean }>(`/api/workflows/${id}`, { method: 'DELETE' })
}

export function parseWorkflowCommand(message: string) {
  return apiRequest<WorkflowCommandParseResult>(
    '/api/workflows/parse-command',
    withJsonBody({ message }, { method: 'POST' })
  )
}

export function executeWorkflow(payload: {
  workflowId: string
  invocation?: string
  userId: string
  message: string
  uploadedAssetPaths?: string[]
  referencedNewsId?: string
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}) {
  const { workflowId, ...body } = payload
  return apiRequest<{
    content: string
    workflow: WorkflowDefinition
    execution: WorkflowExecution
    artifacts?: WorkflowArtifact[]
  }>(`/api/workflows/${workflowId}/execute`, withJsonBody(body, { method: 'POST' }))
}
