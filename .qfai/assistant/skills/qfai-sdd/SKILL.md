---
name: qfai-sdd
title: QFAI SDD Unified (Triage/Outline/Slice/Plan/Delta)
description: "Triage incoming requirements against existing specs, then create or update layered SDD artifacts (_policies + spec-*) in one workflow."
argument-hint: "[<spec-id-or-name>] [--contract <CON-ID>] [--auto]"
allowed-tools: [Read, Glob, Write, TodoWrite, Task, Bash]
roles:
  [
    orchestrator,
    delivery-planner,
    requirements-analyst,
    solution-architect,
    test-design-analyst,
    qa-strategist,
    completion-reviewer,
    architecture-reviewer,
    implementation-reviewer,
    product-surface-reviewer,
    qa-gatekeeper,
  ]
routing-profile: default
mode: approval-gated
---

<!--
QFAI Skill Body (SSOT)
- This file is intended to be referenced by tool-specific wrappers (e.g., GitHub/Claude/Codex skills).
- Keep wrappers thin and route users to this skill body.
-->

## /qfai-sdd - Unified SDD Workflow

[DRIFT-PROTOCOL:MANDATORY]

## Stage and Phase Order (Fixed)

```
Stage 0 Preflight  -> Stage 1 Triage  -> Phase 0 Contracts-first
                  -> Phase 1 Outline -> Phase 2 Slice (per spec)
                  -> Phase 2b Seed tdd/test-list.md (per spec)
                  -> Phase 2c Obligation reconciliation (per spec)
                  -> Phase 3 Plan finalize -> Phase 4 Delta update
```

- Detailed sequencing: `references/sdd-execution-playbook.md`.
- Per-stage checklists: `references/sdd-phase-checklists.md`.

## Stage 0: Preflight (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#stage-0---steering-completion-refresh-mandatory`.
Stop if the latest discussion-pack is missing, incomplete, or has blocking OQ.
On validate / doctor / quality-gate failures, follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#gate-failure-autorepair-protocol`.

## Stage 1: Triage (Mandatory)

Before any spec edit:

1. Enumerate active spec summaries (skip `superseded` / `deprecated` / `removed`).
2. Classify each REQ/NFR into one of the 8 operations using `_policies/11_Slice-Policy.md`:
   - **CREATE / DELETE / SPLIT / MERGE / SUPERSEDE** (top-level, approval required)
   - **UPDATE:APPEND / UPDATE:MODIFY / UPDATE:REMOVE** (UPDATE:REMOVE also requires approval). The colon-separated form (no space) is the canonical SSOT used by validators (`QFAI-TRIAGE-003`/`004`) and `references/sdd-triage.md`.
3. **Append-first**: default to UPDATE on an existing active spec whose subject tokens overlap the REQ; walk the impact cascade and add MODIFY/REMOVE rows on companion specs. CREATE only when there is **zero subject-token overlap with any active spec** AND the REQ introduces a genuinely new capability — first add the `CAP-NNNN` row to `_policies/03_Capabilities.md`, then cite it in the CREATE row Rationale (`QFAI-TRIAGE-006`). See `references/sdd-triage.md` for the precise APPEND-vs-CREATE algorithm.
4. Obtain AskUserQuestion approval for every approval-required row.
5. Persist the Triage table in `<spec>/09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec / policy).

Procedure: `references/sdd-triage.md`. Validators: `QFAI-TRIAGE-001..006`.

## Spec Status Field (Mandatory)

Every `01_Spec.md` declares `- Status: active | superseded | deprecated | removed`.

- `superseded` requires `- Superseded-by: spec-NNNN` pointing to an existing spec.
- `deprecated` / `removed` require `- Deprecated-at: YYYY-MM-DD`.
- Triage classification ignores non-active specs.

Validators: `QFAI-STATUS-001..006`.

## User Questions (AskUserQuestion Protocol)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#user-questions-askuserquestion-protocol`.
Approval-required ops in Stage 1 above MUST go through AskUserQuestion.

## FORMAT SSOT (Mandatory)

- Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#format-ssot-mandatory`.
- Read before writing `.qfai/**`:
  - `.qfai/assistant/skills/qfai-discussion/references/discussion-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/contract-artifact-rules.md`
  - `.qfai/assistant/skills/qfai-sdd/references/sdd-triage.md`
  - `.qfai/assistant/skills/qfai-prototyping/references/evidence-requirements.md`
  - `.qfai/assistant/manifest/agent-catalog.yml`
  - `.qfai/assistant/manifest/agent-routing.yml`
  - `.qfai/assistant/manifest/review-profiles.yml`

