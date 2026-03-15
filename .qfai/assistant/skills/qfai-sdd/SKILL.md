---
name: qfai-sdd
title: QFAI SDD Unified (Outline/Slice/Plan/Delta)
description: "Create and update layered SDD artifacts (\_policies + spec-XXXX) in one workflow."
argument-hint: "[<spec-id-or-name>] [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    Planner,
    Architect,
    RequirementsAnalyst,
    SpecWriter,
    TraceabilityBuilder,
    TestStrategist,
    QAEngineer,
    CodeReviewer,
  ]
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-sdd - Unified SDD Workflow

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

- When a question to the user is needed (e.g., OQ resolution, NFR priority decisions),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

## FORMAT SSOT (Mandatory)

- Before writing or editing any `.qfai/**` artifact, read and follow:
  - `.qfai/require/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/contracts/**/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/review-roster.yml`
  - `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`
- Use skill-local templates as SSOT:
  - `.qfai/assistant/skills/qfai-sdd/templates/report/preflight_summary.md`
- Do NOT duplicate templates directly in this workflow markdown.
- Completion requires a format self-check in evidence.

## Inputs Priority (Preflight)

Determine preflight input in this order:

1. Latest `.qfai/discussion/discussion-*/` pack (lexicographically largest)
2. Validate that the latest discussion-pack has all required files (`01_Context.md` .. `99_delta.md`), minimum contents, and no blocking OQ.
3. If validation fails, stop `/qfai-sdd` and guide to:
   - `/qfai-discussion` for discussion-pack generation/fix

Then read inputs in this order:

- P1: `.qfai/assistant/instructions/*`
- P2: `.qfai/assistant/steering/*`
- P3: existing `.qfai/specs/<spec-id>/**` (if updating)
- P4: `.qfai/discuss/**`, `.qfai/require/**`, `.qfai/contracts/**`

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

- Delegate: SpecWriter + TraceabilityBuilder draft shared/spec layered artifacts and edge mappings.
- Delegate: Architect + TestStrategist draft and finalize `10_Plan.md` (How-only plan).
- Integrate: Orchestrator consolidates delegated outputs and presents them to the user for confirmation.
- Gate: Reviewer is delegated independently and returns only `PASS` or `REVISE`.
- Orchestrator must not draft the primary artifact body and must not self-approve.

### No-argument batch delegation (MUST)

- If `/qfai-sdd` is invoked without `<spec-id-or-name>`, treat the run as an all-capability batch.
- Enumerate targets from `.qfai/specs/_policies/03_Capabilities.md` and keep `spec-0001..N` mapping stable by Capability order.
- In batch mode, run Contracts-first and Outline exactly once as shared outputs.
- Delegate Slice in parallel per spec:
  - `SpecWriter + TraceabilityBuilder` own `spec-XXXX/01..08`.
- After each spec passes Slice gate, delegate Plan in parallel per spec:
  - `Architect + TestStrategist` own `spec-XXXX/10_Plan.md`.
- Delegate Delta in parallel per spec:
  - `SpecWriter` (or `DocSteward`) owns `spec-XXXX/09_delta.md` with `Adopted/Rejected` and rejected guardrails (`DO NOT`, `Temptation`).
- Validate gate and Review gate run once at batch tail after all target specs are integrated.
- Evidence is mandatory per spec: `.qfai/evidence/sdd-spec-XXXX.md`.
- Optional batch summary is allowed: `.qfai/evidence/sdd-batch-<timestamp>.md`.
- Every per-spec evidence MUST include `## Work Orders Summary`.

### Reviewer Gate (MUST)

