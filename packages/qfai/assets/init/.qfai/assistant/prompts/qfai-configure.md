<!--
QFAI Prompt Body (SSOT)
- This file is intended to be referenced by tool-specific custom prompt definitions (e.g., Copilot .prompt.md, Claude Code slash commands).
- Keep tool-specific wrappers thin: "Read this file and follow it."
-->

---

id: qfai-configure
title: QFAI Configure (Tune qfai.config.yaml)
description: "Analyze the repository and tune qfai.config.yaml (testFileGlobs, exclude globs)."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task]
roles: [DevOpsCIEngineer, QAEngineer, CodeReviewer, Planner]
mode: evidence-focused

---

# /qfai-configure - Configure QFAI for this repository

## Purpose

Analyze the repository and update `qfai.config.yaml` so QFAI traceability checks (especially SC->Test) are actionable without manual tuning.

## Success Criteria (Definition of Done)

- `qfai.config.yaml` is updated with a **minimal diff** focused on traceability globs.
- `validation.traceability.testFileGlobs` reflects the real test layout.
- `validation.traceability.testFileExcludeGlobs` is added only when needed.
- A validation checklist with evidence (sample matched files) is produced.

## Non-Negotiable Principles (QFAI Articles)

These principles are inspired by "constitution / articles" patterns used by other agent frameworks, but tailored to QFAI.

1. **SDD First (Specification is the source of truth)**  
   If there is a conflict between code and spec, treat the spec as authoritative and either (a) fix code or (b) raise an explicit Open Question to change the spec.

2. **Traceability is mandatory**  
   Every meaningful change must be traceable: **Require -> Spec -> Scenario -> Tests -> Code -> Verification evidence**.

3. **Evidence over confidence**  
   Prefer observable proof (logs, commands, file diffs, test results). If you cannot verify, say so and record it.

4. **Minimize scope, but never hide gaps**  
   Keep changes minimal, but do not "paper over" missing decisions. If something blocks correctness, stop and ask.

5. **Quality gates are the decision mechanism**  
   Use tests/lint/typecheck/build/pack verification (whatever the repo defines) as the primary guardrail. Fix until PASS.

6. **Make it runnable**  
   Outputs must be executable in terminal/CI. Provide copy-paste commands.

7. **User time is expensive**  
   Ask only the questions that are truly blocking. Everything else: make reasonable assumptions and label them clearly.

## Absolute Rule - Output Language

**All outputs MUST be written in the user's working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides all other stylistic preferences.

## Multi-Role Orchestration (Subagents)

This workflow assumes the environment _may_ support subagents (e.g., Claude Code "Task" tool) or may not.

### If subagents are supported

Delegate to multiple roles and then merge the results. Use a "real-world workflow" order:

- Facilitator -> Interviewer -> Requirements Analyst -> Planner -> Architect -> (Contract Designer) -> Test Engineer -> QA Engineer -> Code Reviewer -> DevOps/CI Engineer

**Pseudo-invocation pattern** (adjust to your tool):

```text
Task(
  subagent_type="planner",
  description="Analyze repo and propose testFileGlobs",
  prompt="Context: ...\nGoal: Tune qfai.config.yaml\nConstraints: minimal diff\nReturn: globs + evidence"
)
```

### If subagents are NOT supported

Simulate roles by running the same sequence yourself:

- Write a short "role output" section per role, then consolidate into the final deliverable(s).

## Constraints

- Only update `qfai.config.yaml` unless explicitly asked.
- Do **not** modify tests or source code.
- Avoid overly broad globs (e.g., `**/*`).
- Exclude generated/output directories (`node_modules`, `.git`, `.qfai`, `dist`, `build`, `coverage`, `.next`, `out`, etc.).

## Step 0 - Load Context (always)

1. Read relevant **project steering** (if present):
   - `.qfai/assistant/steering/structure.md`
   - `.qfai/assistant/steering/tech.md`
   - `.qfai/assistant/steering/product.md`
   - any additional files under `.qfai/assistant/steering/`

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/instructions/constitution.md`
   - `.qfai/assistant/instructions/workflow.md` (or equivalent)

3. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing test patterns (unit/integration/e2e)

## Step 0 - Project Analysis (mandatory)

Before editing config, **thoroughly analyze the current project**:

- background and goals
- directory structure and conventions
- chosen technologies and versions (runtime, package manager, test runner)
- test locations (unit/integration/e2e)
- existing test naming rules (`*.test.*`, `*.spec.*`, `*_test.*`, etc.)

If analysis cannot be performed (missing access), clearly state what could not be verified and proceed with minimal-risk assumptions.

## Step 1 - Identify test frameworks and locations

1. Inspect `package.json` and config files (e.g., `vitest.config.*`, `jest.config.*`, `playwright.config.*`, `pytest.ini`, `go.mod`).
2. Enumerate directories that contain tests (e.g., `tests/`, `src/`, `e2e/`, `integration/`).
3. Note naming rules and extensions that indicate test files.

## Step 2 - Propose glob patterns

Provide 3-10 **include globs** that cover all known test locations:

- Prefer explicit patterns (e.g., `src/**/*.test.ts`, `tests/**/*.spec.ts`).
- Include src-colocated tests if they exist.

Provide **exclude globs** only when necessary (beyond the default exclusions).

## Step 3 - Update `qfai.config.yaml` (minimal diff)

Edit:

- `validation.traceability.testFileGlobs`
- `validation.traceability.testFileExcludeGlobs` (only if needed)

Keep all other config keys unchanged.

## Step 4 - Evidence sampling

Sample 5-15 actual test files that match the proposed globs.

- If zero matches exist, stop and ask for clarification.
- If some directories are ambiguous, list them as Open Questions.

## Checkpoints

- [ ] Repository analysis completed (frameworks, test layout, naming rules).
- [ ] Proposed include/exclude globs with rationale.
- [ ] `qfai.config.yaml` updated (minimal diff).
- [ ] Evidence: sample matched files listed.

## Output

Provide:

1. Updated `qfai.config.yaml` (diff or full file, as appropriate).
2. A short summary of changes and rationale.
3. Validation checklist with sampled files.
4. Open questions (blocking vs non-blocking).

Suggest next step: `/qfai-require` (or `/qfai-discuss` if requirements are not ready).
