# 09 Delta

## Triage (2026-09-13 concrete-pattern review)

| Source                                                                         | Subject                                         | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------ | ----------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| .qfai/decisions/CR-20260913-0007-concrete-pattern-review.md#requirement-source | Concrete-pattern review without numeric targets | spec-0015     | UPDATE    | MODIFY | -           | Retain US-0015-0005 and BR-0015-0005. Restrict the optional advisory mode to concrete flows, US, AC, EX and TC. Qualify AC-0015-0009 by the catalog bound. Preserve IDs and all ledger rows; reset only TDD-0006 and TDD-0007 when their obligations change. |

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-09-14
- Primary: Behavior
- Tags: @docs, @test
- Summary: optional pattern review proposes concrete business-flow, US, AC, EX and TC coverage with rationale and no numeric target. Catalog bounds override old targets without overwriting adopter manifests. Existing IDs and independently required obligations remain intact.

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: Behavior
- Tags: @api, @docs, @test
- Summary: spec-to-story run. Adds AC-0015-0023 and AC-0015-0024, BR-0015-0018 to BR-0015-0021, EX-0015-0019 to EX-0015-0022, TC-0015-0037 to TC-0015-0043 and ledger rows TDD-0054 to TDD-0063. The card frontmatter becomes the only agent definition, the routing and review-profile defaults move into the package with whole-entry overrides in `qfai.config.yaml`, decision records move to `.qfai/evidence/decision/`, and the migration skill gets its routing entry. The approved REMOVE row retires AC-0015-0009 and TDD-0039 at P6. Details under `## 2026-09-24 — Spec-to-story run` below.

## Update History

| Date       | DL      | Summary                                                                                      |
| ---------- | ------- | -------------------------------------------------------------------------------------------- |
| 2026-09-14 | DL-0001 | Bound concrete-pattern review and record the authorized owner rerun.                         |
| 2026-09-24 | DL-0002 | Built-in routing defaults with whole-entry overrides; the card is the only agent definition. |

## Decision Log

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-14
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0015
  - manifest/review-profiles.yml
  - catalog/review-gate.rules.yml
notes: Keep optional advisory review of concrete coverage without numeric or abstract growth demands.
```

#### Migration / Follow-ups

- US-0015-0005, AC-0015-0006/0007/0009, BR-0015-0005, EX-0015-0004 and TC-0015-0006/0007 retain their IDs. TC-0015-0009 retains its routing meaning. The existing plan names the concrete catalog bound and compatibility risk.
- The canonical ledger contains one table and 53 rows: 37 existing rows and 16 seeds. TDD-0038 covers already-active TC-0015-0034; TDD-0039 covers TC-0015-0007's legacy-profile-preservation boundary; TDD-0040..0053 cover fourteen missing active US obligations. This is the normal approved re-derive producer delta, not a new TC meaning or an extra reset.
- Only TDD-0007's existing selector narrows to its original abstract-only boundary. The executing owner reset only TDD-0006/0007 to todo, named CR-20260913-0007 in DR-ID and cleared Blocked-By. Prior Evidence remains verbatim as history. Every other existing row's status, identity and Evidence remain unchanged; no row is retired or renumbered.
- Keep existing init preservation and catalog emission. No new parser, validator, role or artifact format is needed. The existing compatibility oracle seeds an older catalog and its prior receipt: normal reinit retains it, and forced reinit adopts the shipped bound while preserving the adopter manifest.
- Observed scoped SDD validation passes with zero errors. Full scoped and global SDD validation retain the same 61 and 96 baseline errors. Historical reviewer verdicts apply only to their recorded revisions; current source attestations remain pending. No baseline failure is waived and CR Applied at remains `-`.

#### Rejected

- option: Keep the current specification
  reason: Numeric targets demand additional abstract rules rather than concrete coverage.
  do_not: Restore numeric targets or treat abstract ID counts as a required growth target.
  temptation: Preserved legacy manifests can still contain numeric settings.

#### Verification

### Plan

```yaml
- id: VFY-001
  level: integration
  target: Concrete review scope and preserved-manifest authority
  method: Existing agentDelegationSpec0015 suite, including normal and receipted older-catalog forced reinit
  owner: dev
  expected: Rationale and N/A bounds hold; legacy targets are ineffective and adopter profiles remain unchanged.
  links:
    - .qfai/evidence/sdd-spec-0015.md
- id: VFY-002
  level: migration
  target: Approved ledger delta
  method: Main-baseline-to-worktree payload comparison and the narrowed TDD-0007 selector
  owner: dev
  expected: 37 existing rows retain payloads except the authorized two resets and selector refinement; 16 seeds are todo.
  links:
    - .qfai/evidence/sdd-spec-0015.md
```

### DL-0002

#### Meta

```yaml
id: DL-0002
date: 2026-09-24
primary: Behavior
tags: ["@api", "@docs", "@test"]
compat: Change
scope:
  - spec-0015
  - packages/qfai/assets/defaults/
  - packages/qfai/src/core/validators/agentDefinition.ts
  - packages/qfai/src/core/config.ts
  - packages/qfai/assets/init/.qfai/assistant/agent/
  - .qfai/evidence/decision/