## Inputs Priority

1. Latest `.qfai/discussion/discussion-*/` pack (lexicographically largest), validated by Stage 0.
2. P1: `.qfai/assistant/constitution/*` (post-recut: normative invariants — formerly `.qfai/assistant/instructions/*`)
3. P2: `.qfai/assistant/manifest/*` + `.qfai/assistant/catalog/*` (post-recut routing manifests + reference catalogs — formerly `.qfai/assistant/steering/*`)
4. P3: existing `.qfai/specs/_policies/03_Capabilities.md` + active spec summaries (Stage 1 input)
5. P4: existing `.qfai/specs/<spec-id>/**` for the targeted specs
6. P5: `.qfai/discussion/**`, `.qfai/contracts/**`

## Sub-agent Delegation (MANDATORY)

Follow `.qfai/assistant/constitution/shared-skill-delegation-baseline.md`.

### Orchestrator Protocol (MUST)

- No additional overrides beyond the baseline.

### Capability Probe (MUST)

- No additional overrides beyond the baseline.

### Delegation Failure (Hard Stop)

- Do not simulate roles. Classify the failure per the baseline taxonomy first: `unavailable` stops the stage with a remediation report; `saturated` uses the bounded retry branch and keeps the stage open.

Stage minimum roles:

- `requirements-analyst` drafts requirement-aligned spec content.
- `solution-architect` drafts structural / contract / architecture sections.
- `test-design-analyst` drafts traceability, examples, and test-design.
- `product-experience-architect` is added when the target is UI-bearing.
- `orchestrator` integrates outputs and presents for confirmation; never drafts the primary artifact and never self-approves.
- `completion-reviewer` is delegated independently. Required field: `Status (PASS/REVISE/PENDING)`; `PENDING` marks an unrun gate and never counts as `PASS`.

Author↔reviewer separation (MUST): drafting roles and reviewing roles above are routed from one
list, but no sub-agent may review an artifact it drafted or edited in this run. `independent` is
defined normatively in
`.qfai/assistant/constitution/shared-skill-delegation-baseline.md#definition-independent-reviewer-normative`,
and every reviewer response must carry its `Authored/edited under review:` attestation.

Reviewer routing is fixed by `.qfai/assistant/manifest/agent-routing.yml` and `.qfai/assistant/manifest/review-profiles.yml`.

### Reviewer Gate (MUST)

- Default: `completion-reviewer`.
- Conditional: `architecture-reviewer` (structural / contract / CLI), `product-surface-reviewer` (UI-bearing), `qa-gatekeeper` (validate / coverage / runtime / prototyping evidence affected).
- Drift Protocol compliance is mandatory; reviewers MUST verify no rejected option was reintroduced and no drift from prior decisions.
- Test-layer policy is checked against `.qfai/assistant/catalog/test-layers.md`; annotation routing is enforced by `.qfai/assistant/catalog/test-layers.md#annotation-routing`, which owns the US / TC / CON-API mapping. A `TC-*`'s `Level` is **not** a constant: derive it per TC with `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`, keeping the row inside L1–L3 and defaulting to Integration only when the derivation is genuinely indeterminate. A missing `tests/integration/**` trace never rewrites a derived `Level`.
- Coverage floors / ratios are planning signals, not gates; reviewers must not block on them.
- Do not declare DONE until all routed blocking reviewers return `PASS`.

### No-argument batch delegation (MUST)

- Without argument: target all capabilities in `_policies/03_Capabilities.md`.
- Run Contracts-first and Outline once per batch.
- Delegate Slice in parallel per spec.
- Parallel delegation here is bound by the stage-independent Concurrency rules in
  `.qfai/assistant/constitution/workflow.md#concurrency-stage-independent-mandatory`:
  worktree separation, or the declared degraded mode, plus mandatory commit
  scoping (`git add <paths>`; never `git add -A` / `git add .` / `git commit -a`).
- Validate gate and Review gate run once at batch tail after all target specs are integrated.

## Work Orders Summary

Per-spec evidence at `.qfai/evidence/sdd-<spec-id>.md` is mandatory and MUST include `## Work Orders Summary`. Use the shared schema from `shared-skill-delegation-baseline.md`.

## Review Cycle Protocol (RCP)

