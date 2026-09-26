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

- Before writing or editing any `.qfai/**` artifact, read the relevant skill-local reference or template:
  - `.qfai/assistant/skill/qfai-discussion/references/discussion-artifact-rules.md`
  - `.qfai/assistant/skill/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skill/qfai-sdd/references/contract-artifact-rules.md`
  - `.qfai/assistant/skill/qfai-prototyping/references/evidence-requirements.md`

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
  - The run-scoped `.qfai/evidence/configure-<run-id>.md` remains local and ignored. The mechanism is the QFAI-managed block `npx qfai init` writes into the **project root** `.gitignore` (marker `# ── QFAI managed (generated by qfai init) ──`), which carries `.qfai/evidence/*`. A project generated by `npx qfai init` has no per-directory `.qfai/evidence/.gitignore`: nothing under the init asset set ships one, so an operator who needs to change what is tracked edits the root file, not a directory-local one. (qfai's own repository does carry that file, as a working-tree file outside the init assets — which is why the claim above used to read the other way.)
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
- Do not use `validation.require.specSections` for the story tree. Its fixed files and sections are defined by the shipped schemas.
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
- policy and contract files:

## Gaps / Open risks

## Final status (PASS/FAIL) + who confirmed
```

## Non-Negotiable Principles (QFAI Articles)

These principles are inspired by "constitution / articles" patterns used by other agent frameworks, but adapted to QFAI.

1. **SDD First (Specification is the source of truth)**  
   If there is a conflict between code and spec, treat the spec as authoritative and either (a) fix code or (b) raise an explicit Open Question to change the spec.

2. **Traceability is mandatory**  
   Every meaningful change must connect a business flow, story, acceptance criterion, example, test, code, and verification evidence. BF is covered by E2E tests, AC by integration or API tests, and EX by a selected non-E2E test. Full rule: `.qfai/assistant/rule/constitution.md` Article V.

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
- Keep `validation.require.specSections` unchanged; story-tree structure comes from the shipped schemas.

## Step 0 - Load Context (always)

1. Read relevant **project steering** (if present):
   - `.qfai/spec/01_policy/objective.md`
   - `.qfai/spec/01_policy/initiative.md`
   - `.qfai/spec/03_contract/tech.md`
   - `.qfai/spec/03_contract/structure.md`
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
- Keep quality-gate commands in `03_contract/tech.md` under Standard commands.
- In `03_contract/structure.md#ui-surface-paths-ssot`, replace placeholder bullets with actual UI globs, or with `none` when the repo renders no user-visible surface. An unresolved field leaves the UI impact decision unevaluable.

## Step 4 - Update `qfai.config.yaml` (minimal diff)

Edit:

- `validation.traceability.testFileGlobs`
- `validation.traceability.testFileExcludeGlobs` (only if needed)
- `routing` or `reviewProfiles` only when the project needs an override; each matching entry replaces the shipped default as a whole

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

## Checkpoints

- [ ] Repository analysis completed (frameworks, test layout, naming rules).
- [ ] Project-owned policy and contract files updated with evidence or `TBD`.
- [ ] Standard commands recorded only in `03_contract/tech.md`.
- [ ] Proposed include/exclude globs with rationale.
- [ ] `qfai.config.yaml` updated (minimal diff).
- [ ] BF, AC, and EX test layers inspected.
- [ ] Evidence: sample matched files listed.

## Output

Provide:

1. Updated `qfai.config.yaml` (diff or full file, as appropriate).
2. Updated project-owned policy and contract files (diff or summary).
3. A short summary of changes and rationale.
4. Validation checklist with sampled files.
5. If routing or review profiles changed, list each whole-entry override and its reason.
6. Open questions (blocking vs non-blocking).

Suggest next step: `/qfai-discussion` (or rerun `/qfai-configure` if configuration is not ready).

## DONE Declaration (Mandatory Output)

When you declare DONE, include:

- Referenced inputs: instructions, project context, `decisions.md`, and any applicable story.
- DEC IDs referenced (or "none" when no decision applies).
- Confirmation that no rejected option was reintroduced.

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Evidence file exists and is complete.
- [ ] All mandatory checks were executed and recorded.
- [ ] No untracked gaps remain (or they are explicitly documented).
- [ ] Completion approved by a reviewer who did not modify the config.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Open questions that place a **new obligation on the product** were routed to the owner phase (`/qfai-sdd`) as an advisory / Change Request proposal per `.qfai/assistant/rule/drift-protocol.md#reviewer-originated-obligations`; questions about this skill's own inputs or settings stay in its own output for the user to answer. This skill does not write `08_Open-questions.md`.
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

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and
MAY instantiate a category entry — `approval-required governance operations` — with the
operations its own run cannot authorize for itself. `hard-required` also takes the
undefaultable inputs this skill itself consumes, declared per skill and checked against
that declaration; the bucket is what a run cannot proceed without, and no prototype can
enumerate that for a skill it does not know. Otherwise a skill MUST NOT introduce an
entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

project_memory:

- qfai-configure is the user-facing entrypoint for editing `qfai.config.yaml`, including the `routing:` and `reviewProfiles:` overrides. The package supplies their defaults; an override replaces a matching entry as a whole.
- Each agent card under `.qfai/assistant/agent/` is the sole definition of that role. Edit the card to change its mission or other role metadata.
- Run after every major workflow change to refresh the consuming project to the current QFAI baseline. Do NOT edit `qfai.config.yaml` directly when the skill is available.
