# News Rich Editor And Smart Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add smart title/body extraction when saving conversation output or pushed news into task results, replace plain-text news editing with a TipTap rich-text editor that supports image upload, and improve article preview rendering.

**Architecture:** Move save normalization into shared backend logic so all news-save entry points use one heuristic extraction pipeline. Store article body as HTML for edited news content, keep plain text/markdown input compatibility through normalization, and render previews with a single HTML-aware content renderer in both edit and list views.

**Tech Stack:** React, TypeScript, TipTap, Express, Jest, Testing Library

---

### Task 1: Smart Save Normalization

**Files:**
- Create: `api/services/newsContentNormalizer.ts`
- Create: `api/__tests__/newsContentNormalizer.test.ts`
- Modify: `api/services/SavedNewsService.ts`
- Modify: `api/controllers/NewsController.ts`
- Modify: `src/pages/Chat.tsx`

- [ ] Step 1: Write failing tests for title extraction, duplicate heading removal, and body fallback.
- [ ] Step 2: Run the targeted Jest command and verify the new tests fail for the expected missing-module or behavior reasons.
- [ ] Step 3: Implement a backend normalizer that derives title/body from markdown, plain text, and existing article title candidates.
- [ ] Step 4: Route all news-save paths through the normalizer so chat saves and pushed news saves share the same logic.
- [ ] Step 5: Re-run the targeted Jest command and confirm the normalization tests pass.

### Task 2: Rich Text Editing With Upload

**Files:**
- Create: `src/components/RichTextEditor.tsx`
- Modify: `package.json`
- Modify: `src/pages/NewsEdit.tsx`
- Modify: `src/lib/api/config.ts`
- Modify: `src/types/index.ts`

- [ ] Step 1: Add a failing component test or utility-level test for HTML editor value propagation if feasible within current test setup.
- [ ] Step 2: Install TipTap packages required for StarterKit, Placeholder, Image, and React integration.
- [ ] Step 3: Implement a reusable rich-text editor component with toolbar actions and image upload callback.
- [ ] Step 4: Replace the news edit textarea with the rich-text editor and wire uploaded images into the existing workspace upload API.
- [ ] Step 5: Verify the editor data flows through create/update save calls as HTML content.

### Task 3: Preview And Compatibility Rendering

**Files:**
- Create: `src/lib/utils/contentFormat.ts`
- Create: `src/components/ArticleContent.tsx`
- Create: `src/lib/utils/contentFormat.test.ts`
- Modify: `src/pages/NewsEdit.tsx`
- Modify: `src/pages/NewsList.tsx`

- [ ] Step 1: Write failing tests for detecting and converting plain text or markdown content for preview rendering.
- [ ] Step 2: Implement shared format detection helpers and a renderer that supports both stored HTML and legacy markdown/plain text entries.
- [ ] Step 3: Replace the current summary-only preview in the editor with article-style rendering.
- [ ] Step 4: Replace the task-result preview modal markdown-only rendering with the shared article renderer.
- [ ] Step 5: Re-run targeted tests to confirm compatibility behavior.

### Task 4: Verification

**Files:**
- Modify: `package-lock.json`

- [ ] Step 1: Run targeted backend and frontend Jest suites covering the new normalization and rendering helpers.
- [ ] Step 2: Run `npm run typecheck`.
- [ ] Step 3: Run `npm run build`.
- [ ] Step 4: Review the diff for unintended regressions before reporting completion.
