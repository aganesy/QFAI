# 09 Delta (Migration Record)

## 2026-09-24 — Scaffold example uses the story-tree command

DR-0008-0004 applies the approved P7 `--story`/`--flow` cutover to AC-0008-0011, BR-0008-0009, EX-0008-0010 and TC-0008-0014. The legacy `--spec`/TC-file clauses are historical only. EX-0008-0010 now has explicit Given, When and Then clauses, keeps the non-overwrite behavior, and reports the third validate-cycle escalation by AC or BF ID. This is UPDATE:MODIFY of the existing chain; no new ID or additional approval is required.

## Origin

- Consolidates: old spec-0013 (UI/UX review -- ATDD-relevant parts)
- Old spec-0013 covered UI/UX review framework including ATDD integration
- ATDD acceptance test orchestration parts are now captured in this spec (spec-0008)

## Adopted

- AD-0008-0001: ATDD skill consolidation -- all acceptance test orchestration (E2E/API/Integration) unified under CAP-0008
- AD-0008-0002: Layer-annotation mapping -- strict annotation per test layer (US for E2E, TC for Integration, CON-API for API)

## Rejected

- RJ-0008-0001: Unit/Component test inclusion in ATDD
  - DO NOT include unit/component tests in this skill scope
  - Temptation: adding unit tests to ATDD for "completeness"
  - Reason: unit/component tests belong to `/qfai-implement` per separation of concerns

## ID Renumbering

| Old ID                       | New ID                      | Notes                             |
| ---------------------------- | --------------------------- | --------------------------------- |
| spec-0013 US/TC (ATDD parts) | US-0008-YYYY / TC-0008-YYYY | Renumbered to spec-0008 namespace |

## Post-Migration Changes

| Date       | Change Type | IDs Added                                                                          | Summary                                                                                                                      |
| ---------- | ----------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | US-0008-0006, AC-0008-0009, BR-0008-0007, EX-0008-0008, TC-0008-0011, TC-0008-0012 | テストケース品質深度チェック: Coverage Depth Matrix 必須化、正常系のみ不完全判定、test-design-analyst/qa-gatekeeper 責務拡張 |

## Triage