- Final completion gate MUST be delegated to an independent Reviewer sub-agent.
- Reviewer checks (minimum):
  - Required roles were delegated (no orchestrator self-authoring).
  - DoD satisfied (validate gate, test-layer hard gate, evidence, DR-IDs).
  - Validate gate evidence exists and is fresh:
    - `qfai validate --fail-on error --format github` completed with `error=0`.
    - `.qfai/report/validate.log` and `.qfai/report/specs-coverage/spec-*.md` are present.
  - Layer coverage hard gates are all clear:
    - `QFAI-COV-201/202/203/204/205/206` are `0`.
    - ATDD annotation hard gates are all clear when test assets are part of scope:
      - `QFAI-ATDD-101/102/103/111/112/113/121/122` are `0`.
    - `QFAI-COV-207` warnings are reviewed as density-smell signals.
  - **Drift Protocol enforced**:
    - No upstream artifact edits were made without an explicit user-approved Change Request.
    - If upstream changes exist, the correct owner skill was re-run after approval; downstream did not patch upstream directly.
  - **Test-layer policy enforced**:
    - E2E/API/Integration coverage aligns with `steering/test-layers.md` and the project plan.
    - Do not use pyramid ratios as a gate; use floors/ratios only as signals. Coverage obligations are the gate.
    - Test implementation guidance is explicit for downstream phases:
      - `tests/e2e/**` -> `QFAI:SPEC-XXXX:US-YYYY`
      - `tests/integration/**` -> `QFAI:SPEC-XXXX:TC-YYYY`
      - `tests/api/**` -> `QFAI:CON-API-XXXX` (and no TC annotations)
- Do not declare DONE or handoff until Reviewer returns `PASS`.
- **全レビュアー共通: 代替案提示義務**:
  - 全てのレビュアーは FAIL 判定時に具体的な代替案・修正案を必ず提示しなければならない。代替案のないフィードバックは無効とし、再判定を要求する。
- **devils-advocate gate**:
  - devils-advocate の FAIL には具体的代替案が含まれていること。代替案なしの FAIL は再判定を要求する。
  - 3 回連続 FAIL の場合、アドバイザリー降格を記録し、次フェーズへの進行を許可する。
- **pattern-doubler gate**:
  - pattern-doubler が追加提案した各パターンに根拠が付与されていること。
  - ID 付き項目のカウント方法は US/AC/BR/EX/TC プレフィックスの連番形式 ID のみ。

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

## Review Cycle Protocol (RCP)

