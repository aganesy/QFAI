---
name: qfai-discussion
title: QFAI Discussion (Unified Discuss + Require)
description: "Run structured discussion that merges discuss and require into a single 15-file discussion pack with classification-aware prototyping.yaml requiredness and OQ-driven exit."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    discovery-analyst,
    requirements-analyst,
    solution-architect,
    product-experience-architect,
    completion-reviewer,
    requirements-reviewer,
    architecture-reviewer,
    product-surface-reviewer,
  ]
routing-profile: requirements-heavy
mode: interactive-by-default
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-discussion - Unified Discuss + Require

[DRIFT-PROTOCOL:MANDATORY]

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.

Skill-specific examples:

- scope confirmation

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/instructions/shared-skill-operating-baseline.md#format-ssot-mandatory`.
- Before writing artifacts, read:
  - `.qfai/discussion/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/agent-catalog.yml`
  - `.qfai/assistant/steering/agent-routing.yml`
  - `.qfai/assistant/steering/review-profiles.yml`
  - `.qfai/assistant/skills/qfai-discussion/references/review-cycle-playbook.md`
- Keep templates as source of truth and preserve file naming/order.

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/instructions/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides.

### Capability Probe (MUST)

1. Attempt the first required delegation at stage start.
2. Treat that real delegation attempt as the capability check.
3. If the delegation fails, stop the stage immediately and report remediation.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. If the first required delegation fails, stop the stage and report remediation.

## Work Orders Summary

Use the shared schema.

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent `completion-reviewer`.
- Reviewer response must include `Status (PASS/REVISE)`.
- Route specialist reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Default discussion review set:
  - `completion-reviewer`
  - `requirements-reviewer`
- Conditional discussion reviewers:
  - `architecture-reviewer` when architecture-affecting decisions exist
  - `product-surface-reviewer` when the pack is UI-bearing
- Reviewers must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors or ratios are not gates; they are risk signals.
- Do not declare DONE until all routed blocking reviewers return `PASS`; otherwise apply `REVISE`.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS`.
- Required fixed files (all 15 are mandatory):
  - `01_Context.md`
  - `02_Inception-Deck.md`
  - `03_Story-Workshop.md`
  - `04_Sources.md`
  - `05_Scope.md`
  - `06_REQ.md`
  - `07_NFR.md`
  - `08_Glossary.md`
  - `09_Constraints.md`
  - `10_Policy.md`
  - `11_OQ-Register.md`
  - `12_OQ-Resolution-Log.md`
  - `13_Deferred.md`
  - `14_Review-Request.md`
  - `99_delta.md`
- Discussion completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- `deferred` is allowed only when required metadata is complete in `13_Deferred.md`.
- `02_Inception-Deck.md` and `03_Story-Workshop.md` MUST contain Mermaid diagrams in ` ```mermaid ` fences.
- If UI requirements exist, behavior obligations are primary and HTML+CSS mock is optional fallback only.
- UI-bearing discussion packs require `prototyping.yaml`; non-ui discussion packs do not.
- `ui_bearing: true` requires `prototyping.yaml`.
- `ui_bearing: false` means `prototyping.yaml` is not required.
- `prototyping.yaml` must use the canonical namespaced schema under `prototyping:`.
- The canonical namespaced block must include `recommended_mode`, `rationale`, `allowed_modes`, and `surface`.
- Top-level recommendation keys are not supported, and coexistence with namespaced keys is invalid.
- Reviewer routing is derived from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- RCP wording must be sourced from `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`.
- Discussion artifacts are logs and rationale; avoid duplicating finalized spec SSOT.
- Example Mapping is mandatory and must be captured as `Example Seeds` sections in `03_Story-Workshop.md`.
- OQ Register and Deferred tables must contain the canonical fields defined in the references.

## UI-bearing Detection

Use `.qfai/assistant/skills/qfai-discussion/references/ui-bearing-playbook.md` for the full playbook.

### Surface Classification

Classification is based on surface type, not interaction complexity.

| Surface Type | UI-bearing | Sidecar Generation | Notes                        |
| ------------ | ---------- | ------------------ | ---------------------------- |
| web          | Yes        | Full uiux/ sidecar | UI-bearing                   |
| mobile       | Yes        | Full uiux/ sidecar | UI-bearing                   |
| desktop      | Yes        | Full uiux/ sidecar | UI-bearing                   |
| cli          | Yes        | Full uiux/ sidecar | UI-bearing                   |
| mixed        | Yes        | Full uiux/ sidecar | UI-bearing                   |
| non-ui       | No         | No uiux/ directory | non-ui sidecar not generated |