| Source                                                     | Subject                                                                                                                                                                           | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-atdd` SKILL.md に `project_memory:` 宣言追加。author 前に open work-log entry を読む。kind 別 write-trigger に従う。handoff entry body を 5 セクション schema に従わせる。 | spec-0008     | UPDATE    | APPEND | pin-implied | Implementation-phase skill (REQ-0005 scope)。SKILL.md は配布物。subject-token overlap (`skill`, `atdd`)。新 CAP 不要。                                                                                                                                                                                                                                            |
| REQ-0024 (discussion-20260804173914356, CHG-007)           | worker-scoped credential-reuse rule as ATDD guidance (seven rules + companion injected-environment rule + credential-class script-naming rule)                                    | spec-0008     | UPDATE    | APPEND | -           | ATDD owns E2E / API / Integration orchestration, so acceptance-harness credential handling is its subject. Prose guidance only, backend-agnostic, names no browser backend; no validator, no finding code, no new test layer and no new annotation token, so the layer vocabulary does not grow. No size signal: ac 11→14 (threshold 30), tc 14→18 (threshold 50) |

## CHG-003 (v1.9.0) — Work-log Read Contract + project_memory Declaration

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `qfai-atdd` SKILL.md MUST gain a `project_memory:` YAML block enumerating the layers it reads. The skill MUST read open work-log entries (`status` ∈ `{active, handoff}` and `scope` ∈ `{global, <current-spec>}`) before authoring, and MUST cite consulted entry IDs in its completion report (REQ-0005). The skill MUST follow the 11-`kind` write-trigger SSOT (REQ-0004) and the handoff-brief body schema (REQ-0017).
- Cascade: SKILL.md declaration is validated by spec-0004's `qfai validate` (companion spec-0004 row). Reviewer-Gate `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` runs on this skill's outputs (companion spec-0015 row).
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017

## 2026-05-27 — v1.9.2 Second-Wave (spec-0008)

- Discussion pack: `.qfai/discussion/discussion-20260527075558258/`
- Operation: UPDATE:APPEND (additive; preserves existing US/AC/BR/EX/TC numbering)
- Local ID ranges added: US-0008-0007, AC-0008-0010..0011, BR-0008-0008..0009, EX-0008-0009..0010, TC-0008-0013..0014

## Triage (2026-05-27 second wave)

Rows owned by this spec. `Approved By` is `-` throughout: every row is append-first, so no operation here is approval-gated.

| Source   | Subject                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                   | DR-Ref  | Status |
| -------- | -------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------- | ------- | ------ |
| REQ-0157 | 01_Spec.md (Relevant Requirements + US range→0007 + Consumer-View copy-down)           | spec-0008     | UPDATE    | APPEND | -           | atdd scaffold bulk skeleton gen; cascade verified           | DR-0272 | PASS   |
| REQ-0157 | 02_User-stories.md (US-0008-0007)                                                      | spec-0008     | UPDATE    | APPEND | -           | scaffold user story; cascade verified                       | DR-0272 | PASS   |
| REQ-0157 | 03..06 (AC-0008-0010,0011 / BR-0008-0008,0009 / EX-0008-0009,0010 / TC-0008-0013,0014) | spec-0008     | UPDATE    | APPEND | -           | skeleton shape + idempotency + escalation; cascade verified | DR-0272 | PASS   |
| REQ-0157 | 07_Decisions.md (DR-0008-0003 cites DR-0272) + 08_Open-questions (OQ-0166)             | spec-0008     | UPDATE    | APPEND | -           | escalate-count resolved by DR-0272; cascade verified        | DR-0272 | PASS   |

- Notes:
  - REQ-0157 が "default deferred to /qfai-sdd" としていた escalate-cycle count は DR-0272 (既定 3, `atdd.scaffoldEscalateCycles` 可変) で確定。
  - Required edges US-0008-0007 → AC-0008-0010/0011 → BR-0008-0008/0009 → EX-0008-0009/0010 → TC-0008-0013/0014; TC は normal (0013) AND error/boundary (0014) を両方カバー。
- Source: REQ-0157 (discussion-20260527075558258)

## 2026-08-05 — CHG-007 — Worker-scoped credential-reuse rule as ATDD guidance (spec-0008)

- Discussion pack: `.qfai/discussion/discussion-20260804173914356/`
- Policy record: `_policies/10_delta.md` § `2026-08-05 — CHG-007` (Triage Table row `REQ-0024 → spec-0008 UPDATE:APPEND`)
- Operation: UPDATE:APPEND (additive; preserves every existing US/AC/BR/EX/TC ID and sentence)
- Local ID ranges added: US-0008-0008, AC-0008-0012..0014, BR-0008-0010..0012, EX-0008-0011..0013, TC-0008-0015..0018
- Approved By: `-` (append-first; no AskUserQuestion-gated operation in this row)
- Triage row: recorded in this file's `## Triage` table (canonical column set), appended rather than duplicated as a second section.

### CHG-007 Operations (spec-0008)

| Op ID  | Op Type       | Target                                                                                            | Summary                                                                                              |
| ------ | ------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope In bullet; Relevant Requirements: REQ-0024; US range → 0008; CHG-007 copy-down) | guidance contract を execution SSOT に copy-down                                                     |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0008-0008)                                                                 | worker-scoped credential-reuse guidance user story                                                   |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0008-0012..0014)                                                    | rule set present / backend-agnostic + vocabulary frozen / adopter-only script-naming and layer scope |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0008-0010..0012)                                                         | mirror BR layer                                                                                      |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0008-0011..0013)                                                               | worked examples per BR                                                                               |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0008-0015..0018)                                                             | normal (0015) + error (0016) + boundary (0017, 0018) coverage                                        |
| OP-007 | UPDATE:APPEND | 08_Open-questions.md (OQ-0007 resolution note)                                                    | OQ-0007 は upstream で resolved (backend-agnostic guidance only) — residual なしを記録               |
| OP-008 | UPDATE:APPEND | 10_Plan.md (CHG-007 How section)                                                                  | How-only 実装ノート                                                                                  |
| OP-009 | UPDATE:APPEND | tdd/test-list.md (TDD-0015..0018)                                                                 | ledger rows for TC-0008-0015..0018 (Status `todo`)                                                   |

