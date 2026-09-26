# 09 Delta (Migration Record)

## 2026-09-24 — The implementation cycle has separate criterion-scoped examples

DR-0011-0003 narrows EX-0011-0001→AC-0011-0001/TC-0011-0001, removes its retired BR-0011-0002 reference, and archives the legacy ledger text at `.qfai/evidence/migration-spec-to-story/retired/spec-0011/legacy-ex0001.md`. New EX-0011-0017→AC-0011-0003/old TC-0011-0003; EX-0011-0018→AC-0011-0006/old TC-0011-0006; EX-0011-0019→AC-0011-0008/old TC-0011-0008. AC-0011-0006 and its TC now state the still-required confirmation and checkpoint gates without a ledger transition. New BR-0011-0015 states qa-gatekeeper authority directly.

## Origin

- Consolidates: old spec-0014 (TDD unification), spec-0015 (Guardrail Hardening), spec-0016 (Dev Toolkit Hardening)
- Old spec-0014 unified 3 TDD skills into `/qfai-implement`
- Old spec-0015 added Phase 2 validators and 8-column template
- Old spec-0016 formalized 6-agent roster, completion contracts, evidence contracts, parallel dispatch rules

## Adopted

- AD-0011-0001: Single TDD entry point -- `/qfai-implement` with embedded micro-cycle (from spec-0014)
- AD-0011-0002: 8-column test-list.md -- TDD-ID, TC-Refs, Layer, Test file, Selector, Status, DR-ID, Evidence (from spec-0015)
- AD-0011-0003: 6-agent sub-agent roster -- formal agent definitions with responsibilities and prohibitions (from spec-0016)
- AD-0011-0004: 10-point completion gate -- machine-enforceable completion conditions (from spec-0016)
- AD-0011-0005: Evidence contract hardening -- per-item fresh evidence with RED/GREEN command+result (from spec-0016)
- AD-0011-0006: Failed first delegation hard-stop mitigation -- the first required real delegation doubles as the capability probe, and failure must stop immediately with remediation guidance (from spec-0011/10_Plan.md Risk mitigation)

## Rejected

- RJ-0011-0001: Old 3-skill TDD workflow (qfai-tdd-red, qfai-tdd-green, qfai-tdd-refactor)
  - DO NOT reintroduce separate TDD phase skills
  - Temptation: splitting implement back into separate skills for "modularity"
  - Reason: single entry point eliminates phase-skipping and ensures full cycle enforcement

- RJ-0011-0002: Status-only evidence
  - DO NOT accept evidence without command+result pairs
  - Temptation: marking items done with "looks good" or "should pass"
  - Reason: observable proof is required per evidence hard rules

## ID Renumbering

| Old ID                 | New ID       | Notes                 |
| ---------------------- | ------------ | --------------------- |
| spec-0014 US-0014-YYYY | US-0011-YYYY | TDD unification       |
| spec-0015 US-0015-YYYY | US-0011-YYYY | Guardrail hardening   |
| spec-0016 US-0016-YYYY | US-0011-YYYY | Dev toolkit hardening |

## 2026-05-06 — CHG-001 — Absorbed simplified handoff + design-system input from spec-0017 (decomposition)

| Op ID  | Op Type       | Target                                             | Summary                                                                          |
| ------ | ------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| OP-001 | UPDATE:APPEND | 01_Spec.md (Scope.In, Entry points US range)       | simplified handoff schema + design-system input bullets; US range → US-0011-0008 |
| OP-002 | UPDATE:APPEND | 02_User-stories.md (US-0011-0007..0008)            | simplified handoff + design-system input user stories                            |
| OP-003 | UPDATE:APPEND | 03_Acceptance-Criteria.md (AC-0011-0009..0010)     | simplified handoff schema + design-system mirror byte-equivalence                |
| OP-004 | UPDATE:APPEND | 04_Business-Rules.md (BR-0011-0007..0008)          | mirror BR layer for OP-003                                                       |
| OP-005 | UPDATE:APPEND | 05_Examples.md (EX-0011-0008..0009)                | worked examples per AC                                                           |
| OP-006 | UPDATE:APPEND | 06_Test-Cases.md (TC-0011-0011..0012)              | test coverage per AC                                                             |
| OP-007 | UPDATE:APPEND | tdd/test-list.md (TDD rows for TC-0011-0011..0012) | TDD ledger sync                                                                  |

- Approved By: yusuke_senaga
- Notes: subjects originated from former spec-0017 (Prototyping v2.0 / UX-loop redesign decomposition). The mirror invariant for `design-system.yaml` is enforced by the design contract validator family owned by spec-0004; `/qfai-implement` only consumes the validated mirror.

## Triage

