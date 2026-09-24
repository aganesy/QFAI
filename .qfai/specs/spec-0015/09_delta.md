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

## Update History

| Date       | DL      | Summary                                                              |
| ---------- | ------- | -------------------------------------------------------------------- |
| 2026-09-14 | DL-0001 | Bound concrete-pattern review and record the authorized owner rerun. |

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
tags: ["@docs"]
compat: Compatibility
scope:
  - spec-0015
  - manifest/agent-routing.yml
  - contracts/cli/qfai-init.md
notes: An upgraded project gains the qfai-run and qfai-maintain routing entries through qfai init --force (DR-0015-0007).
```

#### Migration / Follow-ups

- The upgrade report and the fail-closed refusal at `start` name
  `qfai init --force`. Their tests belong to spec-0003 and spec-0018.

#### Rejected

- option: Merge routing entries on every qfai init
  reason: It changes the released --force behaviour the init contract states.
  do_not: Run the add-only routing merge without --force.
  temptation: The merge only adds entries.
- option: Make manifest/ a provenance-governed layer
  reason: It rewrites a layer qfai-configure owns.
  do_not: Put the manifests under the provenance lock.
  temptation: The lock already refreshes unmodified copies.

#### Verification

- The routing-manifest test case of BR-0015-0018 reads the shipped manifests only.

## Change Requests

| CR ID            | Upstream artifact                                                                      | Mode      | Approved by                                             | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------- | -------------------- |
| CR-20260913-0007 | `spec-0015/04_Business-Rules.md`                                                       | re-derive | user (current session's delegated implementation scope) | -                    |
| CR-20260924-0002 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user                                                    | 2026-09-24T18:26:35Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user                                                    | 2026-09-24T19:00:08Z |

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

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

| Source             | Subject                                                                                                                                   | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                   | Depends-On        |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| REQ-0049, REQ-0057 | `agent-routing.yml` and `review-profiles.yml` gain `qfai-run` and `qfai-maintain`, each with a routing profile, roles and a routing block | spec-0015     | UPDATE    | APPEND | -           | AC-0015-0009 makes the routing manifest the single source. A new skill needs its profile, roles and routing block in the same change. Size: 22 AC today and 26 after the appends in this table, under the threshold                         | REQ-0033          |
| REQ-0013           | A valid run binding counts as a supplied `primarySpecId`                                                                                  | spec-0015     | UPDATE    | MODIFY | -           | BR-0015-0010 lists `primarySpecId` as hard-required when absent. A binding a run supplies now counts as present, and the shared baseline states the exception. AC-0015-0015 and US-0015-0009 follow                                         | REQ-0033          |
| REQ-0057           | How the three authorization kinds relate to the Default Autopilot Policy buckets                                                          | spec-0015     | UPDATE    | APPEND | -           | BR-0015-0010 owns the buckets. OQ-0008's recommendation maps `human_decision` onto the ask-user bucket and adds no new concept                                                                                                              | REQ-0033, OQ-0008 |
| REQ-0040           | The history of authors, recommenders and reviewers is carried across a run                                                                | spec-0015     | UPDATE    | APPEND | -           | An agent never counts as the independent reviewer of its own authoring or recommendation anywhere in the run, and no reviewer is dropped to save tokens. An unavailable required delegation stops the run, as BR-0015-0003 already requires | REQ-0033          |
| REQ-0055           | Grilling inside a run works only the remaining frontier                                                                                   | spec-0015     | UPDATE    | APPEND | -           | Settled inputs are taken as given, the split between user and delegated sessions is kept, and the run never invokes `qfai-grill`. No spec owns the grilling skills, and skill integration is this spec's                                    | REQ-0033          |

## 2026-09-24 — Intent-driven entry: change summary

- Modified in place, IDs kept, no `Source` added: US-0015-0009, AC-0015-0015 and
  BR-0015-0010. A `primarySpecId` that a workflow run's binding supplies counts
  as supplied. The existing test cases are unchanged.
- Appended: AC-0015-0023..0026; BR-0015-0018..0021; DR-0015-0007 with DL-0002;
  the `## Contract Realization` table in `04_Business-Rules.md`. No story is
  added: AC-0015-0023 sits under US-0015-0001, because AC-0015-0009, the
  routing-manifest criterion, traces to no story. AC-0015-0024 sits under
  US-0015-0009, and AC-0015-0025 and AC-0015-0026 under US-0015-0003.
- Resolved pack question: `discussion-20260923171450572#OQ-0008`, recorded in
  `08_Open-questions.md`.
- DR-0015-0100, cited by exception rows of the ledger, is not reused.
- Size: AC 22 → 26, under the threshold. Test cases are budgeted at 14 new ones,
  keeping the count at 50 or under.

## 2026-09-24 — Phase 2c.1 obligation amendment

- BR-0015-0021 is reworded, ID kept. A grilling session inside a run reads what
  is settled from the work order's `settled` field (CLI-WF `### Work order`).
- `## Contract Realization` gains two rows: BR-0015-0003 against CLI-WF
  `### Stage result` (`delegation`), and BR-0015-0021 against `### Work order`.