notes: Routing and review-profile defaults live in the package and a qfai.config.yaml override replaces a default entry whole; the card frontmatter is the only agent definition.
```

#### Migration / Follow-ups

- A project that edited its `manifest/agent-routing.yml` or
  `manifest/review-profiles.yml` reaches `qfai.config.yaml` through migration
  step 3, which spec-0018 owns.
- Decision records under `.qfai/evidence/decisions/` move to
  `.qfai/evidence/decision/` with the rest of the P6 rename.
- The landing list, the co-changes and the recorded drift are under
  `## 2026-09-24 — Spec-to-story run` below.

#### Rejected

- option: Merge an override into its default field by field
  reason: BR-0015-0020 replaces a default entry whole
  do_not: Copy a field of the default into a replaced entry
  temptation: A one-field override reads like a one-field change
- option: Read the mission from the card's `description`
  reason: The two values differ for 6 of the 19 agents, and REQ-0016 lists `mission` as its own field
  do_not: Treat `description` as the mission
  temptation: The host already reads `description`, so one key looks like enough

#### Verification

Plan:

```yaml
- id: VFY-001
  level: unit
  target: Whole-entry override merge and the config override keys
  method: TC-0015-0040 and TC-0015-0042
  owner: dev
  expected: A replaced entry holds no field of its default; an unmatched entry is added; no key overrides an optional review mode.
  links:
    - .qfai/specs/spec-0015/06_Test-Cases.md
- id: VFY-002
  level: integration
  target: Defaults with no override, and an override naming a card-less agent
  method: TC-0015-0039 and TC-0015-0041 on fixture projects
  owner: dev
  expected: A fresh project holds no routing or review-profile file; QFAI-AGENT-008 names the unknown agent.
  links:
    - .qfai/specs/spec-0015/06_Test-Cases.md
- id: VFY-003
  level: integration
  target: The card as the only agent definition, and the migration skill's routing
  method: TC-0015-0037, TC-0015-0038 and TC-0015-0043
  owner: dev
  expected: Every card carries the eight fields with mission as its own key; generated Codex TOML equals its card; no QFAI-AGENT-015 to QFAI-AGENT-019 finding for the migration skill.
  links:
    - .qfai/specs/spec-0015/06_Test-Cases.md
```

## Change Requests

| CR ID            | Upstream artifact                | Mode      | Approved by                                             | Applied at |
| ---------------- | -------------------------------- | --------- | ------------------------------------------------------- | ---------- |
| CR-20260913-0007 | `spec-0015/04_Business-Rules.md` | re-derive | user (current session's delegated implementation scope) | -          |

- Scoped physical changes are recorded. Applied at matches the CR and remains unset until the required owner gates complete.

## 2026-09-04

- `CR-20260904-0004` (`confirm-only`, `/qfai-sdd 0015`):
  `R-CERTIFY-VERIFY-CIRCULAR` moves from severity `error` to `info` in
  `validate`. At `error` it made `/qfai-verify`'s Completion Contract
  unsatisfiable outside Work Order H: the skill MUSTs a `verify.json` whose
  `scope` "names the stage this run actually covered — never a stage you did
  not run" (`SKILL.md:148`, `:173`, `:72-73`), so an ordinary full-profile run
  has to write `scope: "full"`, and the rule fires on exactly that while a
  prototyping loop is open. Measured: `error=0` -> write the file -> `error=1`
  -> remove it -> `error=0`. Waivers are restricted to `warning` / `info`
  (`:151`), so there was no exit at all.

  The enforcement is unchanged and unmoved: `prototypingCertify.ts:374-383`
  already refuses a non-prototyping scope with exit 2, and its own comment says
  this finding "keeps the certify command self-contained instead of relying on
  a downstream validate pass to surface the same condition". A
  `scope: "full"` verdict on disk is not damage — consuming it in `certify` is.
  The finding's message now also names the way out, which it did not before:
  close the loop, re-run `/qfai-verify` for Work Order H.

  **Upstream artifacts changed:** `01_Spec.md` (`REQ-0015-0013`),
  `02_User-stories.md` (`US-0015-0007`), `03_Acceptance-Criteria.md`
  (`AC-0015-0013`), `05_Examples.md` (`EX-0015-0009`) — all
  `.qfai/specs/**` under `drift-protocol.md`, which is why this took a Change
  Request. Each records the new severity and why, so a reader finding `info` on
  a rule named "CIRCULAR" is not left thinking the enforcement went away.

  No DERIVED artifact changed. Two test files' severity expectations moved with
  the rule. From **#1097**.

## 2026-04-22

- Clarified: prototyping-related routing is now described against the skill-led flow.
- Superseded: wording that tied evaluator routing to a removed prototyping runtime entrypoint.

## 2026-05-06 — CHG-001 — Absorbed prototyping routing rebuild + full-harness profile drop from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                            |
| ------ | ------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In)                              | `/qfai-prototyping` v2.0 routing rebuild + `review-profiles.yml` full-harness drop |
| OP-002 | UPDATE:APPEND | 06_Test-Cases.md (TC-0015-0015..0016)              | routing rebuild + profile drop test coverage                                       |
| OP-003 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0015-0015..0016) | TDD ledger sync                                                                    |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). Same-Claude generator/reviewer assignment is rejected at the routing layer to keep the evaluator independent of generator self-preference bias.