### Detection Signals

- Prefer explicit surface declarations in `01_Context.md`.
- HTML tags, Mermaid screen flows, and UI-related stories are supporting signals.
- Classify by surface type, not by interaction complexity.

### Sidecar Generation Flow

Sidecar steps must execute in the order below. **(no parallel)** across Step 1c and Step 1d — Step 1c MUST complete before Step 1d starts.

- Step 1a — Detect surface type from `01_Context.md`.
- Step 1b — If non-UI, skip steps 1c–1d; no uiux/ directory is created.
- Step 1c — Populate `04_Sources.md` Trend Scan entries for all visual categories (color, typography, visual motif, spacing, shape, imagery), each with an `evaluation_connection` field. **This step MUST finish before Step 1d.**
- Step 1d — Derive trend-based evaluation axes in `uiux/21_design_eval_trend_derived.md`, drawing `source_refs` from the entries completed in Step 1c. Parallel execution with Step 1c is forbidden.
- UI-bearing: generate the full sidecar family and apply UX intent cross-references.
- non-ui: skip sidecar generation entirely; no uiux/ directory, no additional completion conditions.

### UI-bearing Completion Conditions

Use `.qfai/assistant/skills/qfai-discussion/references/discussion-completion-matrix.md` for the full matrix.

UI-bearing completion is blocked until all of the following are true:

1. Strategy is selected in `uiux/10_implementation_strategy.md`.
2. Scoring axes are defined through the 3-layer evaluation family (`uiux/20_design_eval_invariant.md`, `uiux/21_design_eval_trend_derived.md`, `uiux/22_design_eval_product_specific.md`, `uiux/23_design_eval_aggregate.md`, `uiux/24_design_eval_dynamic_overrides.md`).
3. Comparison completed and selected anchor documented in `uiux/30_option_comparison.md` and `uiux/31_selected_anchor_screen.md`.
4. Contracts drafted in `uiux/40_screen_contracts.md`.

### Non-UI Completion

For non-UI projects, no additional UI/UX conditions apply, no sidecar artifacts are required, and `prototyping.yaml` is not required. uiux sidecar generation is skipped.

## UI-bearing Authoring Requirements

- Detection uses **surface type classification** as primary SSOT; HTML tags / Mermaid flows are **supplementary detection hints, not the primary SSOT**. **Non-UI packs are exempt** from sidecar validators (UIX-VAL series) — **zero new issues** when properly classified.
- UI-bearing packs rely on the **canonical sidecar family** as primary truth: `uiux/10_implementation_strategy.md`, `uiux/11_design_taste_interview.md`, `uiux/12_design_system.md`, `uiux/20..24_design_eval_*.md`, `uiux/30_option_comparison.md` (**option comparison**), `uiux/31_selected_anchor_screen.md`, `uiux/40_screen_contracts.md`, `uiux/50_review_input_bundle.md`.
- **Competitive Reference Registry** (`04_Sources.md`) entries must populate `adopted_points`, `rejected_points`, `local_translation`. **Placeholder-like values (TBD/N/A/TODO/empty) are treated as missing**. `99_delta.md` must include `## Rejected Visual Directions` with rationale and recurrence prevention. **Sidecar-family validators** (UIX-VAL series) are the primary quality gates for UI-bearing packs; non-ui packs stay exempt. Playbook detail: `references/ui-bearing-playbook.md` / `references/discussion-completion-matrix.md`.

## Goal

Produce a unified 15-file discussion pack with explicit decisions, requirements, OQ states, and rationale so `/qfai-sdd` starts without unresolved blockers.

## Non-goals

- Editing `.qfai/specs/**` directly
- Writing implementation-level details
- Leaving open blockers hidden in free text

## Mandatory Outputs

