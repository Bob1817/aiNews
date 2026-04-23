# Tax Report Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fixed-rule "个税报表" workflow that accepts a folder of Excel files, identifies payout and settlement workbooks by structure, merges rows by ID card number, and exports a standard tax declaration workbook from the locked template.

**Architecture:** Add a dedicated backend tax-report service that performs workbook classification, row aggregation, template filling, and file export without using the AI model. Extend workflow execution to route the built-in workflow to this service, and extend the chat UI to upload folder contents, pass uploaded workbook paths into execution, and surface the generated download link.

**Tech Stack:** TypeScript, Express, React, Jest, ExcelJS

---

### Task 1: Define data contract for workflow file artifacts

**Files:**
- Modify: `shared/types/index.ts`
- Modify: `src/types/index.ts`
- Modify: `src/lib/api/workflows.ts`

- [ ] **Step 1: Write the failing test**

Add a backend service test that expects workflow artifacts to support file downloads:

```ts
expect(result.artifacts[0]).toMatchObject({
  type: 'file',
  fileName: '个税申报表.xlsx',
  downloadUrl: expect.stringContaining('/download'),
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: FAIL because `WorkflowArtifact` does not support file metadata.

- [ ] **Step 3: Write minimal implementation**

Add `file` to artifact types and optional `fileName`, `filePath`, `downloadUrl`, `mimeType`, `metadata` fields in shared/frontend types, then allow `executeWorkflow` payload to include uploaded asset paths.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: PASS for artifact shape assertions once the service exists.

- [ ] **Step 5: Commit**

```bash
git add shared/types/index.ts src/types/index.ts src/lib/api/workflows.ts
git commit -m "feat: add workflow file artifact contract"
```

### Task 2: Build the tax report backend service with TDD

**Files:**
- Create: `api/services/TaxReportWorkflowService.ts`
- Test: `api/__tests__/TaxReportWorkflowService.test.ts`

- [ ] **Step 1: Write the failing tests**

Cover:

```ts
test('classifies payout and settlement workbooks by worksheet structure')
test('aggregates duplicate id-card rows and fills missing values with 0')
test('throws when no payout workbook is present')
test('exports a filled declaration workbook from the template')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: FAIL because the service does not exist.

- [ ] **Step 3: Write minimal implementation**

Implement a focused service that:
- loads uploaded workbooks and the fixed template
- identifies payout workbooks by required columns
- identifies settlement detail/social-insurance sheets by required columns instead of names
- aggregates data by ID card
- writes output rows into the template without changing headers
- saves output under the workspace generated directory

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/services/TaxReportWorkflowService.ts api/__tests__/TaxReportWorkflowService.test.ts
git commit -m "feat: add tax report workflow service"
```

### Task 3: Route the built-in workflow through the new backend service

**Files:**
- Modify: `api/services/WorkflowService.ts`
- Modify: `api/services/WorkflowExecutionService.ts`
- Modify: `api/controllers/WorkflowController.ts`
- Modify: `api/routes/workflow.ts`

- [ ] **Step 1: Write the failing test**

Add/extend a workflow execution test that expects:

```ts
expect(result.workflow.id).toBe('workflow-tax-report')
expect(result.artifacts[0].downloadUrl).toContain('/api/workflows/executions/')
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: FAIL because workflow execution still routes everything to AI text generation.

- [ ] **Step 3: Write minimal implementation**

Add a built-in workflow definition for `个税报表`, extend execute input to accept uploaded asset paths, route this workflow to `TaxReportWorkflowService`, and add a download endpoint that serves generated files by execution/artifact id.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add api/services/WorkflowService.ts api/services/WorkflowExecutionService.ts api/controllers/WorkflowController.ts api/routes/workflow.ts
git commit -m "feat: wire tax report workflow execution"
```

### Task 4: Add folder upload and workflow execution support in chat

**Files:**
- Modify: `src/pages/Chat.tsx`
- Modify: `src/lib/api/config.ts`
- Modify: `src/lib/api/workflows.ts`
- Modify: `src/components/ConversationItem.tsx`

- [ ] **Step 1: Write the failing test**

Add/extend a chat UI test that expects:

```tsx
expect(screen.getByText(/上传文件夹/i)).toBeInTheDocument()
expect(screen.getByText(/个税报表/i)).toBeInTheDocument()
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/pages/__tests__/NewsEdit.test.tsx`
Expected: FAIL because chat does not support folder uploads or workflow file downloads.

- [ ] **Step 3: Write minimal implementation**

Add folder selection using `webkitdirectory`, upload each workbook through the existing workspace upload API, attach uploaded relative paths when the tax-report workflow executes, and render file download links in assistant results.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/pages/__tests__/NewsEdit.test.tsx`
Expected: PASS or replace with a dedicated chat/workflow UI test if needed.

- [ ] **Step 5: Commit**

```bash
git add src/pages/Chat.tsx src/lib/api/config.ts src/lib/api/workflows.ts src/components/ConversationItem.tsx
git commit -m "feat: add chat folder upload for tax workflow"
```

### Task 5: Verify end-to-end behavior and type safety

**Files:**
- Modify: any touched files above if fixes are required

- [ ] **Step 1: Run focused backend tests**

Run: `npm test -- api/__tests__/TaxReportWorkflowService.test.ts`
Expected: PASS

- [ ] **Step 2: Run relevant frontend tests**

Run: `npm test -- src/pages/__tests__/NewsEdit.test.tsx`
Expected: PASS

- [ ] **Step 3: Run type checking**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Manual sanity check**

Run the app, select the built-in `个税报表` workflow, upload a folder containing payout and settlement workbooks, and confirm the assistant response includes a working `.xlsx` download link.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "feat: deliver tax report workflow"
```