## Triage (CHG-001)

| Source                                                         | Subject                                                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0006, REQ-0017 (CHG-003)                                   | Reviewer-Gate sub-agents (`completion-reviewer`, `implementation-reviewer`, `qa-gatekeeper`) が work-log entries + Decisions table を構造化入力として受け取り、`R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` / `R-HANDOFF-INCOMPLETE` を出力する | spec-0015     | UPDATE    | APPEND | pin-implied | Agent collective spec owns reviewer-subagent contracts (CAP-0015)。subject-token overlap (`agent`, `reviewer`)。新 CAP 不要。                                                                                                                                                                                                                                                                        |
| `discussion-20260804173914356#REQ-0013`, `#REQ-0022` (CHG-007) | Reviewer Gate ingests the workflow-hygiene and shipped-shape drift findings                                                                                                                                                                 | spec-0015     | UPDATE    | APPEND | -           | Cascade from CHG-007, following the established emitter/ingestion split: the repository lane emits, this spec defines ingestion. Codes are declared in the `CLI-WFSET` contract. Both are error class and so belong in the closed justification catalog; registration is deferred as a lockstep change (DR-0015-0006 / OQ-0015-0001) and the current handling is recorded as a temporary divergence. |

## CHG-003 (v1.9.0) — Reviewer-Gate Drift Findings + Handoff Check

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL, "Reviewer-Gate input bundle" section)
- Operation: UPDATE:APPEND
- Obligation: Reviewer sub-agents MUST be invoked with a structured input bundle (open work-log entries + Decisions table + fresh implementation output). They MUST emit `R-*` findings with non-empty `justification:` field naming (a) the entry ID or Decisions row ID that triggered the finding and (b) the specific contradiction or re-adoption observed. `qfai validate` rejects Reviewer reports whose `R-*` findings lack `justification:` (advisory-failing rather than mute per REQ-0006).
- New findings:
  - `R-WORKLOG-DRIFT` (severity error, advisory-failing): output contradicts an open entry with `kind` in `{decision, risk, blocker, scope-down}`.
  - `R-REJECTED-READOPT` (severity error, advisory-failing): output adopts an option marked `Status: rejected` in the active spec's `07_Decisions.md`.
  - `R-HANDOFF-INCOMPLETE` (severity error): a `kind: handoff` entry body is missing one of the 5 required sections (State / Next action / Constraints / OQs / References) per REQ-0017.
- Cascade: spec-0004 implements the `R-*` finding-schema enforcement and the `qfai validate` ingestion. Skill specs declare reviewer routing via existing `.qfai/assistant/catalog/agent-routing.yml`.
- Out-of-scope (this spec): heuristic implementation (natural-language reasoning lives in the sub-agent prompt, not in code).
- Source: REQ-0006, REQ-0017

## 2026-05-23 — CHG-004 — agent-catalog.yml in-line developer_instructions

| Op ID  | Op Type       | Target                                       | Summary                                                                                                                                       |
| ------ | ------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | `.qfai/assistant/manifest/agent-catalog.yml` | Add `developer_instructions` field per agent (19 agents); mirrors canonical `.qfai/assistant/agents/<name>.md` body from `## Mission` onward. |
| OP-002 | UPDATE:APPEND | tests/codex/agents.test.ts (TC-0004-0026)    | 3-way SSOT guard: canonical MD ↔ `.codex/agents/*.toml` ↔ agent-catalog.yml `developer_instructions` must stay in lockstep.                   |

- Approved By: pin-implied (under feature/v1.9.0)
- Notes: Field surfaces the agent Mission/Inputs/Deliverables/Stop Conditions/Sign-off contract directly inside the routing manifest so downstream loaders that read agent-catalog.yml (codex/copilot/claude wrappers, agent-routing.yml validators) do not need a second file-system read. The duplication is structurally guarded by TC-0004-0026 so drift fails CI.

## 2026-05-24 — CHG-005 — qfai-prototyping defect remediation pack

- Discussion pack: `.qfai/discussion/discussion-20260523221141355/`
- Operation: UPDATE:APPEND
- Posture: additive append; preserves existing AC/BR/EX/TC numbering. NFR-0115 (justification-text contract reuse) absorbed into BR-0015-0009 (SSOT shared with spec-0004 BR-0004-0028).
- Approved By: yusuke_senaga

## Triage (CHG-005)

Rows owned by this spec.