| Source                                                     | Subject                                                                                                                                                                                             | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                             |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017 (CHG-003) | `/qfai-implement` SKILL.md に `project_memory:` 宣言追加、author 前に open work-log entry を読み、kind 別 write-trigger に従い entry を書く。handoff entry body を 5 セクション schema に従わせる。 | spec-0011     | UPDATE    | APPEND | pin-implied | Primary worklog-writer (most write-trigger surface area)。implementation-phase skill (REQ-0005 scope)。subject-token overlap (`skill`, `implement`)。 |

## CHG-003 (v1.9.0) — Primary Worklog-writer Contract

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- Obligation: `/qfai-implement` is the **primary** worklog-writer. SKILL.md MUST:
  1. Carry a `project_memory:` block enumerating layers it reads.
  2. Read open work-log entries (`status` ∈ `{active, handoff}`, `scope` ∈ `{global, <current-spec>}`) before authoring; cite consulted entry IDs in completion report (REQ-0005).
  3. Write entries at the 11 conditions listed in `_policies/10_Policy.md#work-log-write-triggers` (REQ-0004) — milestone, decision, risk, consultation-needed, unexpected, unscoped-discovery, handoff, blocker, scope-up, scope-down, spike.
  4. Follow the handoff-brief body schema (REQ-0017) for `kind: handoff` entries.
  5. Treat `kind: unscoped-discovery` as non-blocking (REQ-0016): record and continue, do not abort current scope.
- Cascade: SKILL.md `project_memory:` validated by spec-0004. Reviewer-Gate drift checks (spec-0015) run on outputs.
- Source: REQ-0004, REQ-0005, REQ-0010, REQ-0016, REQ-0017

## Triage (2026-09-23 spec-to-story)

| Source                                                                                                              | Subject                                                                                                                    | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                               | Depends-On       |
| ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| discussion-20260923063306456#REQ-0005                                                                               | Implement reads contracts and the Standard commands from `03_contract/`                                                    | spec-0011     | UPDATE    | MODIFY | -             | Slice C; this repository has no `03_contract/` before P7                                                                                                                                                                                                | OQ-0170          |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0010, discussion-20260923063306456#REQ-0015 | Implement writes EX tests and picks its next test from the EX IDs no test annotates; an exception is a `decisions.md` row  | spec-0011     | UPDATE    | MODIFY | -             | Slice B, lands P7 (P4 merged into cutover). Checked: 12 integration asset TCs and E2E ledger rows citing this spec's own US; no TC's Level or obligation column changes                                                                                 | OQ-0178, OQ-0170 |
| discussion-20260923063306456#REQ-0009, discussion-20260923063306456#REQ-0013                                        | Shipped rule `minimal-implementation.md`: the observation clause and the ledger and Article V chain drop TC and the ledger | spec-0011     | UPDATE    | MODIFY | -             | Slice C. The rule master is symlinked into this repository, which keeps `06_Test-Cases` until P7                                                                                                                                                        | OQ-0170          |
| discussion-20260923063306456#REQ-0013, discussion-20260923063306456#REQ-0015                                        | Remove the test-list ledger, the lifecycle status and the exception-with-DR-ID items                                       | spec-0011     | UPDATE    | REMOVE | yusuke_senaga | Slice B, lands P7 (P4 merged into cutover), with the implement rewrite and the asset tests annotating these TCs; the ledger gate itself is in spec-0004's REMOVE row                                                                                    | OQ-0178, OQ-0170 |
| discussion-20260923063306456#REQ-0001, discussion-20260923063306456#REQ-0013                                        | The scoped completion gate moves from `qfai validate --profile tdd --spec <spec-id>` to `--flow BF-NNNN`                   | spec-0011     | UPDATE    | MODIFY | -             | Slice C, lands P7 (P4 merged into cutover). Follows the user's Phase 2 grilling answer (Q2) and spec-0004's `--flow` rows. The skill gates on `--spec` today in `SKILL.md`, `references/checkpoint-verification.md` and `references/final-checklist.md` | OQ-0170          |

## 2026-09-24 — Spec-to-story restructure: what this run changed and where it lands

The record of the `/qfai-sdd` batch run 20260923100952585, whose intake is the
discussion pack `discussion-20260923063306456`. Its Triage rows are under
`## Triage (2026-09-23 spec-to-story)` above. Every decision it rests on is in
`.qfai/evidence/sdd-batch-20260923100952585.md`, and the short IDs in
parentheses below (Q2, X2, P3-C1 and so on) are that record's. No approved
change request ordered this run.

### What this run changed

Items that already existed keep their current text. Where the story tree
changes what an item says, a clause conditioned on the layout was added beside
the current one (X1). Existing test cases keep their text until their row lands
(X2).