- `.qfai/discussion/discussion-*/01_Context.md`
- `.qfai/discussion/discussion-*/02_Inception-Deck.md`
- `.qfai/discussion/discussion-*/03_Story-Workshop.md`
- `.qfai/discussion/discussion-*/04_Sources.md`
- `.qfai/discussion/discussion-*/05_Scope.md`
- `.qfai/discussion/discussion-*/06_REQ.md`
- `.qfai/discussion/discussion-*/07_NFR.md`
- `.qfai/discussion/discussion-*/08_Glossary.md`
- `.qfai/discussion/discussion-*/09_Constraints.md`
- `.qfai/discussion/discussion-*/10_Policy.md`
- `.qfai/discussion/discussion-*/11_OQ-Register.md`
- `.qfai/discussion/discussion-*/12_OQ-Resolution-Log.md`
- `.qfai/discussion/discussion-*/13_Deferred.md`
- `.qfai/discussion/discussion-*/14_Review-Request.md`
- `.qfai/discussion/discussion-*/99_delta.md`
- review artifacts under `.qfai/review/review-YYYYMMDDhhmmssSSS/`
- `.qfai/discussion/discussion-*/prototyping.yaml` when the latest discussion pack is `ui_bearing: true`
- Evidence file: `.qfai/evidence/discussion-YYYYMMDDhhmmssSSS.md`
- Reviewer notes (`PASS` or `REVISE`)

## Required Process

1. Run the core interview for concept, scope, stakeholders, and constraints.
2. Run Inception Deck and include at least one Mermaid diagram.
3. Run Story Workshop, capture user stories and user flows, and keep HTML+CSS mock as optional fallback only.
4. Register source traceability in `04_Sources.md`.
5. Capture scope, REQ, NFR, glossary, constraints, and policies.
6. Run Example Mapping and capture `Example Seeds`.
7. Update `11_OQ-Register.md`, resolve OQs until open count is zero, and move deferred items to `13_Deferred.md`.
8. Update `12_OQ-Resolution-Log.md`, `14_Review-Request.md`, and `99_delta.md`.
9. Generate `prototyping.yaml` only when the latest discussion pack is UI-bearing.
10. Request review and record the Reviewer result.
11. **UI-bearing only — Design system initialization.**
    - **Step 11.3 — Brand archetype selection and design system scaffold (autonomous; skip when `surface: non-ui`).**
      - Phase A (brand autonomous selection): The agent MUST select one of the 8 canonical brand archetypes from `references/design-md-brand-catalog.md` by scoring each archetype against the taste-interview data in `uiux/11_design_taste_interview.md`. No human-confirmation prompt is issued; the agent selects autonomously using the highest aggregate score. When two archetypes tie, apply the tie-breaker: highest visual-theme weight, then alphabetical archetype name. The selected archetype name and rationale MUST be written into `uiux/12_design_system.md` under `## Visual Theme`.
      - Phase B (customization): Apply the selected archetype's `aesthetic_properties` as defaults for Color Palette, Typography, Spacing & Layout, Component Style, and Animation & Motion. Override any default that conflicts with explicit constraints captured in `06_REQ.md`, `09_Constraints.md`, or taste-interview directives. Record each override and its rationale.
      - Step 11.3 is idempotent: running it twice against the same `11_design_taste_interview.md` MUST produce byte-identical `12_design_system.md`.
    - **Step 11.5 — Visual-axis derivation mandate (UI-bearing packs with visual-category Trend Scan entries).**
      Before trend-derived axis finalization for any UI-bearing run, the agent MUST perform design guideline research against the applicable platform or library guidance and record the findings in `04_Sources.md` under `design_guideline_research`. The resulting TRD-XX visual axes MUST then be written in `uiux/21_design_eval_trend_derived.md`.
      For every visual-category Trend Scan entry in `04_Sources.md` (color, typography, visual motif, spacing, shape, imagery), the agent MUST derive at least one corresponding TRD-XX axis in `uiux/21_design_eval_trend_derived.md` with `source_refs` pointing to that entry. If no visual axis is derived despite visual Trend Scan entries existing, UIX-VAL-T04 (WARNING per NFR-0007) will fire at validation time.

Detailed execution guidance lives in:

- `.qfai/assistant/skills/qfai-discussion/references/example-mapping-guide.md`
- `.qfai/assistant/skills/qfai-discussion/references/oq-and-deferred-rules.md`
- `.qfai/assistant/skills/qfai-discussion/references/discussion-coverage-checklist.md`
- `.qfai/assistant/skills/qfai-discussion/references/review-cycle-playbook.md`

## Example Mapping Perspectives (Mandatory)

Use `.qfai/assistant/skills/qfai-discussion/references/example-mapping-guide.md`.

Minimum perspectives that must remain visible:

1. Happy path
2. Negative path
3. Edge or boundary
4. Permission or role
5. State transition when stateful
6. Idempotency or retry when external I/O exists

## OQ Data Model (Mandatory)

