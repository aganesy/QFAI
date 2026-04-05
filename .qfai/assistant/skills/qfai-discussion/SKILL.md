---
name: qfai-discussion
title: QFAI Discussion (Unified Discuss + Require)
description: "Run structured discussion that merges discuss and require into a single 15-file discussion pack with required prototyping.yaml and OQ-driven exit."
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

- When a question to the user is needed (e.g., Simulation mode approval, scope confirmation),
  the agent MUST use AskUserQuestion if the tool is available.
- When AskUserQuestion supports structured choices (radio/multi-select),
  the agent MUST prefer structured choices over free-text input.
- If AskUserQuestion is technically unavailable, present the same question as a normal message
  with explicit numbered choices.
  The agent SHOULD preserve structured choice semantics (enumerated options, selection constraints).
  The reason for unavailability MUST be stated.

## FORMAT SSOT (Mandatory)

- Before writing artifacts, read and follow:
  - `.qfai/discussion/README.md`
  - `.qfai/specs/README.md`
  - `.qfai/evidence/README.md`
  - `.qfai/assistant/steering/agent-catalog.yml`
  - `.qfai/assistant/steering/agent-routing.yml`
  - `.qfai/assistant/steering/review-profiles.yml`
  - `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`
- Keep templates as source of truth and preserve file naming/order.

## Sub-agent Delegation (MANDATORY)

### Orchestrator Protocol (MUST)

- Orchestrator may only create work orders, delegate tasks, integrate outputs, and present results.
- Orchestrator MUST NOT generate the primary artifact first draft.
- Orchestrator MUST NOT self-approve.

### Capability Probe (MUST)

1. Run one harmless Probe Task once at stage start.
2. If subagents are unavailable, explicitly ask for Simulation mode approval.
3. Without explicit approval, stop the stage.

### Simulation mode (Opt-in only)

- Allowed only when user explicitly states `Simulation mode allowed`.
- Record both:
  - `Subagents: simulated (reason: <why unavailable>)`
  - `User approval: <quote or reference>`

## Work Orders Summary

Every major artifact in this stage MUST include this table schema:

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1    | <role>           | <task>     | <refs>       | <refs>        | PASS/REVISE          |

### Reviewer Gate (MUST)

- Delegate final completion gate to an independent `completion-reviewer`.
- Route specialist reviewers from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- Default discussion review set:
  - `completion-reviewer`
  - `requirements-reviewer`
- Conditional discussion reviewers:
  - `architecture-reviewer` when architecture-affecting decisions exist
  - `product-surface-reviewer` when the pack is UI-bearing
- Reviewers must check Drift Protocol compliance and alignment with `.qfai/assistant/steering/test-layers.md`.
- Test volume floors/ratios are not gates; they are risk signals.
- Do not declare DONE until all routed blocking reviewers return `PASS`; otherwise apply `REVISE`.
- Every reviewer MUST provide a concrete alternative or fix proposal when returning `FAIL`.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- Timestamp format is fixed to `YYYYMMDDhhmmssSSS` (3-digit milliseconds).
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
- `02_Inception-Deck.md` MUST contain at least one Mermaid diagram in ` ```mermaid ` fences.
- `03_Story-Workshop.md` MUST contain at least one Mermaid diagram in ` ```mermaid ` fences.
- If UI requirements exist, behavior obligations and sidecar artifacts are primary; HTML+CSS visual mock is optional fallback only.
- **UI-bearing Authoring Requirements**:
  - UI-bearing detection is based on **surface type classification**
    (see `## UI-bearing Detection` below).
  - Content signals in `03_Story-Workshop.md`
    (HTML tags, Mermaid screen flows) serve as supplementary detection hints,
    not the primary SSOT.
  - UI-bearing packs rely on the **canonical sidecar family** as primary truth for design direction:
    - `uiux/10_implementation_strategy.md` — implementation strategy with strict canonical schema
    - `uiux/11_design_taste_interview.md` — design taste interview (10 sections)
    - `04_Sources.md#Trend Scan` — trend scan with required category coverage and per-entry completeness
    - `uiux/20-24` — 3-layer evaluation family (invariant, trend-derived, product-specific, aggregate, dynamic overrides)
    - `uiux/30_option_comparison.md` — option comparison
    - `uiux/31_selected_anchor_screen.md` — selected anchor screen (Selected Direction single source of truth)
    - `uiux/40_screen_contracts.md` — screen contracts (strong schema)
    - `uiux/50_review_input_bundle.md` — review input bundle
  - `04_Sources.md` `## Trend Scan` must include all required categories, and each entry must include: `reference`, `observation`, `freshness_date`, `confidence`, `source_translation`, `local_implication`
  - `04_Sources.md` `## Competitive Reference Registry` entries must include:
    - `adopted_points`: what was adopted and why
    - `rejected_points`: what was not adopted and why
    - `local_translation`: how adopted points were adapted
    - Placeholder-like values (TBD, N/A, TODO, empty) are treated as missing
  - `14_Review-Request.md` must review selected direction from `uiux/31_selected_anchor_screen.md` and strategy alignment from `uiux/10_implementation_strategy.md`.
  - `99_delta.md` must include a `## Rejected Visual Directions` section with rationale and recurrence prevention.
  - `04_Sources.md` must include a `## Trend Scan` section where each required category has at least one complete entry.
  - `04_Sources.md` must include a `## Competitive Reference Registry` where each entry has: `adopted_points`, `rejected_points`, `local_translation` fields populated.
  - Sidecar-family validators (UIX-VAL series) are the primary quality gates for UI-bearing packs.
  - Non-UI packs are exempt from all sidecar validators (zero new issues).