| Source                                       | Subject                                                                                                                                                                                                                                                 | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | -------------------------------------------------------------------------------------------------- |
| REQ-0113 (discussion-20260523221141355)      | Reviewer-Gate `R-CERTIFY-VERIFY-CIRCULAR` (severity error) on certify path that reads validator output requiring `/qfai-atdd` or `/qfai-implement` artifacts at the prototyping phase — structural check, option-B path (upstream deferred-OQ decision) | spec-0015     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate finding emission is CAP-0015 (agent collective) territory                            |
| REQ-0125 (discussion-20260523221141355)      | Reviewer-Gate `R-PROMPT-SCANNER-DRIFT` (severity error) emission with mandatory `justification:` per discussion-20260522081618995 REQ-0006 contract                                                                                                     | spec-0015     | UPDATE    | APPEND | yusuke_senaga | Reviewer-Gate is the emitter; spec-0004 BR-0004-0028 is the rejector (one contract, two enforcers) |
| NFR-0115 (justification-text contract reuse) | absorbed into BR-0015-0009                                                                                                                                                                                                                              | spec-0015     | UPDATE    | APPEND | yusuke_senaga | NFR realized as BR-layer cross-spec SSOT (shared with BR-0004-0028)                                |

## CHG-005 Operations

| Op ID  | Op Type       | Target                                                                                          | Summary                                                                                                                 |
| ------ | ------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Relevant Requirements: REQ-0015-0013 / REQ-0015-0014; Entry-points US range → 0008) | Reviewer-Gate cycle check + `R-PROMPT-SCANNER-DRIFT` emission registered as Relevant Requirements                       |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0015-0007..0008)                                                         | regression-check + drift-emission user stories                                                                          |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0015-0013..0014)                                                  | structural cycle check + 3-part justification ACs                                                                       |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0015-0008..0009)                                                       | mirror BR layer (cycle check is structural / justification 3-part contract is shared SSOT with spec-0004 BR-0004-0028)  |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0015-0009..0010)                                                             | worked examples per AC                                                                                                  |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0015-0017..0019)                                                           | test coverage per AC; integration level for Reviewer-Gate fixture-driven assertions; control (Type=normal) + error case |

- Notes:
  - The option-B path text in REQ-0015-0013 corresponds to the orchestrator's upstream deferred-OQ resolution for OQ-0107 (path resolution recorded in the slice prompt, not duplicated here to avoid distributed-surface leakage).
  - Parallel pack pieces: spec-0004 (validate.json profile path + SSOT-sync pair lane + R-PROMPT-SCANNER-DRIFT justification ingestion); spec-0006 (qfai doctor playwright probe rebuild); spec-0012 (iterate-side scanner / prompt + countWords pure-function); spec-0013 (UI contract template `primary_tasks:` slot + validate lane).
  - The Reviewer-Gate emitter (spec-0015) and the validate rejector (spec-0004) share the 3-part justification contract; updating one without the other must be caught by the same SSOT-sync-pair discipline that this pack itself enforces (BR-0004-0027).
- Source: REQ-0113, REQ-0125 (discussion-20260523221141355); NFR-0115

## CHG-005 Phase 1 follow-ups (2026-05-26)

| Op            | Target spec | REQ / NFR     | Rationale                                                                                                                                                                                                                                 | Approver |
| ------------- | ----------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| UPDATE:APPEND | spec-0015   | REQ-0015-0015 | CHG-005 cycle で REQ-0015-0014 (`R-PROMPT-SCANNER-DRIFT` emission) を実装した `promptScannerPairs.ts` は proof-of-concept として 1 clause のみ。残り 3 violation kinds (font / radius / shadow) の manifest 拡張を follow-up として登録。 | auto     |

## 2026-05-27 — v1.9.2 Second-Wave (spec-0015)

Pack: `.qfai/discussion/discussion-20260527075558258/` (CHG-006). Wave A scaffold (DR-0261..DR-0274) in `_policies/08_Decisions.md`. Posture: append-first `UPDATE:APPEND` only; continued local IDs from true max +1 (US 0009-0015, AC 0015-0021, BR 0010-0016, EX 0011-0017, TC 0020-0033).

| Operation     | Sub-op | Target                                                                         | Source (REQ) | Rationale        | DR-Ref                | Status |
| ------------- | ------ | ------------------------------------------------------------------------------ | ------------ | ---------------- | --------------------- | ------ |
| UPDATE:APPEND | APPEND | US-0015-0009 / AC-0015-0015 / BR-0015-0010 / EX-0015-0011 / TC-0015-0020..0021 | REQ-0160     | cascade verified | DR-0269               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0010 / AC-0015-0016 / BR-0015-0011 / EX-0015-0012 / TC-0015-0022..0023 | REQ-0158     | cascade verified | DR-0270               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0011 / AC-0015-0017 / BR-0015-0012 / EX-0015-0013 / TC-0015-0024..0025 | REQ-0161     | cascade verified | CLI-HANDOFF           | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0012 / AC-0015-0018 / BR-0015-0013 / EX-0015-0014 / TC-0015-0026..0027 | REQ-0168     | cascade verified | OQ-0119 carry-fwd     | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0013 / AC-0015-0019 / BR-0015-0014 / EX-0015-0015 / TC-0015-0028..0029 | REQ-0171     | cascade verified | DR-0271               | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0014 / AC-0015-0020 / BR-0015-0015 / EX-0015-0016 / TC-0015-0030..0031 | REQ-0172     | cascade verified | (SHOULD; CLI-HANDOFF) | PASS   |
| UPDATE:APPEND | APPEND | US-0015-0015 / AC-0015-0021 / BR-0015-0016 / EX-0015-0017 / TC-0015-0032..0033 | REQ-0173     | cascade verified | (doc governance)      | PASS   |