`11_OQ-Register.md` must use the canonical fields from `.qfai/assistant/skills/qfai-discussion/references/oq-and-deferred-rules.md`, including:

- `OQ-ID`
- `Gate` (`discussion|sdd|atdd|tdd|ops`)
- `Disposition`
- `Owner`
- `Recommendation`
- `Next-Decision-Point`
- `Evidence`

## Deferred Metadata Rules (Mandatory)

`13_Deferred.md` must use the canonical deferred fields from `.qfai/assistant/skills/qfai-discussion/references/oq-and-deferred-rules.md`.

## Drift Protocol (Mandatory)

At any point during discussion:

1. Record the drift event in `99_delta.md`.
2. Assess impact on all 15 files plus `prototyping.yaml`.
3. Update affected files and re-validate OQ exit conditions.
4. If drift contradicts a rejected option, record recurrence prevention.

## Review Gate Artifacts (RCP)

For each review cycle, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

Use `.qfai/assistant/skills/qfai-discussion/references/review-cycle-playbook.md` for append-only review pack rules, rerun rules, and `summary.json` requirements.

## RCP Footer Include (MUST)

- Include and follow `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`.
- Routing and rerun rules must stay synchronized with `agent-routing.yml` and the footer SSOT.

## Required Coverage Topics

Use `.qfai/assistant/skills/qfai-discussion/references/discussion-coverage-checklist.md`.

Minimum topics that must remain covered:

1. product concept and target users
2. scope boundary and anti-goals
3. user stories and user flows
4. functional requirements with source traceability
5. non-functional requirements with measurable targets
6. security, performance, and operational constraints
7. domain glossary consistency
8. project policies

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` and `03_Story-Workshop.md` include Mermaid diagrams;
- ensure `Example Seeds` coverage is explicit in `03_Story-Workshop.md`;
- ensure UI-related stories include behavior obligations in `03_Story-Workshop.md`;
- ensure UI-bearing sidecars satisfy the completion matrix;
- avoid duplicating finalized spec content in discussion outputs.

## Evidence (MANDATORY)

Create/update: `.qfai/evidence/discussion-YYYYMMDDhhmmssSSS.md`

Required sections:

- Objective
- Inputs reviewed (files/paths)
- Interview summary
- Inception Deck summary
- Story Workshop summary
- Requirements summary (REQ count, NFR count)
- OQ register summary
- Deferred summary
- Work Orders Summary
- Reviewer result (`PASS`/`REVISE`)

## DONE Declaration (Mandatory Output)

When done, report:

- generated discussion path (`.qfai/discussion/discussion-*/`)
- open OQ count
- deferred OQ count
- REQ count
- NFR count
- reviewer result
- ready-for-next command (`/qfai-sdd`)

## FINAL CHECKLIST (Check Last)

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] All 15 required discussion files `01..14, 99` were produced.
- [ ] OQ register fields follow the canonical data model.
- [ ] Deferred table fields follow the canonical deferred data model.
- [ ] `Disposition: open` count is zero at completion.
- [ ] Deferred items include required metadata.
- [ ] `02_Inception-Deck.md` includes at least one Mermaid diagram.
- [ ] `03_Story-Workshop.md` includes at least one Mermaid diagram.
- [ ] UI-related stories include behavior obligations in `03_Story-Workshop.md`.
- [ ] Mermaid fence rules were satisfied when diagrams were used.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated.
- [ ] Diagram artifacts follow Mermaid fence rules.
- [ ] Open questions were logged to the proper OQ file.
- [ ] The completion message was presented to the user.
- [ ] Next actions were enumerated for all available options.

## Review Cycle Checklist (MUST)

- [ ] Review artifacts were generated for each required discussion review cycle.
- [ ] All required reviewers completed their reviews for each review pack.
- [ ] Any feedback triggered return/fix and a new review pack was appended.
- [ ] `summary.json` satisfies the required schema with `target.kind: "discussion"`.

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-sdd` in the active user language.

- Japanese output (use this exact sentence):
  ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。
- Non-Japanese output:
  Use the same meaning in the active user language, and keep `/qfai-sdd` as a literal command token.

- Proceed (recommended): `/qfai-sdd`.
  Action: run preflight on the latest discussion pack and generate shared/spec artifacts.
- Upstream idea is still unclear: rerun `/qfai-discussion`.
  Action: continue discussion loops until OQ states are explicit and complete.
- Need additional risk analysis before SDD:
  Action: update `03_Story-Workshop.md` and `11_OQ-Register.md` with additional findings.