- Notes:
  - **Prose only.** No validator, no new finding code, no new test layer, no new annotation token. NFR-0015 (the layer vocabulary does not grow) is the binding constraint, and the layer-policy loader reads only `catalog/test-layers.md` plus its legacy fallback, so a skill reference artifact is invisible to it by construction.
  - **Backend-agnostic.** OQ-0007 resolved to backend-agnostic guidance only; a recorded decision rejects hard-coding a browser backend. The guidance therefore names none, and any worked example is one illustration among possible backends with nothing named, installed or pinned. TC-0008-0016 carries a planted-name negative case so a green scan is not vacuous.
  - **Companion rule** (caller-injected environment identifier forbids provisioning / teardown) is recorded in the same artifact, per the upstream requirement.
  - **Script-naming rule** (`OQ-0014` resolved to document rather than adopt) ships as adopter guidance only; QFAI keeps its own script names.
  - **Not dogfooded, and it says so.** QFAI's own suite has zero credentials, so the rules cannot be verified by execution here — only by inspection. That is why the upstream priority is `should`, and the guidance states the position rather than hiding it.
  - **RJ-0008-0001 respected.** The guidance obliges E2E / API / Integration only. No unit or component obligation is introduced; unit and component tests remain `/qfai-implement` territory.
- Source: REQ-0024 (discussion-20260804173914356)

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                                                                                                                                                                                                                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                                                                                               | Depends-On       |
| ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010, discussion-20260923063306456#REQ-0015 | ATDD writes the BF (E2E) and AC (integration or API) tests                                                                                                                                                                                                                                                                                                                                    | spec-0008     | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover). Checked: this spec's TCs are integration asset tests and its E2E ledger rows cite its own US, so no TC's Level or obligation column changes and no ledger row is deleted                                                                                                    | OQ-0178, OQ-0170 |
| discussion-20260923063306456#REQ-0009                                                                               | Remove the `QFAI:SPEC-*` and `QFAI:CON-API` annotation obligations and the TC forbidden-reference rule                                                                                                                                                                                                                                                                                        | spec-0008     | UPDATE    | REMOVE | yusuke_senaga | Slice B, lands P7 (P4 merged into cutover), with the ATDD rewrite and the asset tests annotating these TCs; retired TDD-IDs are tombstoned                                                                                                                                                                              | OQ-0178, OQ-0170 |
| discussion-20260923063306456#REQ-0015                                                                               | `qfai atdd scaffold --story US-NNNN-NNNN`: one skeleton per AC under the integration home, at `<integration-home>/<US-ID>/<AC-ID>.test.<ext>`, carrying `QFAI:AC-…`, with `D-SCAFFOLD-PLACEHOLDER` keyed by AC-ID; exactly one of `--story` and `--flow` (items US-0008-0007, AC-0008-0010, AC-0008-0011, BR-0008-0008, BR-0008-0009, EX-0008-0009, EX-0008-0010, TC-0008-0013, TC-0008-0014) | spec-0008     | UPDATE    | MODIFY | -             | Slice C, lands P7 (P4 merged into cutover). Decided by the user (N19). TC-0008-0013 and TC-0008-0014 stay at Level integration, so no ledger row is deleted. `D-SCAFFOLD-FOREIGN-HOME` is retired (N35)                                                                                                                 | OQ-0170          |
| discussion-20260923063306456#REQ-0015                                                                               | `qfai atdd scaffold --flow BF-NNNN`: one E2E skeleton at `<testsDir>/e2e/<BF-ID>.test.<ext>` carrying `QFAI:BF-…`, with `D-SCAFFOLD-PLACEHOLDER` keyed by BF-ID                                                                                                                                                                                                                               | spec-0008     | UPDATE    | APPEND | -             | Slice C, lands P7 (P4 merged into cutover). Decided by the user (N19)                                                                                                                                                                                                                                                   | OQ-0170          |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The scoped completion gate moves from `qfai validate --profile atdd --spec <spec-id>` to `--flow BF-NNNN`                                                                                                                                                                                                                                                                                     | spec-0008     | UPDATE    | MODIFY | -             | Slice C, lands P7 (P4 merged into cutover). Follows the user's Phase 2 grilling answer (Q2) and spec-0004's `--flow` rows. The skill gates on `--spec` today in `SKILL.md` (completion gate) and `references/cross-spec-obligations.md`                                                                                 | OQ-0170          |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The ATDD evidence file and the Coverage Depth Matrix are keyed by business flow (US/AC/EX)                                                                                                                                                                                                                                                                                                    | spec-0008     | UPDATE    | MODIFY | -             | Slice C, lands P7 (P4 merged into cutover). Follows the user's Phase 2 grilling answer (Q2): skills gate per flow. Today `SKILL.md` writes `.qfai/evidence/atdd-<spec-id>.md` and `.qfai/evidence/coverage-depth-<spec-id>.md`, one per spec, with matrix rows per US and TC. Adopted in the Phase 2c grilling (P2C-O8) | OQ-0170          |

## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands

The record of the `/qfai-sdd` batch run 20260923100952585, whose intake is the
discussion pack `discussion-20260923063306456`. Its Triage rows are under
`## Triage (2026-09-23 spec-to-story)` above. Every decision it rests on is in
`.qfai/evidence/sdd-batch-20260923100952585.md`, and the short IDs in
parentheses below (N19, X2, P3-C1 and so on) are that record's. No approved
change request ordered this run.

### What this run changed

Items that already existed keep their current text. Where the story tree
changes what an item says, a clause conditioned on the layout was added beside
the current one (X1). Existing test cases keep their text until their row lands
(X2).

| File                        | Added                                                                      | Changed in place                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `01_Spec.md`                | two Scope lines (scaffold, scoped gate); three pack requirement lines      | Scope coverage lines, NFR-0001, REQ-0002, REQ-0003; the REQ-0157 and Entry points scaffold lines, translated to English with the same meaning |
| `02_User-stories.md`        | none                                                                       | US-0008-0001, 0002, 0004, 0005, 0006, 0007                                                                                                    |
| `03_Acceptance-Criteria.md` | AC-0008-0015, 0016                                                         | AC-0008-0001, 0002, 0004, 0009, 0010, 0011                                                                                                    |
| `04_Business-Rules.md`      | BR-0008-0013, 0014                                                         | BR-0008-0001, 0003, 0005, 0007, 0008, 0009                                                                                                    |
| `05_Examples.md`            | EX-0008-0014..0018                                                         | EX-0008-0001, 0002, 0005, 0008, 0009, 0010                                                                                                    |
| `06_Test-Cases.md`          | TC-0008-0019..0023                                                         | none                                                                                                                                          |
| `tdd/test-list.md`          | TDD-0027..0035 at `todo`, one row per boundary with a `Boundary` slug      | none; no Status moved                                                                                                                         |
| `10_Plan.md`                | a `### Story-tree layout` subsection under each heading the change touches | none                                                                                                                                          |

### How it lands

Delivery is three pull requests (user answers P3-C1, P3-C2 and P3-C3). The
first carries P1 alone and the third removes a guard exception; neither touches
this spec. Every row of this spec lands at P7, the cutover step that also
carries the skill rewrites, in the second pull request. That pull request also
runs `/qfai-atdd` and `/qfai-implement` and carries their tests.

Nothing is tombstoned, marked or deleted now (X3). Each row retires its items in
the change that lands it.