| File                        | Added                                                                                              | Changed in place                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `01_Spec.md`                | three Scope lines (contracts and commands, shipped rule, scoped gate); four pack requirement lines | the Scope line on serial execution from the ledger |
| `02_User-stories.md`        | none                                                                                               | US-0011-0001, 0006                                 |
| `03_Acceptance-Criteria.md` | AC-0011-0012..0015                                                                                 | AC-0011-0001, 0008, 0010                           |
| `04_Business-Rules.md`      | BR-0011-0009..0013                                                                                 | BR-0011-0001                                       |
| `05_Examples.md`            | EX-0011-0010..0015                                                                                 | EX-0011-0001, 0009                                 |
| `06_Test-Cases.md`          | TC-0011-0013..0018                                                                                 | none                                               |
| `tdd/test-list.md`          | TDD-0021..0026 at `todo`                                                                           | none; no Status moved                              |
| `10_Plan.md`                | a `### Story-tree layout` subsection under each heading the change touches                         | none                                               |

### How it lands

Delivery is three pull requests (user answers P3-C1, P3-C2 and P3-C3). The
first carries P1 alone and the third removes a guard exception; neither touches
this spec. Every row of this spec lands at P7, the cutover step that also
carries the skill rewrites, in the second pull request. That pull request also
runs `/qfai-atdd` and `/qfai-implement` and carries their tests.

The change is text only: the `qfai-implement` skill and the shipped rule
`packages/qfai/assets/init/root/.agents/rules/minimal-implementation.md`. No
source module changes.

Nothing is tombstoned, marked or deleted now (X3). Each row retires its items in
the change that lands it.

| Triage row                                                                             | Operation     | Lands | Items                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Implement reads contracts and the Standard commands from `03_contract/`                | UPDATE:MODIFY | P7    | AC-0011-0010, 0012; BR-0011-0009; EX-0011-0009, 0010; TC-0011-0013; TDD-0021                                                                     |
| Implement writes EX tests and picks the next one; an exception is a `decisions.md` row | UPDATE:MODIFY | P7    | US-0011-0001; AC-0011-0001, 0008, 0013; BR-0011-0001, 0010, 0014; EX-0011-0001, 0011, 0012, 0016; TC-0011-0014, 0015, 0019; TDD-0022, 0023, 0027 |
| Shipped rule `minimal-implementation.md` drops TC and the ledger                       | UPDATE:MODIFY | P7    | AC-0011-0014; BR-0011-0011, 0012; EX-0011-0013, 0014; TC-0011-0016, 0017; TDD-0024, 0025                                                         |
| Remove the test-list ledger, the lifecycle status and the exception-with-DR-ID items   | UPDATE:REMOVE | P7    | see below                                                                                                                                        |
| The scoped completion gate moves to `--flow BF-NNNN`                                   | UPDATE:MODIFY | P7    | US-0011-0006; AC-0011-0015; BR-0011-0013; EX-0011-0015; TC-0011-0018; TDD-0026                                                                   |

At landing, in the same P7 change:

- Each item that carries a layout-conditioned clause drops its spec-pack clause.
  The list of those items is kept with OQ-0170.
- The existing test cases that cite a changed criterion or example take the
  target text: TC-0011-0001, 0003, 0006, 0008 and 0012. Their ledger rows then
  follow the upstream-reset rule.
- The shipped rule is committed after the P7 commit that migrates this
  repository, and with or after spec-0001's Article V rewrite. The rule master is
  linked into this repository, so it governs this repository's own agents as
  soon as it lands.

### What the REMOVE row retires

The skill text describing the execution ledger, its lifecycle status and the
exception-with-DR-ID items goes at P7. The ledger gate itself leaves with
spec-0004's REMOVE row. The row retires:

- `01_Spec.md`: the Scope lines on the strict lifecycle, the `exception` status
  with a mandatory DR-ID and the backward-transition prohibition; REQ-0003,
  REQ-0004 and REQ-0005
- US-0011-0002 and US-0011-0004, with their catalog lines
- AC-0011-0002 and AC-0011-0004
- BR-0011-0002
- EX-0011-0002 and EX-0011-0003
- TC-0011-0002 and TC-0011-0004
- ledger rows to tombstone: TDD-0002 and TDD-0004, which carry those test
  cases, and TDD-0014 and TDD-0016, the E2E rows of US-0011-0002 and
  US-0011-0004

One reference would dangle once those items go, and is repaired in the same
change (G5-5): EX-0011-0001 cites BR-0011-0002 and BR-0011-0003, and keeps only
BR-0011-0003.

NFR-0002 is rewritten at landing, not retired: retiring it needs an approved
REMOVE row, and the REMOVE row above does not name it (review ruling D8c).