- Decisions: 07_Decisions.md reference rows DR-0015-0003→DR-0269, DR-0015-0004→DR-0270, DR-0015-0005→DR-0271.
- Open questions: OQ-0160 / OQ-0162 / OQ-0163 resolved by the cited DRs; OQ-0119 remains carry-forward deferred (prompt-augmentation timing not resolved).
- 01_Spec.md: Status remains `active`; governance behavior copied down to Consumer View; Relevant Requirements + US range (→0015) updated.
- Approved By: yusuke_senaga (pin-implied under feature/v1.9.2)

## 2026-08-05 — CHG-007 — Reviewer-Gate ingestion of the workflow-hygiene lane codes

Pack: `.qfai/discussion/discussion-20260804173914356/` (CHG-007). Cascade only — this spec defines ingestion; the lane belongs to spec-0017 and the shipped-file rules to spec-0003. Posture: append-first `UPDATE:APPEND`, each new local ID taken from its own class's true max + 1 (US 0015→0016, AC 0021→0022, BR 0016→0017, EX 0017→0018, TC 0034→0035..0036, TDD 0035→0036..0037).

| Operation     | Sub-op | Target                                                                         | Source (REQ)                    | Rationale        | DR-Ref       | Status |
| ------------- | ------ | ------------------------------------------------------------------------------ | ------------------------------- | ---------------- | ------------ | ------ |
| UPDATE:APPEND | APPEND | US-0015-0016 / AC-0015-0022 / BR-0015-0017 / EX-0015-0018 / TC-0015-0035..0036 | CHG-007 pack `#REQ-0013`/`0022` | cascade verified | DR-0015-0006 | PASS   |
| UPDATE:APPEND | APPEND | tdd/test-list.md TDD-0036..0037 (first ledger table)                           | (ledger sync)                   | cascade verified | DR-0015-0006 | PASS   |

- Decisions: DR-0015-0006 records that catalog membership is decided by severity class, that both `CLI-WFSET` codes belong in the closed catalog, and that registering them is deferred as a lockstep change.
- Open questions: OQ-0015-0001 opened (registration timing + the full SSOT set that must move together). No prior open question resolved here.
- Round-2 review corrections folded in: the acceptance criterion was first appended as a duplicate of the CHG-006 `AC-0015-0016` and is renumbered to `AC-0015-0022` (the CHG-006 chain at `AC-0015-0016` is untouched); the two ledger rows were first appended to the file's second Markdown table, which `parseFirstMarkdownTable` never reads, and are moved into the first table.
- Approved By: user@2026-08-05 (CHG-007 pack approval)

## 2026-08-22 — `companyName` removed from the hard-required autopilot bucket

Upstream: `_policies/10_delta.md` § 2026-08-22 (policy-only UPDATE:MODIFY — the DR-0269 statement and `06_Glossary.md`). This spec is the cascade target for the same enumeration.

| Operation     | Sub-op | Target                                                                             | Source (REQ) | Rationale                                                                             | DR-Ref  | Status |
| ------------- | ------ | ---------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------- | ------- | ------ |
| UPDATE:MODIFY | MODIFY | AC-0015-0015 / BR-0015-0010 / 01_Spec.md (Cross-skill governance behavior CHG-006) | REQ-0160     | Drop the consumerless `companyName` from hard-required and follow the DR-0269 wording | DR-0269 | PASS   |

- Change: the hard-required enumeration narrows from `companyName` / brand intent / `primarySpecId` to brand intent / `primarySpecId`. What triggers `R-AUTOPILOT-POLICY-MISSING` — an absent section, or a partly absent bucket — is unchanged.
- Rationale: nothing in the distributed tree reads `companyName`, so the bucket paid the "ask before starting" cost of a hard-required input and read nothing back. Narrowing the bucket is allowed, because there is no reason to ask for an input nobody reads; widening it is not. So one consumerless entry was removed, and the bucket did not become a closed set. A hard-required input a single skill reads stays allowed once that skill declares it by name.
- Regression: `packages/qfai/tests/assets/assets.test.ts` checks that each shipped `SKILL.md` hard-required bucket stays within the two common entries plus whatever that skill declares, and carries no withdrawn entry. It does not check the count, because narrowing is allowed.
- ID stability: no US / AC / BR / EX / TC is renumbered, and nothing is appended.
- Approved By: yusuke_senaga

## Triage (2026-09-23 spec-to-story)

