---
name: qfai-discussion
title: QFAI Discussion (Exploration Planner)
description: "Run structured discussion that defines exploration conditions, evaluation rubric, and anti-goals for downstream prototyping."
argument-hint: "<idea-or-problem> [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Agent, Bash]
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

## /qfai-discussion - Exploration Planner

[DRIFT-PROTOCOL:MANDATORY]

## Goal

Produce a unified 15-file discussion pack plus exploration-first UI sidecars so `/qfai-sdd` and `/qfai-prototyping` can operate without forcing an early visual direction decision.

## CRITICAL CONSTRAINTS (Read First)

- Output path is fixed: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.
- All 15 mandatory fixed files remain unchanged.
- UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it.
- Completion requires `Disposition: open` count to be zero in `11_OQ-Register.md`.
- If UI requirements exist, behavior obligations are primary and HTML+CSS mock is optional fallback only.
- When an HTML+CSS mock includes links, author them in anchor-form (`<a href="#name">`); external `http(s)://` links are also allowed. Do NOT use same-origin absolute paths (`/orders/`) — a static mock cannot serve them and the validator rejects them (QFAI-MOCK-010).
- Discussion is planner-first: do not select a single visual winner and do not finalize the design system here.
- Use artifact files, not conversational summaries, as the downstream handoff.

## UI-bearing Canonical Sidecar Family

Decide whether the target is UI-bearing with `references/ui-bearing-playbook.md` (surface mapping plus detection signals) before applying any UI-bearing branch in this file.

Every UI-bearing pack must produce, as primary truth: `uiux/00_index.md`, `uiux/40_screen_contracts.md`, `uiux/50_review_input_bundle.md`. Only a pack on a **visual-prototyping surface** (`web`, `mobile`, `desktop` or `mixed`, as `primary_surface` or in `secondary_surfaces`) MUST additionally emit a draft brand SSOT at the **consuming-project root**; a cli-only pack MUST NOT author it:

- `<consuming-project-root>/DESIGN.md` — **visual-prototyping surfaces only.** Brand SSOT consumed by `/qfai-sdd` (freezes its sha256 in `.qfai/contracts/design/DESIGN.md.lock.yaml`) and by `/qfai-prototyping` (iterates against locked tokens). Brand intent (product intent, brand signals, anti-goals, reference pool framed as deviate-from inputs) lives in front-matter + `# Brand Philosophy` body — no separate per-aspect sidecar.

Root `DESIGN.md` is required only on the visual-prototyping surfaces (`web`, `mobile`, `desktop`, `mixed`), and the test is the whole classified surface set — `primary_surface` **and** every `secondary_surfaces` entry. Only a **cli-only** pack (`primary_surface: cli`, no visual secondary surface) skips it: it stays `ui_bearing: true` and keeps all three screen-level sidecars, but does NOT author root `DESIGN.md`, because `/qfai-prototyping` rejects `cli` and no downstream reader consumes its `visual.*` tokens. `/qfai-sdd` Phase 0 skips the freeze for the same packs. See `references/ui-bearing-playbook.md#visual-prototyping-surfaces-vs-cli`.

## Required Process

1. Run the core interview for concept, scope, stakeholders, and constraints.
2. Run Inception Deck and include at least one Mermaid diagram.
3. Run Story Workshop, capture user stories and user flows; HTML+CSS mock is optional fallback only.
4. Register source traceability and reference research in `04_Sources.md`.
5. Capture scope, REQ, NFR, glossary, constraints, and policies.
6. Run Example Mapping per `references/example-mapping-guide.md` and capture `Example Seeds`.
7. Update `11_OQ-Register.md`, resolve OQs until open count is zero, and move deferred items to `13_Deferred.md`; take the canonical field definitions for both files from `references/oq-and-deferred-rules.md`.
8. Generate the exploration-first sidecar family for UI-bearing targets.
9. **Emit root `DESIGN.md` draft** per `references/design-dna-intake.md`. Required when any classified surface — primary or secondary — is `web`, `mobile`, `desktop` or `mixed`; skip for cli-only and non-ui targets. Fill its required `brand.archetype` field in two phases: **Phase A** picks the closest-fitting archetype from `references/design-md-brand-catalog.md` and takes its `aesthetic_properties` as draft defaults; **Phase B** routes each default to its own home: `color_tendency` / `typography` / `spacing` into the `visual.*` token tree, and the `interaction` default into `accessibility.motion` (`visual.*` accepts only `colors | typography | radius | shadow | spacing`). This fills the draft brand SSOT only — exploration directions stay unranked and the design system is not finalized here.
10. Generate `prototyping.yaml` only when the latest discussion pack targets a prototyping execution surface (`web`, `mobile`, `desktop`, `mixed`) and an explicit prototyping recommendation is useful. A cli-only pack emits none — `/qfai-prototyping` rejects `cli`.
11. Request review and record the Reviewer result, following `references/review-cycle-playbook.md` for pack layout, cycle rules, and the `summary.json` fields.