- Follow `references/review-cycle-playbook.md`.
- Footer SSOT: `references/rcp_footer.md`.
- Allowed in-flight reviewer verdicts: `PASS` and `REVISE` (`REVISE` serializes to `status: "FAIL"` in the pack summary).

## Workflow Convention

- Phase order is fixed (see top).
- Reference direction: lower-to-upper only; upper-to-lower references are forbidden.
- Required edges `US -> AC -> BR -> EX -> TC` must be present.
- Plan finalize MUST happen after at least one user-story slice is grounded.
- Unresolved items MUST move to shared or spec open-question files.

## Delta Rejected Guard (Mandatory)

Follow `.qfai/assistant/constitution/shared-skill-operating-baseline.md#delta-rejected-guard-mandatory`.

## Slice Policy Protocol

- `_policies/11_Slice-Policy.md` is the SSOT for the 8 ops and ID stability rules.
- If missing or stale, refresh it before continuing.
- Do not start Phase 2 (Slice) until Stage 1 Triage is complete.

## Arguments and Target Selection (Mandatory)

- With argument (`/qfai-sdd <spec-id-or-name> [--auto]`): update only the matched single spec target.
- Without argument (`/qfai-sdd`): target all capabilities listed in `_policies/03_Capabilities.md`.
- Contract-scoped (`/qfai-sdd --contract <CON-ID>`): run Stage 0 + Phase 0 (Contracts-first) + Phase 4 (Delta update) only, against the named contract and the specs that reference it. This is the invocation `constitution/drift-protocol.md#when-drift-is-detected` step 4 names for a contract-class upstream artifact; without it, a contract-only Change Request had no rerun narrower than the whole spec.
- Reordering capability-to-spec mapping is a Change Request decision and must not be done implicitly.

## Critical Constraints

1. Use only templates under `.qfai/assistant/skills/qfai-sdd/templates/` — the whole directory, not an enumerated subset, so a new template directory is covered on the day it ships.
   - Named cross-skill exception: `.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample` (Phase 0 DESIGN.md Freeze). It is an exception, not a licence to read other skills' templates.
   - Never invent a layout for an artifact a template already covers.
2. Always write `.qfai/report/preflight_summary.md` before generating shared/spec artifacts.
3. Contracts-first is mandatory; UI-bearing targets must be normalized into `.qfai/contracts/design/**` and `.qfai/contracts/ui/**` per `references/ui-design-contract-normalization.md`. UI-bearing targets MUST also validate the consuming-project root `DESIGN.md` and freeze its sha256 into `.qfai/contracts/design/DESIGN.md.lock.yaml` (see Phase 0 DESIGN.md Freeze below).
4. `_policies/05_Contracts.md` must include a Contract Index aligned with `.qfai/contracts/**`.
   - Phase 0 must also reconcile paired contracts against each other, not only validate each file: every terminal state, status enum value, and error code an API contract mandates must be representable in the paired DB contract. See `references/contract-artifact-rules.md#cross-contract-reconciliation-must`. The reviewer gate checks the pairing before sign-off.
5. `_policies/04_Business-Flow.md` must be Markdown with Mermaid `flowchart` or `sequenceDiagram`.
6. `05_Examples.md` must include `EX-ID` and `BR-Ref` mappings.
7. `06_Test-Cases.md` must include `TC-ID`, `Level`, `EX-Ref`, `AC-Refs`, and `Type`, with normal-path plus error/boundary coverage. `Level` gates `TDDLIST_TC_NOT_COVERED` at `error`, so it is required, not optional.
8. A `TC` whose assertion reads the **content** of an upstream artifact — a decision record in
   `07_Decisions.md`, a contract, another spec file — must not be written before that artifact
   exists. `/qfai-implement` may not write upstream SSOT, so a row routed to it first has no
   lawful move, and the agent that meets it must choose between three prohibited things. Produce
   the artifact in this stage, or do not write the case yet.
9. Stop only when `npx qfai validate --profile sdd --fail-on error --format github` exits with `error=0`.

## Required Process

