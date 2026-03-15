---
name: qfai-configure
title: QFAI Configure (Tune qfai.config.yaml)
description: "Analyze the repository and tune qfai.config.yaml (testFileGlobs, exclude globs, optional specSections)."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task]
roles: [DevOpsCIEngineer, QAEngineer, CodeReviewer, Planner]
mode: evidence-focused
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-configure - Configure QFAI for this repository

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., configuration decisions, glob pattern confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

## FORMAT SSOT (Mandatory)

- **Before writing or editing any `.qfai/**` artifact\*\*, read and follow the relevant directory README template and sample:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
- **Do NOT copy** templates/samples into this prompt or into other prompt markdown.
- The generated artifacts must match the README-defined structure (headings, ordering, table columns).
- Completion requires a **Format Self-Check** in the evidence: list each artifact and confirm “matches README template”.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: `.qfai/specs/<spec-id>/09_delta.md` (Decision Records; if no spec yet, state "not applicable")
- P4: other artifacts (01_Spec.md, contracts, evidence, optional legacy `scenario.feature` / coverage ledgers)

## Sub-agent Delegation (MANDATORY)

This section is mandatory and overrides any conflicting fallback text in this file.

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results to the user.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT serve as Reviewer or skip delegation for convenience.

### Capability Probe (MUST)

1. Run one harmless Probe Task (for example: "reply with ok") once at stage start.
2. If subagents are unavailable, explicitly ask the user for Simulation mode approval.
3. Without explicit approval, stop the stage and do not continue.

### Simulation mode (Opt-in only)

- Allowed only when the user explicitly states `Simulation mode allowed`.
- When used, record both of the following in outputs/evidence:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

### Work Orders Summary (MANDATORY evidence)

Every major artifact in this stage MUST include a `## Work Orders Summary` section with this fixed table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

- `Output (refs)` must point to in-file anchors or relative evidence file paths.

### Stage Minimum Roles (MUST)

- Delegate: PrimaryAuthor create first drafts of major artifact drafts for this stage.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - Required roles were delegated (no orchestrator self-authoring).
  - DoD satisfied (validate gate, test-layer hard gate, evidence, DR-IDs).
  - Validate gate evidence exists: `qfai validate --fail-on error` completed with `error=0`.
  - **Drift Protocol enforced**:
    - No upstream artifact edits were made without an explicit user-approved Change Request.
    - If upstream changes exist, the correct owner skill was re-run after approval; downstream did not patch upstream directly.
  - **Test-layer policy enforced**:
    - E2E/API/Integration coverage aligns with `steering/test-layers.md` and the project’s plan.
    - Do not use pyramid ratios as a gate; use floors/ratios only as signals. Coverage obligations are the gate.
- Do not declare DONE or handoff until Reviewer returns `PASS`.
- **devils-advocate gate**:
  - devils-advocate FAIL must include a concrete alternative proposal. Bare negation FAIL triggers re-judgment.
  - 3 consecutive FAILs trigger advisory demotion and allow progression to the next phase.
- **pattern-doubler gate**:
  - Each pattern proposed by pattern-doubler must include rationale.
  - Artifacts with no ID-bearing items (US/AC/BR/EX/TC) are marked N/A.

### Work order template (copy/paste)

```text
Task title: <short>
Role: <sub-agent role>
Goal: <what to decide/produce>
Inputs (refs):
- <file/section>
Constraints:
- must: enforce Drift Protocol (no upstream edits without user approval + CR)
- must: verify plan/test-layer adherence (`steering/test-layers.md` + plan)
- must: check `qfai validate --fail-on error` passes with evidence (`error=0`)
- must: enforce `.qfai/assistant/steering/test-layers.md` hard gates
- must_not: accept test-volume ratios/floors as a hard gate
- must_not: accept upstream edits made directly by downstream phase
Output format:
- <headings / bullet schema>
Quality bar:
- PASS if ...
- REVISE if ...
```

### Reviewer response template

```text
Result: PASS | REVISE
Findings:
- <issue>
Required fixes:
- <action>
Evidence checked:
- <refs>
```

## Stage 0 — Steering completion refresh (mandatory)