| Source                                                                       | Subject                                                                                                                                          | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Depends-On                                     |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------- |
| discussion-20260923063306456#REQ-0016                                        | Built-in routing and review defaults; `qfai.config.yaml` overrides replace the matching entry; the card frontmatter is the only agent definition | spec-0015     | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                        | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0017                                        | Constitution files and the shared baselines move to `rule/`                                                                                      | spec-0015     | UPDATE    | MODIFY | -             | Slice B, lands P6. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first.                                                                                        | discussion-20260923063306456#REQ-0019, OQ-0177 |
| discussion-20260923063306456#REQ-0018, discussion-20260923063306456#NFR-0010 | Decision records under `.qfai/evidence/decision/` stay tracked and listed by the audit log                                                       | spec-0015     | UPDATE    | MODIFY | -             | Slice B, lands P6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | discussion-20260923063306456#REQ-0019          |
| discussion-20260923063306456#REQ-0012                                        | Approval references point to `decisions.md`                                                                                                      | spec-0015     | UPDATE    | MODIFY | -             | Slice C                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | OQ-0170                                        |
| discussion-20260923063306456#REQ-0019                                        | Routing entry for `/qfai-migration-spec-to-story`                                                                                                | spec-0015     | UPDATE    | APPEND | -             | Slice A; lands P5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | -                                              |
| discussion-20260923063306456#REQ-0016, discussion-20260923063306456#REQ-0017 | Remove the `review-gate.rules.yml` bound and the handling of an adopter's `review-profiles.yml`                                                  | spec-0015     | UPDATE    | REMOVE | yusuke_senaga | Lands P6 with the built-in defaults. If OQ-0177 resolves "absorb", this row closes in a new Triage round. P6 co-change in this repository at `pnpm sync:ssot` time: `qfai.config.yaml` `skillsDir`; the 42 tracked links `.agents/skills/qfai-*`, `.claude/skills/*` and `.claude/agents/*.md`; and the `.qfai/assistant/{skills,agents,constitution,catalog,manifest}` citations in `AGENTS.md`, `.github/copilot-instructions.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `.gitignore`, `README.md`, `.agents/rules/{distributed-surface.local,document-schema,instruction-tree,repository-language}.md`, `.instruction/02_project/agent-selection.md`, the generated `.codex/agents/*.toml`, `scripts/{check-prompt-scanner-pair,check-review-profile-consistency,gen-agent-catalog,gen-codex-agents,smoke-qfai-cli,verify-pack}.mjs` and `scripts/dogfood-backlog.json`. The P5 link-repoint script (migration step 9) runs on this repository first. | discussion-20260923063306456#REQ-0019, OQ-0177 |

## 2026-09-24 — Spec-to-story run: change summary, landing and recorded drift

Run: `/qfai-sdd` batch `sdd-batch-20260923100952585`, from the discussion pack
`discussion-20260923063306456`. The rows are the ones under
`## Triage (2026-09-23 spec-to-story)` above. The Change Summary entry is
DELTA-0002 and the decision is DL-0002. No approved Change Request ordered
this run, so `## Change Requests` gains no row.

### Change summary

- Added: AC-0015-0023 and AC-0015-0024 (both under US-0015-0001);
  BR-0015-0018 to BR-0015-0021; EX-0015-0019 to EX-0015-0022; TC-0015-0037 to
  TC-0015-0043; ledger rows TDD-0054 to TDD-0063 at `todo`, with Notes lines.
  TC-0015-0038 has four rows, one per planted violation, because each is
  caught by a different check (TDD-0055, TDD-0061 to TDD-0063).
- Changed in place, with the new-assistant-tree clause added beside the
  current one (ruling X1): `01_Spec.md` Consumer View, Scope In, Evidence
  Summary, REQ-0158 and Relevant Requirements; US-0015-0001; US-0015-0010;
  AC-0015-0001; AC-0015-0016; AC-0015-0019; BR-0015-0011; BR-0015-0014.
- `10_Plan.md` gains a `### Story-tree layout` subsection under Implementation
  approach, Test approach, NFR approach, Dependencies and Risk mitigation.
- The approved REMOVE row is recorded below and applied at landing. Nothing
  was marked or removed now, and no existing ledger row changed Status (X2,
  X3).

### Landing

The work lands in three pull requests: P1 on its own and merged first; P2 to
P8 in one pull request that also carries the `/qfai-atdd` and
`/qfai-implement` tests; then the removal of the migration-memo guard
exception on its own. Every spec-0015 row lands in the second.

