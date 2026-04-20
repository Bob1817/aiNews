import { useEffect, useMemo, useState } from 'react'
import { Bot, CopyPlus, Pencil, Plus, Sparkles, Trash2, Workflow } from 'lucide-react'
import { useToast } from '@/lib/toast'
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflows,
  updateWorkflow,
} from '@/lib/api/workflows'
import type { WorkflowDefinition, WorkflowFieldDefinition, WorkflowStep } from '@/types'

type WorkflowFormState = {
  id?: string
  name: string
  displayName: string
  description: string
  primaryInvocation: string
  aliases: string
  systemInstruction: string
  steps: string
  constraints: string
  examples: string
  extensionNotes: string
  status: 'active' | 'draft'
}

const defaultForm: WorkflowFormState = {
  name: '',
  displayName: '',
  description: '',
  primaryInvocation: '/工作流名称',
  aliases: '/+工作流名称',
  systemInstruction: '',
  steps: '理解任务\n执行步骤\n交付结果',
  constraints: '严格遵守工作流步骤',
  examples: '/工作流名称 帮我处理这个任务',
  extensionNotes: '',
  status: 'active',
}

function parseLines(value: string) {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createDefaultSchema(label: string): WorkflowFieldDefinition[] {
  return [{ name: 'task', type: 'textarea', label, required: true }]
}

function buildSteps(lines: string[]): WorkflowStep[] {
  return lines.map((line, index) => ({
    id: `step-${index + 1}`,
    title: `步骤 ${index + 1}`,
    instruction: line,
  }))
}

function mapWorkflowToForm(workflow: WorkflowDefinition): WorkflowFormState {
  return {
    id: workflow.id,
    name: workflow.name,
    displayName: workflow.displayName,
    description: workflow.description,
    primaryInvocation: workflow.invocation.primary,
    aliases: workflow.invocation.aliases.join('\n'),
    systemInstruction: workflow.systemInstruction,
    steps: workflow.steps.map((step) => step.instruction).join('\n'),
    constraints: workflow.constraints.join('\n'),
    examples: workflow.examples.join('\n'),
    extensionNotes: workflow.extensionNotes,
    status: workflow.status,
  }
}

export function Workflows() {
  const { showToast } = useToast()
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([])
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(null)
  const [form, setForm] = useState<WorkflowFormState>(defaultForm)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) || null,
    [selectedWorkflowId, workflows]
  )

  const loadWorkflows = async () => {
    try {
      const response = await getWorkflows()
      setWorkflows(response.data)
      if (!selectedWorkflowId && response.data.length > 0) {
        setSelectedWorkflowId(response.data[0].id)
        setForm(mapWorkflowToForm(response.data[0]))
      }
    } catch (error) {
      showToast({
        title: '工作流加载失败',
        message: '请确认后端服务已启动。',
        variant: 'error',
      })
    }
  }

  useEffect(() => {
    loadWorkflows()
  }, [])

  const resetForm = () => {
    setSelectedWorkflowId(null)
    setForm(defaultForm)
  }

  const handleSelectWorkflow = (workflow: WorkflowDefinition) => {
    setSelectedWorkflowId(workflow.id)
    setForm(mapWorkflowToForm(workflow))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const aliases = parseLines(form.aliases)
    const stepLines = parseLines(form.steps)
    const constraints = parseLines(form.constraints)
    const examples = parseLines(form.examples)

    const payload: Partial<WorkflowDefinition> = {
      name: form.name.trim(),
      displayName: form.displayName.trim(),
      description: form.description.trim(),
      invocation: {
        primary: form.primaryInvocation.trim(),
        aliases,
        examples,
      },
      systemInstruction: form.systemInstruction.trim(),
      steps: buildSteps(stepLines),
      inputSchema: createDefaultSchema('任务说明'),
      outputSchema: createDefaultSchema('输出结果'),
      constraints,
      tools: ['chat'],
      capabilities: ['custom'],
      examples,
      extensionNotes: form.extensionNotes.trim(),
      status: form.status,
    }

    try {
      const response = selectedWorkflowId
        ? await updateWorkflow(selectedWorkflowId, payload)
        : await createWorkflow(payload)

      await loadWorkflows()
      setSelectedWorkflowId(response.data.id)
      setForm(mapWorkflowToForm(response.data))
      showToast({
        title: selectedWorkflowId ? '工作流已更新' : '工作流已创建',
        variant: 'success',
      })
    } catch (error) {
      showToast({
        title: '保存失败',
        message: error instanceof Error ? error.message : '请检查工作流字段后重试',
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedWorkflowId) return
    setIsDeleting(true)
    try {
      await deleteWorkflow(selectedWorkflowId)
      showToast({
        title: '工作流已删除',
        variant: 'success',
      })
      resetForm()
      await loadWorkflows()
    } catch (error) {
      showToast({
        title: '删除失败',
        message: error instanceof Error ? error.message : '请稍后重试',
        variant: 'error',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      <aside className="w-[340px] border-r border-slate-200 bg-slate-50/70 p-5">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <span className="eyebrow">Workflow Library</span>
            <h1 className="mt-3 text-3xl font-semibold text-slate-900">工作流库</h1>
            <p className="mt-2 text-sm leading-6 text-editorial-muted">
              通过结构化定义创建可在聊天中用 <code>/名称</code> 或 <code>/+名称</code> 调用的工作流。
            </p>
          </div>
          <button
            onClick={resetForm}
            className="focus-ring rounded-2xl border border-slate-200 bg-white p-3 text-slate-700 transition-colors hover:bg-slate-50"
            aria-label="新建工作流"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto pb-4">
          {workflows.map((workflow) => {
            const active = workflow.id === selectedWorkflowId
            return (
              <button
                key={workflow.id}
                onClick={() => handleSelectWorkflow(workflow)}
                className={`focus-ring w-full rounded-3xl border p-4 text-left transition-all ${
                  active
                    ? 'border-blue-200 bg-blue-50 shadow-[0_14px_30px_rgba(37,99,235,0.08)]'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-editorial-violet via-editorial-indigo to-editorial-cyan text-white">
                      {workflow.isBuiltIn ? <Sparkles className="h-5 w-5" /> : <Workflow className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{workflow.displayName}</p>
                      <p className="text-sm text-editorial-muted">{workflow.description}</p>
                    </div>
                  </div>
                  <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-editorial-muted">
                    {workflow.isBuiltIn ? 'Built-in' : workflow.status}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[workflow.invocation.primary, ...workflow.invocation.aliases].slice(0, 3).map((item, index) => (
                    <span key={`${workflow.id}-${index}`} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                      {item}
                    </span>
                  ))}
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <span className="eyebrow">Workflow Builder</span>
            <h2 className="mt-3 text-4xl font-semibold text-slate-900">
              {selectedWorkflow?.isBuiltIn ? '查看内置工作流定义' : selectedWorkflow ? '编辑工作流' : '创建新工作流'}
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-editorial-muted">
              固定字段用于约束执行，自由扩展说明用于补充业务背景。AI 在工作台命中命令后会严格优先遵循这里的定义。
            </p>
          </div>
          <div className="flex gap-3">
            {!selectedWorkflow?.isBuiltIn && selectedWorkflowId && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="focus-ring flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                删除
              </button>
            )}
            {!selectedWorkflow?.isBuiltIn && (
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="focus-ring flex items-center gap-2 rounded-2xl bg-gradient-to-r from-editorial-violet to-editorial-cyan px-5 py-3 text-white transition-transform hover:-translate-y-0.5 disabled:opacity-60"
              >
                {selectedWorkflowId ? <Pencil className="h-4 w-4" /> : <CopyPlus className="h-4 w-4" />}
                {selectedWorkflowId ? '保存更新' : '创建工作流'}
              </button>
            )}
          </div>
        </div>

        {selectedWorkflow?.isBuiltIn && (
          <div className="mb-6 rounded-3xl border border-cyan-200 bg-cyan-50 p-5 text-cyan-900">
            <div className="flex items-center gap-3">
              <Bot className="h-5 w-5 text-cyan-600" />
              <p className="font-medium">内置工作流只读</p>
            </div>
            <p className="mt-2 text-sm leading-6 text-cyan-800/80">
              该工作流用于沉淀系统内置能力，当前版本不支持直接编辑。你可以复制其结构，新建自定义工作流作为变体。
            </p>
          </div>
        )}

        <div className="grid gap-5 xl:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">英文标识</span>
            <input
              value={form.name}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, name: e.target.value }))}
              className="focus-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
              placeholder="meeting-summary"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">展示名称</span>
            <input
              value={form.displayName}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, displayName: e.target.value }))}
              className="focus-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
              placeholder="会议纪要助手"
            />
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">用途描述</span>
            <textarea
              value={form.description}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, description: e.target.value }))}
              rows={3}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 placeholder:text-editorial-muted"
              placeholder="说明这个工作流主要帮用户完成什么任务。"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">主调用命令</span>
            <input
              value={form.primaryInvocation}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, primaryInvocation: e.target.value }))}
              className="focus-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">状态</span>
            <select
              value={form.status}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, status: e.target.value as 'active' | 'draft' }))}
              className="focus-ring w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            >
              <option value="active">active</option>
              <option value="draft">draft</option>
            </select>
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">别名命令（每行一个）</span>
            <textarea
              value={form.aliases}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, aliases: e.target.value }))}
              rows={3}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2 xl:col-span-2">
            <span className="text-sm font-medium text-slate-700">系统指令</span>
            <textarea
              value={form.systemInstruction}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, systemInstruction: e.target.value }))}
              rows={5}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              placeholder="定义 AI 执行该工作流时必须遵守的角色和上下文。"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">步骤（每行一个）</span>
            <textarea
              value={form.steps}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, steps: e.target.value }))}
              rows={6}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">约束（每行一个）</span>
            <textarea
              value={form.constraints}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, constraints: e.target.value }))}
              rows={6}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">示例命令（每行一个）</span>
            <textarea
              value={form.examples}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, examples: e.target.value }))}
              rows={5}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">自由扩展说明</span>
            <textarea
              value={form.extensionNotes}
              disabled={selectedWorkflow?.isBuiltIn}
              onChange={(e) => setForm((state) => ({ ...state, extensionNotes: e.target.value }))}
              rows={5}
              className="focus-ring w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </label>
        </div>
      </div>
    </div>
  )
}
