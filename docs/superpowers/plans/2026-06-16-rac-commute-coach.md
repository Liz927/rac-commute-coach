# RAC Commute Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local-first mobile PWA for RAC Markdown reading, question answering, marking, question-package generation, and JSON backup.

**Architecture:** React owns navigation and Day state through a small local store hook. Domain behavior lives in pure modules for Markdown parsing, statistics, backup normalization, and package generation. UI is split by screen and reusable study controls.

**Tech Stack:** React 18, Vite 5, react-markdown, remark-gfm, lucide-react, Vitest, native service worker.

---

### Task 1: Domain tests and implementation

**Files:**
- Create: `src/lib/markdown.js`
- Create: `src/lib/day.js`
- Create: `src/lib/package.js`
- Create: `src/lib/storage.js`
- Test: `src/lib/*.test.js`

- [ ] Write failing tests for section/question parsing, statistics, package text, and import normalization.
- [ ] Run `npm test` and confirm missing-module failures.
- [ ] Implement the smallest pure functions that satisfy the tests.
- [ ] Run `npm test` and confirm all tests pass.

### Task 2: Local state and screens

**Files:**
- Create: `src/hooks/useDays.js`
- Create: `src/App.jsx`
- Create: `src/components/*.jsx`

- [ ] Implement persistent Day CRUD and answer/mark updates.
- [ ] Implement list, editor, reader, question package, and backup screens.
- [ ] Keep all mobile tap targets at least 44px high.

### Task 3: Styling and PWA

**Files:**
- Create: `src/styles.css`
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/icon.svg`

- [ ] Apply the warm-paper visual system and responsive desktop layout.
- [ ] Register the service worker and validate the manifest references.

### Task 4: Verification

- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Start the app and walk through add, read, answer, mark, package, export, and persistence at mobile width.