| Triage row (Source)                                                                | Phase | Pull request | What the landing change carries                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------------------- | ----- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0019 (routing entry for the migration skill)                                   | P5    | P2 to P8     | The `qfai-migration-spec-to-story` entry in `manifest/agent-routing.yml`, where routing still lives at P5 (BR-0015-0021). The skill's `roles:` and `routing-profile:` land with the skill, which spec-0018 owns                                                                                                                                                                                                                                                                                                        |
| REQ-0016 (built-in defaults, whole-entry overrides, card as the only definition)   | P6    | P2 to P8     | The defaults move to `packages/qfai/assets/defaults/`; `agentDefinition.ts` merges the overrides; `config.ts` declares `routing:` and `reviewProfiles:`; the 19 cards carry the eight fields with `mission` as its own key; `agent-catalog.yml` and `scripts/gen-agent-catalog.mjs` go. Drops the current catalog clauses from `01_Spec.md` Consumer View, US-0015-0001 and AC-0015-0001. Rewrites TC-0015-0001 (card frontmatter) and TC-0015-0010 (`replaces`) with their tests                                      |
| REQ-0017 (constitution and shared baselines to `rule/`)                            | P6    | P2 to P8     | The files move. Drops the current Evidence Summary clause in `01_Spec.md`. No AC changes                                                                                                                                                                                                                                                                                                                                                                                                                               |
| REQ-0018, NFR-0010 (`.qfai/evidence/decision/`)                                    | P6    | P2 to P8     | `decisionRecord.ts` writes there, `auditLog.ts` lists it, the `audit log` help line in `main.ts` names it and the managed block in `gitignore.ts` keeps it tracked. Drops the `decisions/` clause from `01_Spec.md` Consumer View and REQ-0158, US-0015-0010, AC-0015-0016, AC-0015-0019, BR-0015-0011 and BR-0015-0014. Rewrites EX-0015-0012, EX-0015-0015 and TC-0015-0022, TC-0015-0023, TC-0015-0028, TC-0015-0029 with their tests; TDD-0024, TDD-0025, TDD-0030 and TDD-0031 go stale and are re-verified there |
| REQ-0016, REQ-0017 (REMOVE: the review-gate bound and the adopter's profiles file) | P6    | P2 to P8     | The retirement list below                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| REQ-0012 (approval references to `decisions.md`)                                   | P7    | P2 to P8     | The approval references in the cards and skills point to `decisions.md` rows. The relative links to `../../decisions/CR-20260913-0007-concrete-pattern-review.md` in `01_Spec.md` Evidence Summary, US-0015-0005, AC-0015-0006 and AC-0015-0007 are rewritten to the row. AC-0015-0009's link goes with the REMOVE row                                                                                                                                                                                                 |

### What the approved REMOVE row retires at landing

The REMOVE row stands: OQ-0177 resolved that `review-gate.rules.yml` is
removed, not absorbed, so no new Triage round is needed.

| Item                                     | What goes                                                                                                                                                                                                                                                                     |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-0015-0009                             | Whole: heading, provenance line and Gherkin                                                                                                                                                                                                                                   |
| BR-0015-0005                             | The bullet on the shipped review-gate catalog overriding preserved numeric targets, and the AC-Ref AC-0015-0009                                                                                                                                                               |
| EX-0015-0004                             | The last two Given/When/Then triples (preserved adopter profile; older catalog and prior receipt), and the AC-Ref AC-0015-0009                                                                                                                                                |
| TC-0015-0007                             | The `legacy-profile-preservation` boundary, the negative controls on the preserved numeric target, the adopter fields and the prior catalog receipt, and the AC-Ref AC-0015-0009                                                                                              |
| TC-0015-0009, TC-0015-0015, TC-0015-0016 | Their AC-Ref AC-0015-0009, re-pointed to AC-0015-0023 (Phase 2 node G6-12)                                                                                                                                                                                                    |
| `01_Spec.md`                             | In the Consumer View bullet on `catalog/review-gate.rules.yml`, the catalog bound and the sentence on retaining adopter manifests; the sentence on independently required obligations stays, as BR-0015-0005 keeps it. In REQ-0005, "within the review-gate catalog's bounds" |
| `10_Plan.md`                             | The review-gate half of the Implementation approach paragraph that opens "Use existing `review-profiles.yml` and `review-gate.rules.yml` data only"                                                                                                                           |
| Ledger                                   | TDD-0039 (the `legacy-profile-preservation` boundary) is retired and its ID tombstoned under `## TDD-ID reservations` in `tdd/test-list.md`, citing this row's Source. TDD-0007's selector drops the preserved-numeric-target clause                                          |
| Product                                  | `catalog/review-gate.rules.yml` and the init and upgrade handling of an adopter's `review-profiles.yml`                                                                                                                                                                       |

### Co-changes the landing carries

- The co-change list in the P6 Triage rows' Rationale.
- The 47 shipped cards, skills and rules that name `agent-routing.yml` or
  `review-profiles.yml` cite `rule/agent-selection.md` instead, which states
  the defaults path once.
- `packages/qfai/scripts/lint-shipping.ts` scans `assets/defaults`, and the
  scan list in `.agents/rules/distributed-surface.local.md` changes with it
  (spec-0003 NFR-C0005).
- `scripts/check-review-profile-consistency.mjs` reads
  `packages/qfai/assets/defaults/`.
  `packages/qfai/src/core/manifest/routingPhaseMerge.ts` retires, and
  `skillRoles.ts` stops looking up the project manifest files.
- 13 `Owning module` cells name `agents/`, `constitution/`, `catalog/` or
  `manifest/` paths: TDD-0001 to TDD-0003, TDD-0006, TDD-0007 and TDD-0009 to
  TDD-0016. TDD-0006 is repointed to `packages/qfai/assets/defaults/`,
  TDD-0007 follows the REMOVE row, and the rest go to `agent/` and `rule/`,
  in the rename commit. TDD-0060 already names
  `packages/qfai/assets/defaults/agent-routing.yml`.
- `rule/agent-selection.md` states that a local install of the package is a
  precondition, and that an agent that cannot find the package stops and
  names the install command (user answer U3). The init contract states the
  same under Configuration.
- `README.md` and `packages/qfai/README.md` drop `npx qfai@latest <command>`
  as a way to run without installing, in the same commit, since
  `scripts/check-readme-alignment.mjs` holds them line for line.
- The tests that pin `.qfai/evidence/decisions/`: `decisionRecord.test.ts`,
  `auditLog.defaultFormat.test.ts`, `initGitignoreMigration.test.ts`,
  `gitignoreGovernanceRecords.test.ts` and `gitignoreMatcher.test.ts`.
- `packages/qfai/src/core/preflight/importLiteEvidence.ts` names
  `.qfai/evidence/decisions/**` in a doc comment. The plan's P6 list does not
  name it.

### Recorded drift

- `QFAI-AGENT-001` to `QFAI-AGENT-003` report a missing `agent-catalog.yml`,
  `agent-routing.yml` or `review-profiles.yml`. After P6 no project holds
  those files, and no item or contract says what becomes of the three codes.
  Open as OQ-0181, for the validate contract.
- `_policies/05_Contracts.md` indexes `CLI-AUDIT`, but no
  `.qfai/contracts/cli/qfai-audit.md` is tracked. BR-0015-0014 and the
  decision-record items rest on a contract that does not exist. Open as
  OQ-0187.
- CR-20260913-0007 still has `Applied at` `-`, and the REMOVE row retires the
  part of its scope that TDD-0039 and TDD-0007's catalog selector verify.
  Whether that change request closes when the row lands is open as OQ-0184.
- The Implementation approach paragraph says to add no runtime reader. The P6
  subsection adds one and says so. Handled at landing with the REMOVE row.

### Adopted

- The card frontmatter is the only agent definition, with `mission` as its
  own key (Phase 2 node G6-7, griller ruling (b)).
- The defaults ship as package data under `packages/qfai/assets/defaults/`,
  outside the tree `qfai init` copies, found through `getInitAssetsDir()`
  (Phase 3 node P3-D01).
- An override replaces a default entry whole, and an unmatched entry is added
  (G6-5); the optional review modes have no override key (G6-6).
- The migration skill's routing is the architecture-heavy entry of G6-8.
- AC-0015-0024 is not scoped to the story tree in its Given, an exception to
  X1 adopted by the review-cycle ruling D7. The routing defaults are
  package-level and true on both layouts, which is X1's first clause. The
  migration skill runs on trees not yet migrated, the upgrade path user answer
  U2 names, so a story-tree-only Given would make the criterion false for the
  projects the skill serves.
- TC-0015-0038's four planted violations are four ledger rows (review-cycle
  ruling D2): a different check is its own row, and another input to the same
  check is a selector entry. The card with no `mission` key is
  `QFAI-AGENT-011`; the other three have no validator family, so the test's
  own oracle reads the cards, the shipped and initialised trees and the
  generated TOML (Phase 3 node P3-D11).