- Current: "Forward-only lifecycle -- backward transitions prohibited (e.g.,
  green -> red)".
- Target, on the story tree: "no ledger status moves backwards".
  `01_Spec.md` states this target beside the current clause, conditioned on
  the story-tree layout; the P7 landing drops the current clause.

### Co-changes the landing carries

- The tests that pin today's wording change in the P7 commit that changes the
  text they read: `tests/integration/agentsRulesSurface.test.ts` and
  `tests/assets/prototypingScopeFloorHome.test.ts` for the rule,
  `tests/assets/implementCheckpointVerification.test.ts` and
  `tests/assets/perSpecGateScope.test.ts` for the gate, and
  `tests/integration/implementSkillSpec0011.test.ts`.
- The asset tests annotating TC-0011-0002 and TC-0011-0004 are removed or
  re-annotated with the REMOVE row.
- The P6 rename commit repoints the ledger's `Owning module` cells that name
  `skills/` paths.

### Recorded drift

Found while drafting and recorded rather than fixed, because no row of this run
covers it (X11):

- Scope Out reads "Parallel execution across multiple specs simultaneously".
  No row changes it; the prose is rewritten at landing (P2C-O8).
- EX-0011-0003 tests AC-0011-0004 but cites BR-0011-0002, and no rule cites
  AC-0011-0004. All three retire with the REMOVE row, so no repair is owed.
- Settled in Phase 2c: BR-0011-0009's first bullet has no layout condition. It
  names `<paths.contractsDir>`, which holds on both layouts, so it stays as
  written (P2C-18).

### Adoption and rejection

Adopted:

- The next test is the lowest EX ID no test annotates. An EX that a
  `Test exception:` row at DONE names is skipped (OQ-0178).
- The skill reads its candidates from validate's findings rather than stating
  the predicate a second time: `/qfai-implement` takes the lowest EX ID among
  the test-obligation EX findings in `validate.flow-<ids>.json`, written by
  `qfai validate --profile tdd --flow BF-NNNN`, and reads that file whatever
  the exit code. Adjudicated by the delivery-planner griller (review ruling
  D6); one statement of the obligation gives a deterministic order. The
  rejected alternative is below.
- Review ruling D17 bounds that read: the result must exist, have a `generatedAt`
  no earlier than the validate run and carry `profile: tdd`. BR-0011-0014,
  EX-0011-0016, TC-0011-0019 and TDD-0027 cover the fail-closed path.
- The Test, Lint, Typecheck and Build commands come from the Standard commands
  section of `<paths.contractsDir>/tech.md` and from no other file.
- The shipped rule restates the constitution's Article V chain instead of
  spelling its own (G5-8).

Rejected:

- Ledger-driven selection on the story tree.
  - DO NOT: read or write `tdd/test-list.md` on the story tree.
  - Temptation: the skill text already describes the ledger. The user-approved
    REMOVE row retires it.
- The skill restating the "unannotated and not exempted" predicate.
  - DO NOT: copy the predicate into `SKILL.md`.
  - Temptation: a self-contained skill reads more easily. Two statements of one
    predicate drift, and the skill would select an EX that validate lists as
    exempted.
- A command that prints the next test.
  - DO NOT: add one.
  - Temptation: it looks convenient. Nothing asked for it, and validate's
    findings already answer the question.
- Pinning the `QFAI-ATDD-111` and `QFAI-ATDD-112` errors that the new `todo`
  cases raise in the dogfood lanes.
  - DO NOT: add a dogfood pin for them.
  - Temptation: a pin turns the lanes green at once. Pull request 2 carries the
    ATDD and implementation tests, which clear the errors (P3-C1).

## Triage (2026-09-24 P7 handoff reconciliation)

| Source              | Subject                                | Existing Spec | Operation | Sub-op | Approved By                 | Rationale                                                                                                                                                                                                                                                                   | Depends-On |
| ------------------- | -------------------------------------- | ------------- | --------- | ------ | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| P7 migration review | Exactly-four-fields prototype handoff  | spec-0011     | UPDATE    | REMOVE | Existing DCON-008 direction | Retire BR-0011-0007, AC-0011-0009, EX-0011-0008, TC-0011-0011, and TDD-0011. The later DCON-008 contract and BR-0012-0033 own the producer schema including `imageSources[]`; DR-0011-0002 records the handoff boundary. Archive the old rows and report their disposition. | P7 step 7  |
| P7 migration review | Implementation reads prototype handoff | spec-0011     | UPDATE    | MODIFY | Existing DCON-008 direction | Update the in-scope statement and US-0011-0007 to read DCON-008 without defining a second closed schema.                                                                                                                                                                    | P7 step 7  |