1. Stage 0: Preflight (stop on blockers).
2. Stage 1: Triage (classify + approve + persist Triage table).
3. Write `.qfai/report/preflight_summary.md`.
4. Phase 0: Contracts-first (UI-bearing targets normalize in this phase, and freeze root `DESIGN.md` per the Phase 0 DESIGN.md Freeze step below). Close Phase 0 with the cross-contract reconciliation step in `references/contract-artifact-rules.md#cross-contract-reconciliation-must`.
5. Phase 1: Outline (`_policies/01..11`).
6. Phase 2: Slice (per spec, gate each with `npx qfai validate --profile sdd --fail-on error --spec <spec-id>` so a parallel worker gates on its own spec only and does not import a sibling agent's in-flight failures). A `--spec` run writes `<report>/validate.spec-<id>.json` and never the shared `validate.json` / `validate-<profile>.json`, so parallel workers cannot race on one file; an unknown or unparseable `--spec` value fails the run (`QFAI-SCOPE-001` / `QFAI-SCOPE-002`) instead of silently widening to the whole repo.
7. Phase 2b: Seed each target spec's `tdd/test-list.md` from `06_Test-Cases.md`
   — one row per coverage-target TC, `Status = todo`; copy
   `templates/specs/spec/tdd/test-list.md` when absent. Without it
   `/qfai-implement` starts with zero selectable items. **Seeding is a delta,
   not a regeneration, in both directions**: unchanged rows keep their state,
   new TCs append at `todo`, and changed / removed TCs are reset or retired
   under the upstream-reset rule (`references/sdd-phase-checklists.md`).
8. Phase 2c: Obligation reconciliation (per spec). Re-read `.qfai/contracts/**`
   against the `BR` / `AC` Phase 2 produced: name the realizing contract for
   each, and resolve every persisted attribute it names to a column, field or
   enum member there — directly or by a stated join. Phase 0 froze the contracts
   before these obligations existed, so this is the only step that checks they
   are realizable. See
   `references/contract-artifact-rules.md#obligation-reconciliation-must--phase-2c`.
   Fix the contract or the obligation here; both are owned by this skill, and a
   mismatch carried downstream reaches an implementer who can fix neither.
9. Phase 3: Plan finalize (after at least one slice gate passes).
10. Phase 4: Delta update.
11. Run validate; fix source-layer artifacts and rerun until `error=0`.
12. Triage density-smell warnings in `.qfai/report/specs-coverage/spec-*.md`.

## Work-log entries

Write a `.qfai/steering/<id>.md` entry when this stage hits one of the conditions in the `kind` trigger table of `.qfai/assistant/catalog/worklog-entry.schema.md` — `blocker`, `handoff`, `consultation-needed` and `decision` are the ones this stage reaches most. `npx qfai validate` polices the surface but nothing else asks for an entry, so an unwritten one is simply lost.

## Mandatory Outputs

- Shared `_policies/01..11` files
- Target `spec-*/01..10` files (with valid `Status:` bullet)
- `spec-*/16_Traceability-ledger.md` when the spec's `BR-*` / `AC-*` are linked to implementation
  files (optional artifact; create or refresh it in the same change as the BR/AC it links, from
  `templates/specs/spec/16_Traceability-ledger.md`). Without it `QFAI-TRACE-002` is emitted and the
  BR/AC ↔ implementation integrity check (`QFAI-TRACE-001`) is skipped for that spec. See
  `references/spec-traceability-rules.md#traceability-ledger-16_traceability-ledgermd`.
- Triage section in every changed `09_delta.md` (per-spec) or `_policies/10_delta.md` (cross-spec)
- Updated contracts under `.qfai/contracts/**`; UI-bearing targets normalize design/ui contracts
- `.qfai/report/preflight_summary.md`
- Evidence file: `.qfai/evidence/sdd-<spec-id>.md`

The canonical file set is defined by skill templates under `.qfai/assistant/skills/qfai-sdd/templates/`.

## Phase 0 DESIGN.md Freeze (UI-bearing only)

When the target spec is UI-bearing, Phase 0 MUST freeze the brand SSOT:

1. Read root `DESIGN.md` at `<consuming-project-root>/DESIGN.md`. If
   missing, stop and ask the user to run `/qfai-discussion` (which
   emits the draft) or to author it manually using the sample at
   `.qfai/assistant/skills/qfai-prototyping/templates/DESIGN.md.sample`.
2. Call `isUnreplacedDesignMdSample(text)`. If it returns `true`, the file
   is still a qfai sample brand and MUST NOT be frozen: stop and ask the
   user to author this product's own brand SSOT, deleting the
   `QFAI-SAMPLE-DESIGN-MD` marker comment if present (samples from
   releases older than the marker are recognised by content instead).
   `npx qfai init` seeds the sample into the project root and never overwrites
   it, so step 1's missing-file check cannot catch this — an unreplaced
   sample parses and validates by construction, and freezing it binds
   `/qfai-prototyping` and the reviewer lock rule to a fictional brand.
3. Call `parseDesignMd(text)`. If the result is `{ error: ParseError }`,
   stop and report `path` / `code` / `message` for the parse error.
   Otherwise the result is `{ data: DesignMd; body: string }`; pass
   `data` to `validateDesignMd(data)`. If that issue list is
   non-empty, stop and report each issue. Both functions, together with
   `hashDesignMd` and the `DesignMd` / `ParseError` / `ParseResult` /
   `ValidationIssue` types, are re-exported from the public `qfai`
   package entry (`import { parseDesignMd, validateDesignMd, hashDesignMd, isUnreplacedDesignMdSample } from "qfai"`).
4. Call `hashDesignMd(text)` to compute sha256 over the raw bytes.
5. Write `.qfai/contracts/design/DESIGN.md.lock.yaml` from the
   template at
   `templates/contracts/design-md-lock.sample.yaml` with these fields:
   - `designMdPath: "DESIGN.md"`
   - `designMdSha256: <hex>`
   - `frozenAt: <UTC ISO-8601>`
   - `schemaTokens.colors`, `fontFamilies`, `radii`, `shadows`
     enumerated per the sample.
6. Record the freeze in `_policies/05_Contracts.md` under the Contract
   Index. The lock yaml plus root `DESIGN.md` are the only brand
   contract; per-aspect brand yaml contracts have been removed.

`/qfai-prototyping` re-checks the lock sha256 against the live
`DESIGN.md` on every cycle and exits 2 on mismatch.

## Quality Gate

Run the full checklist from `references/sdd-quality-gate.md`. The gate also covers status-field and Triage-section checks.

## Evidence

Create `.qfai/evidence/sdd-<spec-id>.md` from `templates/evidence/sdd-spec.md`. That template is the
canonical layout for this artifact — copy it, keep every `##` heading in order, and fill it in.

Required sections, in order (the template is authoritative if the two ever disagree): Objective,
Inputs reviewed, Preflight summary path, Triage decisions (op + approver per row), Open questions,
Decisions made, Work performed, Commands executed, Validate evidence paths, Work Orders Summary,
Gaps / Open risks, Final status. Work Orders Summary uses the fixed 6-column schema from
`shared-skill-delegation-baseline.md`; its `Status` and `Final status` accept only `PASS` or `REVISE`.

## Done Declaration

When declaring DONE, include:

- Referenced inputs and spec-id(s)
- Stage 1 Triage table digest (counts per Operation, approvals)
- Phase order: Contracts-first -> Outline -> Slice -> Plan finalize -> Delta update
- Decision record IDs touched in `09_delta.md`
- Confirmation that no rejected option was reintroduced (or list RE-OPEN IDs)
- Quality gate result and validate log path

## Completion Message & Next Actions

When this skill completes, provide a final user-facing message enumerating next steps:

- Proceed (recommended): `/qfai-prototyping`.
- Test-first path: `/qfai-atdd`.
- Spec pack needs correction: rerun `/qfai-sdd` and regenerate evidence.
- Confirm contracts referenced by `_policies/05_Contracts.md` exist under `.qfai/contracts/**`,
  and that Phase 2c reconciled every `BR` / `AC` against them — existence is not realizability.

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

A skill MAY narrow the auto-decide bucket (drop entries) but MUST NOT widen it. Widening triggers a Reviewer-Gate finding.

project_memory:

- Phase order is fixed: Stage 0 Preflight → Stage 1 Triage → Phase 0 Contracts-first → Phase 1 Outline → Phase 2 Slice → Phase 2b Seed tdd/test-list.md → Phase 2c Obligation reconciliation → Phase 3 Plan finalize → Phase 4 Delta update; do not reorder.
- Phase 2c reconciles contracts against the BR/AC written after them: Contracts-first freezes the contract before its obligations exist, and Phase 2c is the only step that checks they are realizable.
- Phase 2b seeds each target spec's tdd/test-list.md from 06_Test-Cases.md (one row per coverage-target TC, Status = todo) and is a delta: existing rows keep their TDD-ID, Status, Test file, Selector, DR-ID and Evidence.
- Append-first is the Stage 1 default: UPDATE on an active spec whose subject tokens overlap; CREATE only when there is zero overlap AND the REQ adds a new CAP-NNNN, registered before the CREATE row.
- Phase 0 DESIGN.md Freeze is mandatory for UI-bearing targets; .qfai/contracts/design/DESIGN.md.lock.yaml is the brand-lock SSOT.