- TDD-0060 is owned by `packages/qfai/assets/defaults/agent-routing.yml`,
  where the routing entry lives from P6.
- The approval-reference links are recorded now and rewritten at P7 (G6-9).
- AC-0015-0009's test cases are re-pointed at landing, not now (G6-12, X2).

### Rejected

- Candidate: defaults as TypeScript constants.
- Reason: a card or a skill cannot read them.
- DO NOT: move the routing table into source code.
- Temptation: a constant needs no file lookup and no packaging check.

- Candidate: a default entry in each skill's frontmatter.
- Reason: the review profiles would still need a file, and one table would be
  split across every skill.
- DO NOT: scatter the routing table across the skills.
- Temptation: each skill would carry its own routing next to its roles.

- Candidate: keep the defaults under `assets/init/`.
- Reason: init would copy them into every project, which BR-0015-0019
  forbids.
- DO NOT: ship a routing or review-profile file into a project.
- Temptation: the files are already there and every reader finds them.

- Candidate: remove spec-0004's `developer_instructions` guard items with the
  catalog copy (Phase 2 node G6 C2).
- Reason: REQ-0016 removes only the catalog copy. The guard between the card
  body and the generated Codex TOML still has work to do, so spec-0004
  modifies it into a two-way guard instead (G4-9).
- DO NOT: delete that guard as part of this row.
- Temptation: with no catalog there looks to be nothing left to compare.

## 2026-09-24 — P6 landing

- The approved REMOVE row removes AC-0015-0009 and the catalog and adopter
  profile clauses named above. TDD-0039 is reserved and cannot be reused.
  TDD-0007 covers the remaining abstract-only N/A boundary.
- The 19 card frontmatters, package defaults, whole-entry overrides and
  migration-skill route are the current agent contract. QFAI-AGENT-001 to
  QFAI-AGENT-003 are retired with the project manifest files (OQ-0181).
  `.qfai/contracts/cli/qfai-validate.md` records their retirement.
- Decision records have one current directory, `.qfai/evidence/decision/`.
  The audit contract indexes the same directory. TDD-0024, TDD-0025,
  TDD-0030 and TDD-0031 return to `todo` for this move; their earlier
  evidence remains historical. P6 test paths on new ledger rows are
  candidates until CI and owner review complete.
- CR-20260913-0007 remains approved with `Applied at` unset (OQ-0184).
  Retiring the review-gate catalog scope does not prove the surviving
  concrete-review behavior or complete its owner gates.
