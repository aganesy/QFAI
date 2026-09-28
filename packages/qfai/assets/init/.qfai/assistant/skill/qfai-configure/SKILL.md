---
name: qfai-configure
title: QFAI Configure (Tune qfai.config.yaml)
description: "Analyze the repository and tune qfai.config.yaml test globs and project overrides."
argument-hint: "[--auto]"
allowed-tools: [Read, Glob, Write, Edit, TodoWrite, Task, Agent]
roles:
  [
    orchestrator,
    delivery-planner,
    qa-strategist,
    devops-ci-engineer,
    completion-reviewer,
    qa-gatekeeper,
    implementation-reviewer,
  ]
routing-profile: runtime-heavy
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

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- configuration decisions
- glob pattern confirmation

Both examples are clarifications and count against the Article VI budget: at
most 5 per invocation of this skill, after which the remaining choices are taken
as labelled assumptions and recorded in the config diff — see
`.qfai/assistant/rule/constitution.md` Article VI. The `hard-required`
inputs in Default Autopilot Policy are the exception: they are never assumed,
and a missing one blocks the run until it is provided — but only where this run
consumes it; one this run never reads is not asked for at all. The stops this
skill declares — Step 5's zero-match glob, and an ambiguous tooling choice or
runnable path — are `hard-required` inputs, not clarifications to assume, so
both outlive an exhausted budget.

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#format-ssot-mandatory`.

- Before writing or editing a `.qfai/**` artifact, read the reference for that artifact:
  - `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md` — the story-tree layout and which file owns what. Read it before filling a policy file or `03_contract/tech.md`.
  - `.qfai/assistant/skill/qfai-sdd/references/contract-artifact-rules.md` — the rules for a contract. Read it before writing a contract other than `tech.md`.
  - `.qfai/assistant/skill/qfai-discussion/references/discussion-artifact-rules.md` — a discussion pack's file rules. Read it only if asked to edit a pack.
  - `.qfai/assistant/skill/qfai-prototyping/references/evidence-requirements.md` — what a prototyping evidence file must hold. Read it only if asked to edit one.

## Inputs Priority (Preflight)

When unsure, read inputs in this order:

- P1: `.qfai/assistant/rule/*`
- P2: Read `.qfai/assistant/rule/agent-selection.md`, the routed cards under `.qfai/assistant/agent/`, and project context under `.qfai/spec/01_policy/` and `.qfai/spec/03_contract/`.
- P3: `.qfai/spec/decisions.md` (Decision Records; if no decision exists, state "not applicable").
- P4: the business flows, stories, contracts, tests, and evidence relevant to the configuration.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/rule/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

### Work Orders Summary (MANDATORY evidence)

Use the shared schema.

### Stage Minimum Roles (MUST)

- Delegate: PrimaryAuthor create first drafts of major artifact drafts for this stage.
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### Reviewer Gate (MUST)

- Follow `.qfai/assistant/rule/shared-skill-delegation-baseline.md#reviewer-gate-baseline`.
- Reviewer checks:
  - required roles were delegated;
  - doctor evidence exists: `npx qfai doctor --fail-on error` completed without failing checks;
  - Drift Protocol enforced;
  - test-layer policy enforced against `.qfai/assistant/rule/test-layers.md`;
  - tool-count heuristics are signals, not gates.
- Route specialist reviewers from `.qfai/assistant/rule/agent-selection.md`.
- Default configure review set:
  - `completion-reviewer`
  - `qa-gatekeeper`
- Do not declare DONE or handoff until all routed blocking reviewers return `PASS`.

### Work order template (copy/paste)

Use the shared template.

### Reviewer response template

Use the shared template.