- Reviewer routing is derived from `.qfai/assistant/steering/agent-routing.yml` and `.qfai/assistant/steering/review-profiles.yml`.
- RCP wording must be sourced from `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md`.
- Discussion artifacts are logs/rationale and must not duplicate spec SSOT.
- If diagrams are written, Mermaid syntax must be in ` ```mermaid ` fences only.
- Do not enforce fixed EX/BR or TC/EX ratios in this phase.
- Example Mapping is mandatory and must be captured as `Example Seeds` sections in `03_Story-Workshop.md`.
- OQ Register must include all mandatory columns: OQ-ID, Title, Gate, Disposition, Owner, Rationale, Options, Recommendation, Next-Decision-Point, Due, Evidence.
- Deferred table must include all mandatory columns: OQ-ID, Title, Gate, Deferred-Reason, Deferred-Until, Owner, Due, Severity, Impact, Mitigation, Evidence.

## UI-bearing Detection

### Surface Classification

Classify the project's surface type to determine whether UI/UX sidecar artifacts are required.
Classification is based on **surface type only**, not interaction complexity (DR-0057).

| Surface Type | UI-bearing | Sidecar Generation                       | Example                                  |
| ------------ | ---------- | ---------------------------------------- | ---------------------------------------- |
| web          | Yes        | Full 11-file uiux/ sidecar               | Web application with user-facing screens |
| mobile       | Yes        | Full 11-file uiux/ sidecar               | Mobile app with touch interactions       |
| desktop      | Yes        | Full 11-file uiux/ sidecar               | Desktop application with GUI             |
| cli          | No         | No uiux/ directory, no sidecar generated | CLI tool, terminal application           |
| mixed        | Yes        | Full 11-file uiux/ sidecar               | Cross-platform with UI components        |
| non-ui       | No         | No uiux/ directory, no sidecar generated | API service, library                     |

### Detection Signals

- Check `01_Context.md` for explicit surface type declarations
- Check `03_Story-Workshop.md` for HTML tags, screen flows, or UI-related user stories
- When ambiguous (e.g., web endpoint without UI components), classify by surface type, not by interaction complexity

### Sidecar Generation Flow

When UI-bearing is detected:

1. Generate all 11 uiux/ sidecar files (partial generation is not permitted)
2. Apply UX intent cross-references to core templates
3. Add UI-bearing completion conditions

When non-ui is detected:

- Skip uiux/ sidecar generation entirely — no uiux/ directory, no errors
- Core 15-file pack plus required prototyping.yaml is generated as before
- No additional UI/UX completion conditions apply

### UI-bearing Completion Conditions

For UI-bearing projects, the following conditions must ALL be satisfied before discussion completion:

1. **Strategy selected**: `uiux/10_implementation_strategy.md` is populated with a canonical implementation approach
2. **Taste interview completed**: `uiux/11_design_taste_interview.md` has all 10 sections populated
3. **Scoring axes defined (3-layer)**:
   `uiux/20_design_eval_invariant.md`,
   `uiux/21_design_eval_trend_derived.md`,
   `uiux/22_design_eval_product_specific.md`,
   `uiux/23_design_eval_aggregate.md`
   have invariant, trend-derived, and product-specific evaluation criteria
4. **Dynamic overrides documented**: `uiux/24_design_eval_dynamic_overrides.md` lists any override rules
5. **Comparison completed**: `uiux/30_option_comparison.md` documents option comparison against scoring axes
6. **Anchor screen selected**: `uiux/31_selected_anchor_screen.md` documents the selected direction and anchor screen
7. **Contracts drafted**: `uiux/40_screen_contracts.md` contains screen interaction contracts

Completion is blocked until all 7 conditions are met. Skipping any condition prevents the discussion from being marked as complete.

### Non-UI Completion

For non-ui projects, completion conditions remain unchanged from prior versions. No additional UI/UX conditions apply; no sidecar artifacts are required.

## Goal

Produce a unified 15-file discussion pack plus required prototyping.yaml with explicit decisions, requirements, OQ states, and rationale so `/qfai-sdd` starts without unresolved blockers.

## Non-goals

- Editing `.qfai/specs/**` directly.
- Writing implementation-level details.
- Leaving open blockers hidden in free text.

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
- `.qfai/discussion/discussion-*/prototyping.yaml`
- Evidence file: `.qfai/evidence/discussion-YYYYMMDDhhmmssSSS.md`
- Reviewer notes (`PASS` or `REVISE`)

## Required Process

1. Run the core interview for product concept, scope, stakeholders, and constraints (`01_Context.md`).
2. Run Inception Deck (10 questions) for ambiguity removal and project alignment, and include at least one Mermaid diagram (`02_Inception-Deck.md`).
3. Run Story Workshop to capture user stories, user flows, and at least one Mermaid diagram; HTML+CSS visual mock is optional fallback only when it materially clarifies the selected direction (`03_Story-Workshop.md`).
4. Register source traceability in `04_Sources.md` with stable `SRC-XXXX` identifiers.
5. Define scope boundaries and success criteria in `05_Scope.md`.
6. Capture functional requirements in `06_REQ.md` with `REQ-0001` format.
7. Capture non-functional requirements in `07_NFR.md` with `NFR-0001` format.
8. Capture domain terms and definitions in `08_Glossary.md`.
9. Capture constraints (technical, operational, legal, budget, deadline) in `09_Constraints.md`.
10. Capture policies (security, compliance, etc.) in `10_Policy.md`.
11. Run Example Mapping pass for each BR/AC candidate and capture `Example Seeds` in `03_Story-Workshop.md`.
12. Update `11_OQ-Register.md` with all identified OQs using all mandatory columns.
13. Run OQ resolution hearing repeatedly until open count is zero.
14. Move deferred items to `13_Deferred.md` with all mandatory metadata columns.
15. Update `12_OQ-Resolution-Log.md`, `14_Review-Request.md`, and `99_delta.md`.
16. Generate `prototyping.yaml` at the discussion pack top level for downstream prototyping recommendation.
    - MUST use the **namespaced canonical schema** with `prototyping.recommended_mode` (not top-level `recommended_mode`).
    - Top-level `recommended_mode` is legacy compatibility only and MUST NOT be emitted in new artifacts.
    - All fields (`recommended_mode`, `rationale`, `allowed_modes`, `surface`) are required under the `prototyping:` key.
17. Choose `recommended_mode` with these defaults:
    - `low-cost`: rough draft or strong cost priority
    - `standard`: normal customer-presentable path
    - `full-harness`: only when the premium runtime loop is justified
18. Request review and record Reviewer result.

## Example Mapping Perspectives (Mandatory)

For each BR/AC candidate, enumerate concrete example seeds with these perspectives:

1. Happy path
2. Negative path
3. Edge / boundary
4. Permission / role
5. State transition (if stateful)
6. Idempotency / retry (if external I/O exists)

Rules:

- Use perspective coverage as the gate, not raw case counts.
- Mark intentionally skipped perspectives with reason and follow-up.
- Feed unresolved seeds into OQ items with owner and decision point.

## OQ Data Model (Mandatory)

`11_OQ-Register.md` must include these fields for each OQ:

- `OQ-ID` (`OQ-0001` format)
- `Title`
- `Gate` (`discussion|sdd|atdd|tdd|ops`)
- `Disposition` (`open|resolved|deferred|rejected`)
- `Owner` (`user|agent|team`)
- `Rationale` (required for deferred/rejected)
- `Options` (at least two alternatives and one recommended option)
- `Recommendation` (explicitly stated recommended option)
- `Next-Decision-Point` (required for deferred)
- `Due` (target date or milestone)
- `Evidence`

## Deferred Metadata Rules (Mandatory)

`13_Deferred.md` must include:

- `OQ-ID`
- `Title`
- `Gate`
- `Deferred-Reason`
- `Deferred-Until`
- `Owner`
- `Due`
- `Severity` (`high|medium|low`)
- `Impact` (spec/tests/implementation/operations)
- `Mitigation`
- `Evidence`

## Drift Protocol (Mandatory)

At any point during discussion, if the user changes direction or scope:

1. Record the drift event in `99_delta.md` with Change Type = `Drift`.
2. Assess impact on all 15 files plus prototyping.yaml.
3. Update affected files and re-validate OQ register exit condition.
4. If drift contradicts a previously rejected option, record in `99_delta.md` Rejected section with `Recurrence Prevention`.

## Review Gate Artifacts (RCP)

For each review cycle, create:

- `.qfai/review/review-<timestamp>/review_request.md`
- `.qfai/review/review-<timestamp>/R01_<reviewer>.md`, `R02_<reviewer>.md`, ...
- `.qfai/review/review-<timestamp>/summary.json`

RCP rules:

- Append-only: create a new review pack for each cycle.
- Apply `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` as the common footer rule set.
- Run only the reviewers routed by `agent-routing.yml` for the current phase and conditions.
- On `FAIL`, rerun only the failed reviewer and any reviewers whose scope changed because of the fix.
- Mark fixed only when all routed blocking reviewers are `PASS`.
- `summary.json` `target.kind` must be `"discussion"`.

## RCP Footer Include (MUST)

- Include and follow `.qfai/assistant/skills/qfai-discussion/references/rcp_footer.md` without rewriting it per skill.
- Routing and rerun rules must stay synchronized with `agent-routing.yml` and the footer SSOT.

## Required Coverage Topics

Before completion, confirm all are covered:

1. product concept and target users
2. scope boundary and anti-goals
3. user stories and user flows (with Mermaid diagrams)
4. functional requirements (REQ) with source traceability
5. non-functional requirements (NFR) with measurable targets
6. performance constraints and SLO assumptions
7. security constraints and risk controls
8. domain glossary consistency
9. technical and operational constraints
10. project policies

## Completion Contract (Shared)

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` includes at least one Mermaid diagram;
- ensure `Example Seeds` sections are present and perspective coverage is explicit in `03_Story-Workshop.md`;
- ensure `03_Story-Workshop.md` includes at least one Mermaid diagram;
- ensure UI-related stories include behavior obligations in `03_Story-Workshop.md` (HTML+CSS mock is optional fallback);
- ensure `uiux/11_design_taste_interview.md` is complete (all 10 sections) when UI-bearing;
- ensure `04_Sources.md` includes a `## Trend Scan` section with freshness metadata when UI-bearing;
- ensure 3-layer evaluation family files (20-24) are populated when UI-bearing;
- ensure `uiux/10_implementation_strategy.md` uses the strict canonical schema when UI-bearing;
- ensure `uiux/40_screen_contracts.md` uses the strong screen contract schema when UI-bearing;
- ensure `uiux/50_review_input_bundle.md` is review-ready when UI-bearing;
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
- [ ] OQ register fields follow the mandatory data model (all 11 columns present).
- [ ] Deferred table fields follow the mandatory data model (all 11 columns present).
- [ ] `Disposition: open` count is zero at completion.
- [ ] Deferred items include required metadata.
- [ ] `02_Inception-Deck.md` includes at least one Mermaid diagram.
- [ ] `03_Story-Workshop.md` includes at least one Mermaid diagram.
- [ ] UI-related stories include behavior obligations in `03_Story-Workshop.md` (HTML+CSS mock is optional fallback only).
- [ ] Mermaid fence rules were satisfied when diagrams were used.
- [ ] Evidence file exists and includes Work Orders Summary + Reviewer result.
- [ ] Reviewer returned `PASS`.

## Completion Checklist (MUST)

- [ ] This skill's Definition of Done is satisfied.
- [ ] Required artifacts were produced or updated (if applicable).
- [ ] Diagram artifacts follow Mermaid fence rules (if diagrams were used).
- [ ] Open questions were logged to the proper OQ file (if applicable).
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
  Use the same meaning in the user's language, and keep `/qfai-sdd` as a literal command token.

- Proceed (recommended): `/qfai-sdd`.
  Action: run preflight on the latest discussion pack and generate shared/spec artifacts.
- Upstream idea is still unclear: rerun `/qfai-discussion`.
  Action: continue discussion loops until OQ states are explicit and complete.
- Need additional risk analysis before SDD:
  Action: update `03_Story-Workshop.md` and `11_OQ-Register.md` with additional findings.
