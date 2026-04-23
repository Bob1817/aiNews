import type { WorkflowDefinition } from '@/types'
import { canUseWorkflow, getVisibleWorkflows } from './workflowAccess'

function createWorkflow(
  id: string,
  executionMode: 'ai' | 'local'
): WorkflowDefinition & { executionMode: 'ai' | 'local' } {
  return {
    id,
    name: id,
    displayName: id,
    description: '',
    invocation: {
      primary: `/${id}`,
      aliases: [],
      examples: [],
    },
    systemInstruction: '',
    steps: [],
    inputSchema: [],
    outputSchema: [],
    constraints: [],
    tools: [],
    capabilities: [],
    examples: [],
    extensionNotes: '',
    isBuiltIn: true,
    status: 'active',
    createdAt: '2026-04-23T00:00:00.000Z',
    updatedAt: '2026-04-23T00:00:00.000Z',
    executionMode,
  }
}

describe('workflowAccess', () => {
  test('returns only local workflows when localWorkflowOnly is enabled', () => {
    const workflows = [
      createWorkflow('workflow-tax-report', 'local'),
      createWorkflow('workflow-news-digest', 'ai'),
    ]

    expect(
      getVisibleWorkflows(workflows, { hasAiModel: false, localWorkflowOnly: true }).map(
        (item) => item.id
      )
    ).toEqual(['workflow-tax-report'])
  })

  test('blocks ai workflows when ai is unavailable', () => {
    const workflow = createWorkflow('workflow-news-digest', 'ai')

    expect(canUseWorkflow(workflow, { hasAiModel: false, localWorkflowOnly: false })).toBe(false)
  })

  test('allows local workflows without ai', () => {
    const workflow = createWorkflow('workflow-tax-report', 'local')

    expect(canUseWorkflow(workflow, { hasAiModel: false, localWorkflowOnly: true })).toBe(true)
  })
})