| Triage row                                                              | Operation     | Lands | Items                                                                                                                                                              |
| ----------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ATDD writes the BF (E2E) and AC (integration or API) tests              | UPDATE:MODIFY | P7    | US-0008-0001, 0002, 0004, 0006; AC-0008-0001, 0002, 0004, 0009; BR-0008-0001, 0003, 0005, 0007; EX-0008-0001, 0002, 0005, 0008, 0017; TC-0008-0022; TDD-0030, 0035 |
| Remove the `QFAI:SPEC-*` and `QFAI:CON-API` obligations and the TC rule | UPDATE:REMOVE | P7    | see below                                                                                                                                                          |
| `qfai atdd scaffold --story US-NNNN-NNNN`                               | UPDATE:MODIFY | P7    | US-0008-0007; AC-0008-0010, 0011; BR-0008-0008, 0009; EX-0008-0009, 0010, 0014; TC-0008-0019; TDD-0027, 0032, 0033, 0034                                           |
| `qfai atdd scaffold --flow BF-NNNN`                                     | UPDATE:APPEND | P7    | AC-0008-0015; BR-0008-0013; EX-0008-0015; TC-0008-0020; TDD-0028                                                                                                   |
| The scoped completion gate moves to `--flow BF-NNNN`                    | UPDATE:MODIFY | P7    | US-0008-0005; AC-0008-0016; BR-0008-0014; EX-0008-0016; TC-0008-0021; TDD-0029                                                                                     |
| The ATDD evidence file and the Coverage Depth Matrix are per flow       | UPDATE:MODIFY | P7    | the file-name clauses of AC-0008-0009 and BR-0008-0007; EX-0008-0018; TC-0008-0023; TDD-0031                                                                       |

At landing, in the same P7 change:

- Each item that carries a layout-conditioned clause drops its spec-pack clause.
  The list of those items is kept with OQ-0170.
- The existing test cases that cite a changed criterion or example take the
  target text: TC-0008-0001, 0002, 0004, 0006, 0007, 0008, 0009, 0010, 0011,
  0012, 0013 and 0014. TC-0008-0013 and 0014 move to `--story` with the
  scaffold. Their ledger rows then follow the upstream-reset rule.
- `D-SCAFFOLD-FOREIGN-HOME` is retired (N35).

### What the REMOVE row retires

The `QFAI:SPEC-*` and `QFAI:CON-API` annotation obligations and the TC
forbidden-reference rule leave `packages/qfai/src/core/atddTraceability.ts` at
P7. The directory-to-layer crosswalk stays in that file. The row retires:

- `01_Spec.md`: the Scope lines "Annotation obligations" and "Forbidden
  reference enforcement", and REQ-0005
- US-0008-0003, with its catalog line
- the phrase "forbidden references" in US-0008-0005
- AC-0008-0003 and AC-0008-0005
- BR-0008-0002
- EX-0008-0003 and EX-0008-0004
- TC-0008-0003 and TC-0008-0005
- ledger rows to tombstone: TDD-0003 and TDD-0005, which carry those test
  cases, and TDD-0021, the E2E row of US-0008-0003

Two references would dangle once those items go, and are repaired in the same
change (G5-5):

- BR-0008-0003 cites AC-0008-0003; it cites AC-0008-0001 instead.
- BR-0008-0005 cites AC-0008-0005; it cites AC-0008-0002 and AC-0008-0004
  instead.

NFR-0003 is rewritten at landing, not retired: retiring it needs an approved
REMOVE row, and the REMOVE row above does not name it (review ruling D8c).

- Current: "zero TC annotations in E2E/API test files".
- Target, on the story tree: "zero `QFAI:AC-`/`QFAI:EX-` annotations in E2E
  test files; zero `QFAI:BF-` outside E2E".
  `01_Spec.md` states this target beside the current clause, conditioned on
  the story-tree layout; the P7 landing drops the current clause.

The plan measures a breach as a misplaced-annotation error (N04).

### Co-changes the landing carries