- Roster SSOT: `.qfai/assistant/steering/review-roster.yml`.
- Footer SSOT: `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
- Every discuss/require/sdd review cycle must execute the full roster.
- Allowed reviewer verdicts: `PASS`, `FAIL`, `N/A` (`N/A` requires `na_rule` reason).
- Any `FAIL` triggers return/fix/full-rerun from the first reviewer.
- `fixed` is forbidden until all reviewers are `PASS` or valid `N/A`.
- Execution order: existing 10 reviewers (1-10) → devils-advocate (11) → pattern-doubler (12).
- devils-advocate (11番目):
  - `can_be_na: false` — N/A は許可されない。
  - FAIL 時は必ず具体的代替案（あるべき姿）を提示すること。代替案なしの FAIL は無効。
  - 3 回連続 FAIL → アドバイザリー降格（当該レビューサイクル限定）。降格後はブロッキング力消失。
- pattern-doubler (12番目):
  - `can_be_na: true` — ID 付き項目のない成果物の場合のみ N/A 可。
  - ID 付き項目（US, AC, BR, EX, TC）の現行数に対して 2 倍の目標を設定し、不足パターンを指摘する。
  - 追加パターンの根拠提示が必須。

## Stage 0 - Steering completion refresh (mandatory)

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

- Do NOT reintroduce options marked as rejected in `09_delta.md` (or `*_delta.md`).
- If a rejected option must be reconsidered, add a `[RE-OPEN]` decision record with explicit approval evidence.

## Workflow Convention (Mandatory)

- **This skill proceeds in this exact order: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update.**
- **Upper-to-lower references are forbidden. Lower-to-upper references are allowed.**
- **Connections between layers MUST be represented by IDs and required edges (`US->AC->BR->EX->TC`).**
- **Plan finalize MUST happen after at least one user-story slice is grounded.**
- **Unresolved items MUST be moved to `08_Open-questions.md` (spec scope) or `_policies/09_Open-questions.md` (shared scope).**

## Arguments and Target Selection (Mandatory)

- With argument (`/qfai-sdd <spec-id-or-name> [--auto]`): update only the matched single spec target.
- Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.
- If `_policies/03_Capabilities.md` does not exist, bootstrap shared templates first, then enumerate capabilities.
- Capability order in `_policies/03_Capabilities.md` is SSOT for `spec-0001..N` assignment and ID stability.
- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.
- Batch policy (no argument):
  - Contracts-first/Outline: once per batch.
  - Slice/Plan/Delta: once per target spec (parallel delegation required).
  - Validate/RCP: once at the batch tail after integrating all target specs.

## CRITICAL CONSTRAINTS (Read First)

- This unified entrypoint owns the full SDD flow directly (preflight + shared/spec artifacts + plan); do not route to deprecated split entrypoints.
- Use only skill-local templates:
  - `.qfai/assistant/skills/qfai-sdd/templates/specs/`
  - `.qfai/assistant/skills/qfai-sdd/templates/contracts/`
- Always write `.qfai/report/preflight_summary.md` before generating shared/spec artifacts.
- Contracts are contract-first mandatory outputs in this skill:
  - create/update `.qfai/contracts/(api|db|ui)/**` before shared/spec slices
  - `_policies/05_Contracts.md` must include a Contract Index with short IDs (`DB-001`, `API-001`, `UI-001`)
  - every indexed short ID must map to a declared file with `QFAI-CONTRACT-ID`:
    - `DB-001 -> CON-DB-0001 -> db-0001-<slug>.sql`
    - `API-001 -> CON-API-0001 -> api-0001-<slug>.yaml`
    - `UI-001 -> CON-UI-0001 -> ui-0001-<slug>.yaml`
  - `<slug>` comes from entity/router/screen and must be sanitized to kebab-case
  - allocate new contract IDs by scanning existing declarations and using next sequential NNNN per kind
  - never duplicate existing declared IDs; update in-place when the contract already exists
  - contract stubs must be syntactically valid (OpenAPI YAML / UI YAML / executable SQL skeleton)
- `/qfai-sdd` must stop when discussion-pack is missing/incomplete or has blocking OQ (guide to `/qfai-discussion` first).
- Review roster is fixed by `.qfai/assistant/steering/review-roster.yml` and must be executed in full.
- RCP wording must be sourced from `.qfai/assistant/skills/qfai-sdd/references/rcp_footer.md`.
- `_policies/04_Business-Flow.md` must be Markdown and include at least one Mermaid `flowchart` or `sequenceDiagram`.
- Business Flow must not be authored as Gherkin (`*Business-flow*.feature` is deprecated).
- If diagrams are written in discuss/require/spec/evidence artifacts, Mermaid syntax must be inside ` ```mermaid ` fences only.
- `05_Examples.md` must include `EX-ID` and `BR-Ref` mappings.
- `06_Test-Cases.md` must include `TC-ID`, `EX-Ref`, and `AC-Refs`.
- Do not complete this stage until:
  - `qfai validate --fail-on error --format github | tee .qfai/report/validate.log` exits successfully.
  - `.qfai/report/specs-coverage/spec-*.md` has been read for density review.
- Reference direction rules from `.qfai/specs/README.md` must be enforced:
  - upper-to-lower references are forbidden
  - lower-to-upper references are allowed
- Keep `specs/` definition-only and keep operational status as execution logs under `.qfai/report/run-*`.
- BR/Examples/Test-cases depth must be explicit:
  - BR decomposes AC into decision-level rules.
  - Examples concretize BR.
  - Test-cases realize Examples.
  - If counts are intentionally sparse, document reason and completion plan.
- Do not leave ambiguity untracked:
  - ask the user when certainty is below threshold
  - unresolved decisions become explicit Open Questions

### Phase 0 - Contracts-first (mandatory)

Create/update:

- `.qfai/contracts/api/**`
- `.qfai/contracts/db/**`
- `.qfai/contracts/ui/**`
- `_policies/05_Contracts.md` Contract Index table (DB/API/UI short IDs)

Rules:

- This phase MUST complete before Outline/Slice.
- If `_policies/05_Contracts.md` lists an ID, the corresponding declared contract file MUST exist.
- If a contract is empty, create a valid minimal stub and include `QFAI-CONTRACT-ID`.
- `none` is allowed only when there is no contract impact and rationale is written.

### Phase 1 - Outline (layer-first)

Create/update:

- `_policies/01_Objective.md`
- `_policies/02_Initiative.md`
- `_policies/03_Capabilities.md`
- `_policies/04_Business-Flow.md`
- `_policies/05_Contracts.md`
- `_policies/06_Glossary.md`
- `_policies/07_Constraints.md`
- `_policies/08_Decisions.md`
- `_policies/09_Open-questions.md`
- `_policies/10_delta.md`

Rules:

- Temporary `TBD` is allowed, but each `TBD` must be mirrored into `_policies/09_Open-questions.md`.
- `_policies/04_Business-Flow.md` must include Mermaid and keep diagram syntax inside ` ```mermaid ` fences.
- `_policies/08_Decisions.md` and `_policies/10_delta.md` must exist even when empty, and must explicitly state `0 items`.

### Phase 2 - Slice (slice-first)

Create/update:

- `spec-XXXX/01_Spec.md`
- `spec-XXXX/02_User-stories.md`
- `spec-XXXX/03_Acceptance-Criteria.md`
- `spec-XXXX/04_Business-Rules.md`
- `spec-XXXX/05_Examples.md`
- `spec-XXXX/06_Test-Cases.md`
- `spec-XXXX/07_Decisions.md`
- `spec-XXXX/08_Open-questions.md`

Slice gate (must pass before Phase 3):

- For each US, AC must exist.
- For each AC, BR and SC must exist.
- For each TC, EX reference must exist.
- `SC` tags must align with the target `spec-XXXX` namespace.
- `07_Decisions.md` and `08_Open-questions.md` must exist even when empty and include explicit `0 items` statements.
- `01_Spec.md` is the execution Primary SSOT and MUST copy down applicable NFR, policy, evidence summary, relevant requirements, and an Escalation Hook to `_policies`.

### Phase 3 - Plan finalize

Create/update:

- `spec-XXXX/10_Plan.md`

Rules:

- Finalize only after at least one user-story slice has passed Phase 2 gate.
- `spec-XXXX/10_Plan.md` is the single source of truth for How.
- Do not create `specs/plan.md`.

### Phase 4 - Delta update

Create/update:

- `spec-XXXX/09_delta.md` (or `spec-XXXX/*_delta.md`)

Rules:

- Record adoption/rejection rationale.
- Rejected section MUST include `DO NOT` and `Temptation`.

## Completion Contract (Shared)

Before declaring completion, you MUST:

- OQ / undefined resolution: resolve ambiguity or explicitly defer with rationale and approval evidence.
- Deliverable completeness: verify all required artifacts and sections are present.
- OQ / placeholder scan: remove unresolved placeholders (`TBD`, `TODO`, `???`, `OPEN QUESTION`, etc.) unless explicitly deferred.
- Run static checks proving the pack is reviewable.
- Run validate gate and keep evidence:
  - `qfai validate --fail-on error --format github | tee .qfai/report/validate.log`
  - `.qfai/report/specs-coverage/spec-*.md`
- If validate fails, fix spec-layer sources and rerun validate until `error=0`.
- Do not patch upstream intent from downstream artifacts (Drift Protocol applies).

## Goal

Create or update layered SDD artifacts in one run so downstream execution phases can start without command switching.

## Non-goals

- Writing production code or runnable tests.
- Skipping phase order or bypassing slice/plan gates.
- Reintroducing rejected options without explicit re-open approval.

## Mandatory Outputs

- `.qfai/specs/_policies/01_Objective.md`
- `.qfai/specs/_policies/02_Initiative.md`
- `.qfai/specs/_policies/03_Capabilities.md`
- `.qfai/specs/_policies/04_Business-Flow.md`
- `.qfai/specs/_policies/05_Contracts.md`
- `.qfai/specs/_policies/06_Glossary.md`
- `.qfai/specs/_policies/07_Constraints.md`
- `.qfai/specs/_policies/08_Decisions.md`
- `.qfai/specs/_policies/09_Open-questions.md`
- `.qfai/specs/_policies/10_delta.md`
- `.qfai/specs/spec-XXXX/01_Spec.md`
- `.qfai/specs/spec-XXXX/02_User-stories.md`
- `.qfai/specs/spec-XXXX/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-XXXX/04_Business-Rules.md`
- `.qfai/specs/spec-XXXX/05_Examples.md`
- `.qfai/specs/spec-XXXX/06_Test-Cases.md`
- `.qfai/specs/spec-XXXX/07_Decisions.md`
- `.qfai/specs/spec-XXXX/08_Open-questions.md`
- `.qfai/specs/spec-XXXX/10_Plan.md`
- `.qfai/specs/spec-XXXX/09_delta.md` (or `*_delta.md`)
- Updated contracts under `.qfai/contracts/**` (mandatory in this workflow)
- `.qfai/report/preflight_summary.md`
- Evidence file (per target spec): `.qfai/evidence/sdd-spec-XXXX.md`

## Required Process

1. Detect latest discussion-pack (`.qfai/discussion/discussion-*`, lexicographically largest) and run readiness checks.
2. If readiness checks fail, stop and show blockers with `/qfai-discussion`.
3. Analyze repository context, existing artifacts, constraints, and open decisions.
4. Write `.qfai/report/preflight_summary.md` from `templates/report/preflight_summary.md`.
5. Execute Phase 0 (Contracts-first) and ensure `_policies/05_Contracts.md` index and `.qfai/contracts/**` are aligned.
6. Execute Phase 1 (Outline) in layer-first order.
7. Execute Phase 2 (Slice) and pass slice gate for each target spec (single target: at least one user-story slice; no-argument batch: all enumerated specs).
8. Execute Phase 3 (Plan finalize) and make every target `10_Plan.md` actionable as How-only.
9. Execute Phase 4 (Delta update) and record adoption/rejection rationale for every target spec.
10. Run `qfai validate --fail-on error --format github | tee .qfai/report/validate.log`.
11. Run Density Review Pass using `.qfai/report/specs-coverage/spec-*.md` and `QFAI-COV-207` warnings.
12. If any validate error exists, fix the source layer table(s) and repeat steps 10-11 until `error=0`.
13. Record static checks, validate evidence, and density review outcomes in evidence.

## Unified SDD Quality Gate

Run static checks:

- Confirm required `_policies` and `spec-XXXX` layered files exist.
- Confirm `_policies/04_Business-Flow.md` includes Mermaid and at least one `flowchart` or `sequenceDiagram`.
- Confirm `01_Spec.md` includes copy-down context and Escalation Hook to `_policies`.
- Confirm Mermaid syntax is not written in ` ```text ` or language-less fences.
- Confirm `05_Examples.md` provides `EX-ID` + `BR-Ref` mappings.
- Confirm `06_Test-Cases.md` provides `TC-ID` + `EX-Ref` + `AC-Refs`.
- Confirm reference direction follows lower-to-upper only.
- Confirm required edges `US -> AC -> BR -> EX -> TC`.
- Confirm BR/Examples/Test-cases contain non-empty IDs and coverage mapping.
- Confirm `QFAI-COV-201/202/203/204/205/206` are zero.
- Confirm `QFAI-ATDD-101/102/103/111/112/113/121/122` are zero when test assets are in review scope.
- Confirm `.qfai/report/specs-coverage/spec-*.md` was reviewed and `QFAI-COV-207` warnings were triaged.
- Confirm `10_Plan.md` exists and contains implementation/test strategy as How-only.
- Confirm `specs/plan.md` does not exist.
- Confirm `09_delta.md` (or `*_delta.md`) includes rejected guardrails (`DO NOT`, `Temptation`) when rejections exist.

## Evidence (MANDATORY)

Create and update: `.qfai/evidence/sdd-<spec-id>.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Preflight summary path (`.qfai/report/preflight_summary.md`)
- Open questions summary (Open/Answered/Deferred)
- Decisions made (with rationale)
- Work performed (what changed, where)
- Commands executed + key outputs
- Validate evidence paths (`.qfai/report/validate.log`, `.qfai/report/specs-coverage/spec-*.md`)
- Gaps / Open risks
- Final status (PASS/FAIL) + who confirmed

## DONE Declaration (Mandatory Output)

When declaring DONE, include:

- Referenced inputs and spec-id
- Confirmation of phase order: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update
- Decision record IDs touched in `09_delta.md` (or `*_delta.md`)
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Unified SDD quality gate result

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] `.qfai/report/preflight_summary.md` was generated before spec authoring.
- [ ] Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update order was preserved.
- [ ] `_policies/05_Contracts.md` index and `.qfai/contracts/**` declared files are aligned.
- [ ] Upper-to-lower references were not introduced.
- [ ] At least one user-story slice passed gate before plan finalization.
- [ ] Required `_policies` + `spec-XXXX` outputs exist and are internally consistent.
- [ ] `_policies/04_Business-Flow.md` is Markdown + Mermaid (`flowchart` or `sequenceDiagram`).
- [ ] Mermaid syntax was not written in ` ```text ` or language-less fences.
- [ ] `10_Plan.md` is finalized with implementation/test strategy (How-only).
- [ ] `specs/plan.md` was not created.
- [ ] `09_delta.md` (or `*_delta.md`) contains adoption/rejection rationale.
- [ ] `qfai validate --fail-on error --format github` ran and produced `error=0`.
- [ ] `QFAI-COV-201/202/203/204/205/206` are all zero.
- [ ] `QFAI-ATDD-101/102/103/111/112/113/121/122` are all zero when test assets are in scope.
- [ ] `.qfai/report/specs-coverage/spec-*.md` was reviewed for density-smell signals (`QFAI-COV-207`).
- [ ] Unresolved items are tracked in shared/spec Open Questions files.
- [ ] Quality gate checks are recorded in evidence.
- [ ] Evidence file exists and is complete.
- [ ] Reviewer approval is recorded.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Diagram artifacts follow Mermaid fence rules (if diagrams were used).
- [ ] Open questions were logged to the proper OQ file (if applicable).
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Completion Message & Next Actions (MUST)

When this skill is complete, provide a final user-facing completion message and enumerate all actionable next steps.

- Proceed (recommended): `/qfai-prototyping`.
  Action: build contract-aligned skeleton implementation before deeper coding.
- Test-first path: `/qfai-atdd`.
  Action: implement acceptance tests from the finalized spec pack.
- Contracts status:
  Action: confirm contracts were created/updated under `.qfai/contracts/**` and referenced by `_policies/05_Contracts.md`.
- Spec pack needs correction: rerun `/qfai-sdd`.
  Action: fix layered `_policies + spec-XXXX` consistency and decision records, then regenerate evidence.