For UI-bearing targets, follow `references/design-dna-intake.md` while authoring the UI/UX sidecars, and apply the durable decision rules in `references/ui_ux_best_practices.md` (open only the `ui_ux/` appendix the current task needs). Keep this `SKILL.md` compact; put detailed interview prompts and examples in the reference file.

## UI-bearing Authoring Requirements

- Root `DESIGN.md` front-matter must define `brand` (name, archetype, voice), `audience` (emotion, do_not_look_like), and the full `visual.*` token tree (colors, typography, spacing, radius, shadow). Visual-prototyping surfaces only — a cli-only pack omits root `DESIGN.md` entirely.
- `# Brand Philosophy` body documents do/don't, brand signals, and exploration references framed as **deviate-from** inputs (not imitate-this) for the downstream `/qfai-prototyping` reviewer.
- `40_screen_contracts.md` defines each screen contract per the template schema; `50_review_input_bundle.md` documents review inputs for downstream skills.
- Evaluation axes are global constants (4-step ordinal: weak / acceptable / strong / exceptional) and are not authored as discussion sidecars.

## Completion Contract (Shared)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol` for validate, doctor, and quality-gate failures.

The full completion logic, including the UI-bearing blocking conditions, is in
`references/discussion-completion-matrix.md`. It must stay consistent with the canonical
sidecar family declared above and with `templates/uiux/00_index.md#Forbidden Legacy Files`.

Before declaring completion, you MUST:

- verify all 15 mandatory output files exist and are populated;
- confirm every required topic in `references/discussion-coverage-checklist.md` is covered, or captured as an OQ or deferred item;
- ensure `Disposition: open` count is zero in `11_OQ-Register.md`;
- ensure every deferred item has full metadata in `13_Deferred.md`;
- ensure `02_Inception-Deck.md` and `03_Story-Workshop.md` include Mermaid diagrams;
- ensure the UI-bearing sidecar family is complete, and — when any classified surface (primary or secondary) is `web`, `mobile`, `desktop` or `mixed` — that the root `DESIGN.md` draft exists at the consuming-project root and parses as valid front-matter;
- run `npx qfai validate --profile discussion --fail-on error` and fix discussion-owned findings;
- avoid selecting a single visual winner in discussion artifacts.

### Reviewer Gate (MUST)

Reviewer checks must confirm:

- the 15-file discussion pack is complete; `Disposition: open` count is zero in `11_OQ-Register.md`;
- the UI-bearing sidecar family is complete when the pack is UI-bearing;
- discussion stayed planner-first and did not choose a single visual winner;
- Drift Protocol is enforced; review policy is checked against `.qfai/assistant/catalog/test-layers.md`;
- planning and coverage heuristics are signals, not gates;
- review findings end with `Status (PASS/REVISE/PENDING)` and Reviewer result is explicit as `PASS` or `REVISE` (`PENDING` marks a gate that could not be run and never counts as `PASS`).

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- do not self-approve; use artifact files as the handoff surface; integrate delegated outputs only after checking pack completeness.

### Capability Probe (MUST)

- No additional overrides.

### Delegation Failure (Hard Stop)

- No additional overrides.
- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

## Work Orders Summary

Use the shared schema (per-row `Status (PASS/REVISE/PENDING)` column, reviewer response `Reviewer role:` + `Reviewed artifact:` + `Result: PASS | REVISE`). A response missing the role or artifact line is not a verdict; re-request it.

## Completion Message & Next Actions (MUST)

You MUST end the user-facing output with a handoff sentence to `/qfai-sdd` in the active user language.

- Japanese output (use this exact sentence):
  ディスカッションが完了しました。他に要望などがあればご提示ください。問題なければ『/qfai-sdd』と入力してください。

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
  - `companyName`
  - brand intent
  - `primarySpecId` (when absent from inputs)

A skill MAY narrow any of the three buckets (drop an entry the skill cannot reach), and MAY instantiate a category entry — `approval-required governance operations` — with the operations its own run cannot authorize for itself. It MUST NOT introduce an entry outside the prototype's categories. Widening triggers a Reviewer-Gate finding.

project_memory:

- 15-file mandatory output set is fixed; the UI-bearing sidecar family (00_index.md + 40_screen_contracts.md + 50_review_input_bundle.md) is required whenever the target is UI-bearing, cli included, and root DESIGN.md only when a visual-prototyping surface (web/mobile/desktop/mixed) appears as primary or secondary — never for a cli-only pack.
- Discussion is planner-first: never pick a single visual winner; carry exploration references as deviate-from inputs, not imitate-this.
- Completion requires Disposition: open count = 0 in 11_OQ-Register.md; deferred items must move to 13_Deferred.md with full metadata.