- The tests that pin today's wording change in the P7 commit that changes the
  text they read: `tests/assets/perSpecGateScope.test.ts`,
  `tests/assets/atddDbContractObligationLists.test.ts`,
  `tests/assets/coverageDepthMatrixHome.test.ts`,
  `tests/integration/atddSkillSpec0008.test.ts` and the three
  `tests/integration/atddScaffold*.test.ts` suites.
- The `test-design-analyst` card states the per-flow evidence and matrix file
  names in the same commit.
- The asset tests annotating TC-0008-0003 and TC-0008-0005 are removed or
  re-annotated with the REMOVE row.
- The P6 rename commit repoints the ledger's `Owning module` cells that name
  `skills/` paths.
- `packages/qfai/src/cli/lib/exitCodes.ts` moves `atdd scaffold` out of the
  "other commands" row of the exit-code help into its own row, "2 = a usage
  error or an ID the tree does not define", and
  `tests/cli/usageExitCodes.test.ts` asserts that row (review ruling D3).

### Recorded drift

Found while drafting and recorded rather than fixed, because no row of this run
covers it (X11):

- The scaffold items say `tests/atdd/spec-NNNN/<TC-ID>.test.*`. The code and the
  contract's current section write `<testsDir>/integration/<spec-id>/`. Open
  until P7, when the `--spec` clause goes and the `--story` clause states the
  path.
- BR-0008-0001 cites AC-0008-0001. The rule is about the annotations of
  AC-0008-0002 and AC-0008-0004. Repaired at landing with the references above.
- TDD-0030 and TDD-0035 name `packages/qfai/src/core/atddTraceability.ts` as
  their owning module. The Phase 3 plan puts the undeclared-annotation family in
  `storyTreeObligations.ts`. Open; the cell is not changed.
- Settled in review cycle 1: `qfai-validate.md#what-counts-as-a-test` now names
  `atddTraceability.ts` as the crosswalk reader. The function stays there.
- Settled in Phase 2c: the `Row:` lines of `qfai-atdd-scaffold.md` and
  `qfai-validate.md` named the wrong row of this spec (P2C-04), and the `--flow`
  anchor was provisional until the validate contract gained `### Flow scope`.
  BR-0008-0014 cites `qfai-validate.md#flow-scope`.

### Adoption and rejection

Adopted:

- The scaffold takes exactly one of `--story` and `--flow` (N19, Q2).
- Neither option, both, a malformed ID and a well-formed ID the tree does not
  define all exit 2 and write nothing, following the usage-error code
  `exitCodes.ts` gives every command. On the story tree `--spec` exits 2 with
  a message naming `--story` and `--flow`; before P7 it behaves as today.
  Exit 1 is kept for a runtime failure reading or writing a file (review ruling
  D3).
- TC-0008-0019 and TC-0008-0022 are seeded as one ledger row per rejection
  reason or check, each with its own `Boundary` slug. Another input to the
  same check, such as `--spec` alone for the no-option check or each of the
  BF, AC and EX annotations, is a selector entry on that row (review ruling
  D2).
- The skeleton homes come from `atddTestKindDirs`, the crosswalk the obligation
  families read.
- An annotation naming an undefined ID is validate's undeclared-annotation
  family. This spec adds no code for it (N18).
- The evidence file and the matrix are written per business flow (P2C-O8).

Rejected:

- Keeping `--spec` beside `--story`.
  - DO NOT: accept `--spec` on the story tree; it exits 2 there.
  - Temptation: existing callers and tests already use it.
- A directory map of the scaffold's own.
  - DO NOT: copy the directory-to-layer crosswalk into the scaffold.
  - Temptation: the scaffold needs only two directories. Two maps of one
    crosswalk drift, and the first sign is a filled skeleton failing the
    misplaced-annotation check.
- Pinning the `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that the new `todo`
  cases raise in the dogfood lanes.
  - DO NOT: add a dogfood pin for them.
  - Temptation: a pin turns the lanes green at once. Pull request 2 carries the
    ATDD and implementation tests, which clear the errors (P3-C1).