- Required field: `Status (PASS/REVISE/PENDING)`. `PENDING` marks a gate that could not be run (see the baseline's reviewer-budget branch); it never counts as `PASS`.

## Stage 0 — Steering completion refresh (mandatory)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.

- Fill steering from verifiable repository evidence first; when evidence is missing, mark the field `TBD` and record the gap in the evidence file.

## Rejected Option Guard (Mandatory)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#rejected-option-guard-mandatory`.

## CRITICAL CONSTRAINTS (Read First)

- Only update `qfai.config.yaml`, project-owned policy and contract files under `.qfai/spec/`, and `.qfai/evidence/configure-<run-id>.md` unless explicitly asked.
- You MUST produce the required evidence file: `.qfai/evidence/configure-<run-id>.md`.
  - The run-scoped `.qfai/evidence/configure-<run-id>.md` remains local and ignored. The mechanism is the QFAI-managed block `npx qfai init` writes into the **project root** `.gitignore` (marker `# ── QFAI managed (generated by qfai init) ──`), which ignores everything under `.qfai/evidence/`. A project generated by `npx qfai init` has no per-directory `.qfai/evidence/.gitignore`: nothing under the init asset set ships one.
  - Do not commit the configure run file; summarize its key outcomes in the PR description instead.
- You MUST run the mandatory checks listed below and record outcomes.
- You MUST stop and escalate if tooling choices or runnable path remain ambiguous. This stop is a `hard-required` input, not a clarification, so it outlives an exhausted Article VI budget — with the budget spent and the ambiguity unresolved, escalate rather than picking a runner.
- Completion must be approved by a reviewer who did not modify the config.

## Completion Contract (Shared)

Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#completion-contract-shared`. The smallest applicable smoke check is one terminating command from the documented runnable path plus `npx qfai doctor --fail-on error`. Require `traceability.testGlobs` to report `[ok]`; exit 0 with a warning or truncated scan does not prove test discovery. Also run `npx qfai validate --fail-on error` and inspect `.qfai/report/validate.json#issues` by code. Resolve config and test-glob errors this skill owns, including `QFAI-SCAN-002`; report `QFAI-STORY-006` through `QFAI-STORY-009` uncovered obligations to the testing stage. A path recorded but never executed is UNRUN.
Follow `.qfai/assistant/rule/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

## Goal

Analyze the repository and update `qfai.config.yaml` so traceability checks are actionable, with a documented minimum runnable path.

Note: /qfai-sdd includes a preflight step that bootstraps missing config/steering when run directly after init.
/qfai-configure remains the recommended way to tune `qfai.config.yaml` early with a clean, minimal diff.

## Success Criteria (Definition of Done)

- `qfai.config.yaml` is updated with a **minimal diff** focused on traceability globs.
- `validation.traceability.testFileGlobs` reflects the real test layout.
  - `npx qfai init` ships this empty on purpose. Detect the stack before setting it — `pyproject.toml` / `setup.cfg` (Python), `go.mod` (Go), `pom.xml` / `build.gradle` (JVM), `Cargo.toml` (Rust), `package.json` (JS/TS), `Gemfile` (Ruby), `composer.json` (PHP) — and derive globs from the test paths that actually exist, not from the language's convention alone.
  - Cross-check the matched files against the business flows, acceptance criteria, and examples under `.qfai/spec/02_business-flow/`. BF needs E2E coverage, AC needs integration or API coverage, and EX needs a selected non-E2E test.
  - The evidence file MUST show at least one matched file per declared test layer (unit / integration / api / e2e / component as applicable). A layer with zero matched files is a blocking gap, not a note.
  - A scan failure is `QFAI-SCAN-002`; the run is not done until the configured selection scans completely. `QFAI-STORY-006` through `QFAI-STORY-009` report uncovered BF, AC, and EX obligations for the testing stages.
- `validation.traceability.testFileExcludeGlobs` is added only when needed.
- A validation checklist with evidence (sample matched files) is produced.
- Project-owned policy and contract files are filled or refreshed from evidence, or marked `TBD` when evidence is missing. Keep quality-gate commands solely in `03_contract/tech.md` under Standard commands.
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
- the Standard commands section in `03_contract/tech.md` and the commands actually executed

Read `references/configure-evidence.md` when you create the evidence file. It holds the required sections and a template for the file. Not needed before then.

## Non-Negotiable Principles (QFAI Articles)

Read `references/principles.md` when the steps below do not settle a choice: code disagrees with the spec, a gap blocks correctness, or you are unsure a question is worth asking. It holds the seven principles this skill works by. Not needed while the steps answer the question.

## README Rule

Do not create `.qfai/**/README.md` files as scaffold or format documentation; keep artifact guidance in skill references/templates.

- READMEs are reference guides. Follow their structure, templates, and checklists.

## Absolute Rule - Output Language

**All outputs MUST be written in the user's working language for this session.**

- If the user writes in Japanese, output Japanese.
- If the user writes in English, output English.
- If the user mixes languages, prefer the dominant language unless explicitly instructed otherwise.  
  This rule overrides all other stylistic preferences.

## Multi-Role Orchestration (Subagents)

Use the platform's native sub-agent delegation mechanism for Claude Code, GitHub Copilot, and Codex.

### Delegation order

Use `.qfai/assistant/rule/agent-selection.md` as the routing SSOT.

- First required delegation / Capability Probe: `delivery-planner` in the `analysis` phase.
- Then follow routed phases in order: `analysis` (`delivery-planner`, `qa-strategist`) -> `config` (`devops-ci-engineer`) -> `review` (`completion-reviewer`, `qa-gatekeeper`).
- Do not prepend non-routed roles before the first required delegation attempt.

### Delegation contract (tool-neutral)

```text
Role: delivery-planner
Task title: Analyze repo and propose testFileGlobs
Goal: Tune qfai.config.yaml with a minimal diff
Inputs:
- relevant steering and repo layout
Constraints:
- minimal diff
- evidence-first
Return:
- proposed globs + rationale + evidence refs
```

### Failure rule

- The first required delegation attempt doubles as the capability check.
- If that delegation fails, stop immediately. Do not simulate roles or continue with self-execution.

## Completion Separation (mandatory)

- Config changes (`devops-ci-engineer`) and completion approval (`completion-reviewer`) must be separate.
- `qa-gatekeeper` must confirm evidence sampling before approval.

## Context Refresh (mandatory for long tasks)

Every 5 major actions, pause and restate:

- DoD and prohibited "done" criteria
- Evidence samples collected vs missing
- Config changes and steering updates completed

## Constraints

- Only update `qfai.config.yaml`, project-owned policy and contract files under `.qfai/spec/`, and `.qfai/evidence/configure-<run-id>.md` unless explicitly asked.
- Do **not** modify tests or source code.
- Avoid overly broad globs (e.g., `**/*`).
- Exclude generated/output directories (`node_modules`, `.git`, `.qfai`, `dist`, `build`, `coverage`, `.next`, `out`, etc.).
- Write no `validation.require` key; the sections of a story-tree document come from the shipped schemas.

## Step 0 - Load Context (always)

1. Read relevant **project steering** (if present):
   - `.qfai/spec/01_policy/objective.md`
   - `.qfai/spec/01_policy/initiative.md`
   - `.qfai/spec/03_contract/tech.md`
   - `.qfai/assistant/rule/agent-selection.md`, and
   - the acting role's card under `.qfai/assistant/agent/`.

2. Read **project constitution / instructions** (if present):
   - `.qfai/assistant/rule/constitution.md`
   - `.qfai/assistant/rule/workflow.md` (or equivalent)
   - `.qfai/assistant/rule/quality.md` for general gate policy. Reconcile
     project commands against the toolchain detected in step 3, and record
     them only under `03_contract/tech.md#standard-commands-copy-paste`.

3. Inspect repo conventions:
   - package manager (pnpm/npm/yarn), test runner, lint/typecheck scripts, CI definitions
   - existing test patterns (unit/integration/e2e)

4. Inspect project-owned policy and contract files for placeholders.

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
4. Inspect the story tree and its tests to identify which BF, AC, and EX layers are present.

## Step 2 - Propose glob patterns

Provide 3-10 **include globs** that cover all known test locations:

- Prefer explicit patterns (e.g., `src/**/*.test.ts`, `tests/**/*.spec.ts`).
- Include src-colocated tests if they exist.

Provide **exclude globs** only when necessary (beyond the default exclusions).

## Step 3 - Update project context (evidence-first)

Fill steering templates with repo evidence.

- Keep existing content when already accurate.
- When evidence is missing, write `TBD` and record what is missing.
- Do not invent facts.
- Fill `03_contract/tech.md` in its template's shape: a Stack row for the runtime, the platform and each tool detected, each runtime dependency with its reason, and the quality-gate commands under Standard commands, one labelled item each. It holds no rule and no constraint; a constraint goes to `01_policy/constraint.md`.

## Step 4 - Update `qfai.config.yaml` (minimal diff)

Edit:

- `validation.traceability.testFileGlobs`
- `validation.traceability.testFileExcludeGlobs` (only if needed)
- `routing` or `reviewProfiles` only when the project needs an override; each matching entry replaces the shipped default as a whole
- `uiux.surfacePaths`: the repository-relative globs of the paths observed to render a user-visible surface, or `[]` when the repository renders none. Keep an existing value unless the user asks to change it. An absent key leaves the UI impact decision unevaluable.

Keep all other config keys unchanged.

## Step 5 - Evidence sampling

Sample 5-15 actual test files that match the proposed globs.

- If zero matches exist, stop and ask for clarification. Under `--auto` do not ask:
  zero matches leave nothing to assume from, so stop with the empty match set reported
  as a blocker and leave `testFileGlobs` unchanged.
  This stop is **not subject to the Article VI budget** — it is a `hard-required`
  input this run consumes, so it survives clarification-exhausted mode. Do not
  assume a glob and do not write the key; report the unresolved glob as the
  blocker.
- If some directories are ambiguous, list them as Open Questions.

## Completion

Read `references/completion.md` once Step 5 is done and before you declare DONE. It holds the checkpoints, the output to provide, the DONE declaration, the final and completion checklists, and the next actions to offer the user. Not needed before then.

## Default Autopilot Policy

The skill collapses avoidable per-session prompts to 0-1 by classifying every decision into one of three named buckets:

- auto-decide:
  - output formatting
  - ID / sequence numbering
  - append-vs-create on subject overlap
  - equivalent-option pick
- ask-user:
  - CREATE / DELETE / SPLIT / MERGE / SUPERSEDE / UPDATE:REMOVE triage operations (each with a prompt template that names the target and rationale)
  - destructive operations (rm / overwrite / force-push)
  - version-pin changes (`package.json#version`, branch pin)
  - scope expansions outside the active envelope
- hard-required:
  - brand intent
  - a business-flow ID when the user requests flow-scoped configuration and the target cannot be inferred
  - a `testFileGlobs` proposal that matches at least one real file (Step 5)
  - a resolved tooling choice with a runnable path (CRITICAL CONSTRAINTS)
    — neither this nor the proposal above has a defensible default, and a guess
    is saved as if it were evidence

project_memory:

- qfai-configure is the user-facing entrypoint for editing `qfai.config.yaml`, including the `routing:` and `reviewProfiles:` overrides. The package supplies their defaults; an override replaces a matching entry as a whole.
- Each agent card under `.qfai/assistant/agent/` is the sole definition of that role. Edit the card to change its mission or other role metadata.
- Run after every major workflow change to refresh the consuming project to the current QFAI baseline. Do NOT edit `qfai.config.yaml` directly when the skill is available.