Before moving forward in this stage, refresh these files:

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`

Rules:

- Detect incomplete content (empty sections, placeholder-only lines, `<...>`, `TBD`, stale facts).
- Fill what is verifiable from repository evidence (tree, docs, require/spec artifacts, package.json, CI definitions).
- If something cannot be verified, record it as an Open Question and ask the user.
- Even if steering is already complete, update it when new facts are discovered in this stage.

## Delta Rejected Guard (Mandatory)

- Do NOT reintroduce options marked as rejected in 09_delta.md.
- If a rejected option must be reconsidered, create a **[RE-OPEN]** Decision
  Record in 09_delta.md that references the prior DR-ID, states what changed +
  new criteria, and includes explicit approval (user or instructions/steering).

## CRITICAL CONSTRAINTS (Read First)

- Only update `qfai.config.yaml`, `.qfai/assistant/steering/*`, and `.qfai/evidence/configure-<run-id>.md` unless explicitly asked.
- You MUST produce the required evidence file: `.qfai/evidence/configure-<run-id>.md`.
  - `.qfai/evidence/` is intentionally NOT tracked by Git (it ships with a local `.gitignore`).
  - Do NOT commit evidence files; summarize key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if tooling choices or runnable path remain ambiguous.
- Completion must be approved by a reviewer who did not modify the config.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: detect undefined or ambiguous items; resolve them or explicitly defer them with documented rationale and (when required by this prompt) user approval.
- Deliverable completeness: verify every expected artifact listed in this prompt (and required README templates) exists and is fully populated; no missing required sections.
- OQ / placeholder scan: scan all generated artifacts (including evidence) for
  placeholders such as "TBD", "TODO", "TBA", "TBC", "XXX", "???", "OQ",
  "OPEN QUESTION", "UNDEFINED", "PLACEHOLDER", and localized equivalents in
  the user's language. Resolve or explicitly defer; do not leave silent
  placeholders.
- Smoke check (if applicable): when the prompt produces runnable code, tests,
  or configs, execute the smallest command that proves basic run/start/operate
  and record evidence. If not applicable, state "not applicable" with a short
  rationale.

## Goal

Analyze the repository and update `qfai.config.yaml` so traceability checks are actionable, with a documented minimum runnable path.

Note: /qfai-sdd includes a preflight step that bootstraps missing config/steering when run directly after init.
/qfai-configure remains the recommended way to tune `qfai.config.yaml` early with a clean, minimal diff.

## Success Criteria (Definition of Done)

- `qfai.config.yaml` is updated with a **minimal diff** focused on traceability globs.
- `validation.traceability.testFileGlobs` reflects the real test layout.
- `validation.traceability.testFileExcludeGlobs` is added only when needed.
- If strict spec sections are explicitly requested, `validation.require.specSections` is updated with a minimal, evidence-based list.
- A validation checklist with evidence (sample matched files) is produced.
- Steering files (`product.md`, `tech.md`, `structure.md`, `manifest.md`) are filled or refreshed with evidence, or marked `TBD` when evidence is missing.
- Evidence file exists: `.qfai/evidence/configure-<run-id>.md`.
- Completion is approved by a reviewer who did not modify the config.

## Mandatory checks

- Tool selection rationale is recorded (per layer if applicable).
- A minimum runnable path is described (dev server, db, env, commands).

## Not-done criteria

- Tool selection rationale missing.
- Minimum runnable path missing or unverifiable.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/configure-<run-id>.md`
Use `<run-id>` as a short date stamp (e.g., `2026-01-28`) or a short slug for this run.

Evidence must include:

- chosen tools per layer (E2E/API/Integration/Component/Unit)
- commands to run locally

### Required sections

- Objective
- Inputs reviewed (files/paths)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Gaps / Open risks (must be explicit; "none" is acceptable if justified)
- Final status (PASS/FAIL) + who confirmed

### Template

```md
# Configure Evidence: <run-id>

## Objective

## Inputs reviewed (files/paths)

## Decisions made (with rationale)

## Work performed (what changed, where)

## Commands executed + key outputs

## Proposed globs

- include:
- exclude:

## Evidence samples (5-15)

## Tool selection (per layer)

## Minimum runnable path

## Files changed

- qfai.config.yaml:
- steering files:

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

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

## README Rule

Do not edit any `.qfai/**/README.md` file; raise an Open Question instead.

- READMEs are reference guides. Follow their structure, templates, and checklists.

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

Only with explicit user approval (`Simulation mode allowed`), simulate roles by running the same sequence yourself:

- Write a short "role output" section per role, then consolidate into the final deliverable(s).

## Completion Separation (mandatory)

- Config changes (DevOpsCIEngineer) and completion approval (CodeReviewer) must be separate.
- QAEngineer must confirm evidence sampling before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Evidence samples collected vs missing
- Config changes and steering updates completed

## Constraints

- Only update `qfai.config.yaml`, `.qfai/assistant/steering/*`, and `.qfai/evidence/configure-<run-id>.md` unless explicitly asked.
- Do **not** modify tests or source code.
- Avoid overly broad globs (e.g., `**/*`).
- Exclude generated/output directories (`node_modules`, `.git`, `.qfai`, `dist`, `build`, `coverage`, `.next`, `out`, etc.).
- Keep `validation.require.specSections` unchanged unless the user explicitly requests strict required headings.

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

4. Inspect steering templates and placeholders:
   - `.qfai/assistant/steering/product.md`
   - `.qfai/assistant/steering/tech.md`
   - `.qfai/assistant/steering/structure.md`
   - `.qfai/assistant/steering/manifest.md`

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
4. If strict spec sections are requested, sample existing `01_Spec.md` files and list H2 headings used.

## Step 2 - Propose glob patterns

Provide 3-10 **include globs** that cover all known test locations:

- Prefer explicit patterns (e.g., `src/**/*.test.ts`, `tests/**/*.spec.ts`).
- Include src-colocated tests if they exist.

Provide **exclude globs** only when necessary (beyond the default exclusions).

## Step 3 - Update steering (evidence-first)

Fill steering templates with repo evidence.

- Keep existing content when already accurate.
- When evidence is missing, write `TBD` and record what is missing.
- Do not invent facts.
- For `steering/manifest.md`, explicitly record **Evidence** and **Assumptions** (if evidence is missing).

## Step 4 - Update `qfai.config.yaml` (minimal diff)

Edit:

- `validation.traceability.testFileGlobs`
- `validation.traceability.testFileExcludeGlobs` (only if needed)
- `validation.require.specSections` (only if explicitly requested)

Keep all other config keys unchanged.

## Step 5 - Evidence sampling

Sample 5-15 actual test files that match the proposed globs.

- If zero matches exist, stop and ask for clarification.
- If some directories are ambiguous, list them as Open Questions.

## Checkpoints

- [ ] Repository analysis completed (frameworks, test layout, naming rules).
- [ ] Steering files updated with evidence or `TBD`.
- [ ] Manifest includes evidence and assumptions (or `TBD`).
- [ ] Proposed include/exclude globs with rationale.
- [ ] `qfai.config.yaml` updated (minimal diff).
- [ ] Optional: specSections tuned when requested (or kept empty).
- [ ] Evidence: sample matched files listed.

## Output

Provide:

1. Updated `qfai.config.yaml` (diff or full file, as appropriate).
2. Updated steering files (diff or summary).
3. A short summary of changes and rationale.
4. Validation checklist with sampled files.
5. If specSections updated, list the chosen headings and evidence source.
6. Open questions (blocking vs non-blocking).

Suggest next step: `/qfai-discussion` (or rerun `/qfai-configure` if configuration is not ready).

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions/steering and the 09_delta.md spec-id
- DR-IDs referenced (or "none" + propose adding a Decision Record)
- Confirmation that no rejected options were reintroduced (or list RE-OPEN DR-IDs)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not modify the config.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-discussion`.
  Action: run it to formalize requirements from the configured project context.
- Discussion needs more input: rerun `/qfai-discussion`.
  Action: collect missing scope, constraints, and assumptions first.
- Configuration needs refinement: rerun `/qfai-configure`.
  Action: provide additional include/exclude evidence and update `qfai.config.yaml`.
