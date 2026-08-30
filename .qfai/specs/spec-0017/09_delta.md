# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-08-05
- Primary: spec-0017 created under CHG-007 — Repository Toolchain (`CAP-0017`)
- Tags: toolchain, own-ci, workflows, quality-gate-scripts, test-runner-parallelism
- Summary: creates `spec-0017` for the tooling QFAI builds itself with — `.github/workflows/**`,
  `.github/actions/**`, repository-root `scripts/**`, `packages/qfai/scripts/**` as CI-lane
  citizens, and the test-runner configuration. Fifteen spec-local requirements, nine user stories,
  34 acceptance criteria, 66 business rules, 66 examples and 82 test cases. Approved as a single
  `CREATE` in `_policies/10_delta.md` § `2026-08-05 — CHG-007` (ApprovedBy: user@2026-08-05), on
  DR-0275 (the `spec-0017` / `CAP-0017` reservation revoked) and DR-0276 (`toolchain` as a fifth,
  deliberately collective slice category whose boundary is distributed-or-not).

## Triage

| Source           | Subject                                                                                                        | Existing Spec | Operation | Sub-op | Approved By     | Rationale                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001         | Own-CI per-job least privilege measured by reachability (pack REQ-0001)                                        | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` (Repository Toolchain), registered in `_policies/03_Capabilities.md` before this row. No active spec owns `.github/workflows/**`; the four pre-existing slice categories are each defined by a distributed surface, so this had no home (DR-0276)                                                                                                                            |
| REQ-0002         | Own-CI checkout credential hygiene, with full history kept job-scoped (pack REQ-0002)                          | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Same surface as REQ-0001 and inseparable from it; measured baseline is 0 of 11 checkout steps, so the rule has no partial owner elsewhere                                                                                                                                                                                                                                   |
| REQ-0003         | Own-CI action pinning with a bump owner in a durable artifact (pack REQ-0003)                                  | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The pin form is own-CI; the shipped-side trailer prohibition is `spec-0003`'s. Splitting the two would put an undistributable obligation on a distributed surface, which DR-0276 forbids                                                                                                                                                                                    |
| REQ-0004         | Own-CI single-definition setup preamble with a file-derived Node version (pack REQ-0004)                       | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The mechanism is a repository-internal composite action, which is a hard pack failure if shipped (OC-68), so it is legal only in the tree this capability owns                                                                                                                                                                                                              |
| REQ-0005         | Own-CI build-artifact reuse, measurement-gated (pack REQ-0005)                                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Its subject is the own-CI job graph and the obligation-preservation rule on the job carrying the required status context; no distributed artifact is touched                                                                                                                                                                                                                |
| REQ-0006         | Own-CI drift-proof aggregate verdict (pack REQ-0006)                                                           | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0004` owns the `pnpm ci:lint` lane inventory, not the workflow job topology the verdict is part of                                                                                                                                                                                                                                                                    |
| REQ-0007         | Own-CI change detection and change-derived lane selection (pack REQ-0007)                                      | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Pairs mandatorily with REQ-0006 in the same job graph; filing them apart would let a job be added to a gate that ignores it                                                                                                                                                                                                                                                 |
| REQ-0008         | Own-CI layer-separated test lanes inside one workflow file (pack REQ-0008)                                     | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0009` scopes adopter repository test configuration, not QFAI's own job partition, so an append there would be a scope escape                                                                                                                                                                                                                                          |
| REQ-0009         | Own-CI artifact upload hygiene (pack REQ-0009)                                                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. One step in the same workflow file every other row here edits                                                                                                                                                                                                                                                                                                               |
| REQ-0010         | Per-project runner parallelism knobs with a derived worker default (pack REQ-0010)                             | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0011`'s parallelism is agent and worktree level, explicitly not CI-worker level; `vitest.workspace.ts` was unowned by every active spec                                                                                                                                                                                                                               |
| REQ-0011         | Slice-surface alignment across projects, matrix and scripts (pack REQ-0011)                                    | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Sits inside the same runner workspace REQ-0010 rewrites; the dead project it deletes is referenced by zero spec items, so the removal cuts no downstream reference                                                                                                                                                                                                          |
| REQ-0012         | Workflow-hygiene lint lane over the own workflows tree (pack REQ-0012)                                         | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The lane's rule set and its script are toolchain; only its registration in the lane inventory cascades to `spec-0004`, which carries its own companion row                                                                                                                                                                                                                  |
| REQ-0013         | The hygiene lane also scans the shipped templates (pack REQ-0013, own-CI half)                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` owns the **lane**; `CAP-0003` owns the files it scans. The split follows DR-0276's distributed-or-not boundary and `.qfai/contracts/cli/shipped-workflows.md` §1 and §6                                                                                                                                                                                                      |
| REQ-0014         | Layer-to-CI-lane mapping in a parser-invisible catalog sibling (pack REQ-0023, own-CI half)                    | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` owns the document. `spec-0009` carries the cascade row for its per-layer tool rationale cross-reference; the vocabulary must not grow either way (NFR-0015)                                                                                                                                                                                                                  |
| REQ-0015         | Retire the repository's duplicate of the shipped validate workflow (pack REQ-0025)                             | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The file being deleted is the repository's own, not a shipped template; it is referenced by zero spec items, and its full-profile run is folded rather than dropped                                                                                                                                                                                                         |
| CR-20260820-0007 | Ratify the three decision records authored under `/qfai-implement`, and close the routing gap that forced them | spec-0017     | UPDATE    | APPEND | user@2026-08-23 | Approved option 1, mode `confirm-only`: the entries were already written by hand under approval and are adopted unchanged as this stage's output — none invents a decision, and one holds a user instruction that reverting would destroy. The ordering rule is added to both skills, so the next agent meets a routing constraint rather than a choice between three prohibited moves. |

## Rationale

- The gap CHG-007 measured is a **category** gap, not a CI gap. Against the tree, no spec owned
  `.github/workflows/ci.yml`, per-job `permissions:`, action pinning or `vitest.workspace.ts`, and
  all eleven repository-root `scripts/*.mjs` were unclaimed. Filing only the CI work would have
  left the other orphans unowned and reproduced the hole at the next toolchain change.
- Every row above is `CREATE` on one capability, not a spread of appends, because
  `_policies/10_delta.md` § CHG-007 already ran the append-first analysis and rejected both
  alternatives with recorded reasons: appending to `spec-0004` (whose surface is
  `src/core/validators/**`, disjoint from `.github/workflows/**`) and splitting across
  `spec-0004` / `spec-0009` / `spec-0011` (three scope escapes and one design fragmented across
  three packs).
- `Existing Spec` is `(none)` on every row by construction. A `CREATE` row has no pre-existing
  owner; the specs that do change are carried by their own companion rows, listed under
  `## Cascade` below.

## Size signal and reasoned non-split

- Measured on creation: **34 acceptance criteria and 82 test cases**. The estimate carried into
  authoring was 34 and roughly 68; the true test-case count is higher because the depth rule was
  applied per criterion rather than per pair — every criterion carries a `normal` row **and** an
  `error` or `boundary` row, and fourteen criteria own three distinct falsifying oracles rather
  than two. The signal is unchanged by the difference: both thresholds are breached either way.
- `_policies/11_Slice-Policy.md` § `APPEND vs CREATE 判定アルゴリズム` carries a size test of
  `acCount <= 30 && tcCount <= 50`. Both are exceeded (34 against 30, 82 against 50).
- Per `references/sdd-triage.md`, a threshold breach is a **signal, not an operation**. The signal
  triggered a capability-ownership review; the outcome is DR-0017-0001, and it is restated here so
  a future triage reading only this file cannot mistake the size for a SPLIT trigger.
- Review outcome, three reasons each sufficient on its own:
  1. **The threshold gates allocation, not existence.** The size test is a step in the
     append-versus-create algorithm that decides where a newly arriving requirement goes. It is not
     a size cap on a spec. `spec-0017` arrived through an approved `CREATE` (`user@2026-08-05`),
     not through an `APPEND`, so the threshold never gated its creation.
  2. **The SPLIT trigger's precondition is false.** The trigger is "one spec holds several
     capabilities and needs its responsibilities separated". `spec-0017` declares
     `Parent: CAP-0017` and holds exactly that one capability. There is nothing to separate.
  3. **A SPLIT has no legal end state.** `validateSpecSplitByCapability` derives its expected spec
     set **positionally** from the capability count. Splitting `spec-0017` into two directories
     would present eighteen spec directories against seventeen capabilities and raise
     `QFAI-SPLIT-104` at `error`, while the second directory would hold no capability at all.
- **Routing rule for the next requirement on `CAP-0017`: `UPDATE:APPEND`, with the size restated
  in its triage rationale — never SPLIT.** This is the shape DR-0276 licenses when it registers
  `toolchain` as a **collective** category, deliberately collective in the way the agent-surface
  spec is, rather than accidentally oversized.
- Residual, stated rather than discovered: both counts now sit above the ceiling, so the
  capability-ownership review is owed again at every future append. The reasoned non-split does not
  expire while `CAP-0017` remains one capability, but the review is not skippable. The structural
  fix is not this spec's: `OQ-0023` tracks pairing capabilities to specs by **number** rather than
  by list position, which is what would let the "leave a gap" default stop being a trap.

## Authored items

| Artifact                    | Range                               | Count |
| --------------------------- | ----------------------------------- | ----- |
| `01_Spec.md`                | REQ-0001..REQ-0015 (spec-local)     | 15    |
| `02_User-stories.md`        | US-0017-0001..US-0017-0009          | 9     |
| `03_Acceptance-Criteria.md` | AC-0017-0001..AC-0017-0034          | 34    |
| `04_Business-Rules.md`      | BR-0017-0001..BR-0017-0066          | 66    |
| `05_Examples.md`            | EX-0017-0001..EX-0017-0066          | 66    |
| `06_Test-Cases.md`          | TC-0017-0001..TC-0017-0082          | 82    |
| `07_Decisions.md`           | DR-0017-0001..DR-0017-0006          | 6     |
| `08_Open-questions.md`      | OQ-0017-0001..OQ-0017-0006          | 6     |
| `tdd/test-list.md`          | TDD-0001..TDD-0082 (`Status: todo`) | 82    |

`REQ-NNNN` is spec-local and numbered from `REQ-0001` inside this spec; each maps to its upstream
`discussion-20260804173914356#REQ-NNNN` in `01_Spec.md` § `Relevant Requirements`. Both layers
number from `REQ-0001`, and the pack half is the only thing that disambiguates them.

## Traceability shape

- `BR -> EX` is 1:1 and index-aligned: the example whose trailing number is _n_ concretizes the
  business rule whose trailing number is _n_. All 66 business rules are referenced from `BR-Ref`,
  so `QFAI-COV-202` resolves with no dangling edge.
- `EX -> TC` is surjective: every example is named by at least one row's `EX-Ref`, so
  `QFAI-COV-203` resolves. 66 examples carry 82 test cases.
- `AC -> TC` is total: all 34 acceptance criteria appear in `AC-Refs`, which is what
  `QFAI-COV-201` requires.
- The whole test-case set is **one** markdown table and it is the first table in its file.
  `collectTestCaseIds` and the TDD coverage report both read `parseFirstMarkdownTable`, so a second
  table would find no `TC-ID` column there and silently disable `TDDLIST_TC_NOT_COVERED` for the
  whole spec.
- `Level` is spelled in the lowercase word form (`unit`, `integration`) because that is what the
  layer-policy check accepts and what the sibling packs use; `tdd/test-list.md#Layer` uses the
  capitalized word form per the crosswalk in `.qfai/assistant/catalog/test-layers.md`.

## Candidates Considered

1. Author the test-design side with one test case per acceptance criterion, and rely on the
   criterion's own gherkin to carry the negative direction.
2. Author two test cases per acceptance criterion, one `normal` and one `error` or `boundary`,
   and let an example ride along on a sibling row's `EX-Ref` where the count did not divide evenly.
3. Author one falsifying oracle per test case, so a criterion owning three distinct oracles gets
   three rows and every example gets a row whose oracle actually verifies it.

## Adopted

- Adopted: candidate 3 — one falsifying oracle per test case.
- Why: candidate 1 reproduces the recorded happy-path shortfall in the existing packs, which is
  exactly what this pack was asked not to inherit. Candidate 2 keeps the count tidy but forces a
  multi-valued `EX-Ref` whose row has one oracle and two examples, which is the shape
  `.qfai/assistant/catalog/test-layers.md` § `Obligation spanning more than one layer` tells an
  author to split rather than to merge. Candidate 3 costs fourteen extra rows and buys a set where
  every `EX-Ref` names an example the row's own assertion falsifies.
- Evidence: `06_Test-Cases.md` § `Coverage summary` — 37 `normal`, 17 `error`, 28 `boundary`
  across 34 criteria, with no criterion covered by happy paths alone.

## Rejected

- Candidate: splitting the test-case set across two markdown tables to keep either table short.
- Reason: `collectTestCaseIds` and the TDD coverage report both read only the **first** table, so
  a second table silently disables `TDDLIST_TC_NOT_COVERED` for the whole spec. The rows would look
  present and be invisible.
- DO NOT: split `06_Test-Cases.md` into two tables, and do not place any table above the
  `## Test Case Table` section.
- Temptation: an 82-row table is long, and grouping it by user story reads better on screen.

- Candidate: recording the size breach as a SPLIT candidate for a later triage to resolve.
- Reason: a count-driven SPLIT of a single-capability spec has no legal end state; the positional
  1:1 capability gate raises `QFAI-SPLIT-104` at `error` for any arrangement of it.
- DO NOT: propose SPLIT for `spec-0017` on a count. Route the next requirement on `CAP-0017` to
  `UPDATE:APPEND` and restate the size in its rationale.
- Temptation: the breach fires at every triage, and "flag it for later" looks cheaper than
  re-reading DR-0017-0001 each time.

- Candidate: writing test cases for the two partly observable obligations as if a gate existed —
  a machine check over an action-bump configuration, and a build-reuse assertion against a
  baseline number.
- Reason: no agent may create a bump configuration at the repository root without the user (OC-3),
  and the reuse baseline has not been captured yet (NFR-0001). Both would be oracles that cannot
  run, which converts a partial requirement into an unsatisfiable one.
- DO NOT: invent an oracle for the bump-owner half or for the reuse comparison, and do not drop
  either requirement to avoid the awkwardness.
- Temptation: a row that cannot fail looks like coverage, and an empty cell looks like a gap worth
  filling with anything.

## Impact

- Affects: this spec's `05_Examples.md`, `06_Test-Cases.md`, `08_Open-questions.md`,
  `09_delta.md` and `tdd/test-list.md`. No file outside `.qfai/specs/spec-0017/` is edited by this
  delta.
- Implementation surfaces the test cases will bind to are enumerated in `10_Plan.md` §
  `Files this spec owns` and in `16_Traceability-ledger.md` § `Planned bindings`; every path there
  carries a `State today` value checked against the tree, and a binding is promoted into the
  validator-read table only in the change that creates its file (DR-0017-0006).
- Validation: `npx qfai validate --profile sdd --fail-on error` reports no `QFAI-COV-201`,
  `QFAI-COV-202`, `QFAI-COV-203`, `QFAI-COV-204`, `QFAI-COV-205` or `QFAI-COV-206` for this spec,
  and `E_SPEC_MISSING_FILESET` is cleared. `QFAI-ATDD-111` and `QFAI-ATDD-112` still report this
  spec's obligations as uncovered, which is correct: no test annotation exists yet, and writing one
  before the test is an `/qfai-implement` obligation, not a spec-authoring one.

## Cascade

Companion rows live in the named spec's own delta; none of them is authored here.

- `spec-0003` — the shipped workflow set this spec's hygiene lane scans, its hardening, pin policy
  and the shipped-set structural contract gate. Two of DR-0017-0005's five merge-order edges cross
  into it, so this spec cannot be completed independently of it.
- `spec-0004` — the `pnpm ci:lint` lane inventory gains the workflow-hygiene lane. This spec
  contributes one lane; it does not own the inventory.
- `spec-0006` — adopter drift detection for installed shipped workflows (upstream REQ-0022).
- `spec-0008` — the worker-scoped credential-reuse rule as ATDD guidance (upstream REQ-0024).
- `spec-0009` — a cross-reference from the per-layer tool rationale to the layer-to-CI-lane map.
- `spec-0012` — the shipped workflow's recorded shape becomes stale as it is hardened.
- `spec-0015` — reviewer-gate ingestion of `R-WORKFLOW-HYGIENE-DRIFT` and
  `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`. Neither code is introduced here; both are declared in
  `.qfai/contracts/cli/shipped-workflows.md` §5 and §6. This pack cites their namespace and
  emission shape, and repeats the catalog status only as a pointer to its owner — `BR-0017-0040`
  and `EX-0017-0040` state that membership is a severity-class question owned by `CLI-WFSET` §6 and
  deferred under `spec-0015` `OQ-0015-0001`; both items are listed in that open question's lockstep set, so they move with the registration change. Rounds 3 and 4 found the earlier
  wording restating that status contrary to §6, which is why the distinction is spelled out here
  rather than left to "cited, never restated".

## Follow-ups

- **Build-artifact reuse itself is still open.** `CR-20260823-0004` option 3 rewrote
  `TC-0017-0032` to assert `BR-0017-0029` as the conditional it is written as, which is what
  makes the case true today. That is a correction to the case, not a completion of the work: no leg
  downloads the build, no baseline has been captured, and neither accepting branch of
  `DR-0017-0002` has been taken. The rule now guards the adoption; adopting it is still to do.
- Owner: QFAI maintainers
- Due: 2026-10-31

- Capture the wall-clock and runner-minute baselines before plan steps 6, 7 and 8, and quote them
  in the pull-request description and in `07_Decisions.md` — the evidence tree is ignored by git,
  so a number that lives only there is unreviewable (OQ-0017-0005, BR-0017-0030).
- Owner: QFAI maintainers
- Due: 2026-10-31

- ~~Decide where this spec's tests must live for a `TC-0017-*` annotation to be visible to the ATDD
  traceability scan.~~ **Closed at review round 8 — the premise was false.** `paths.testsDir` resolves
  to a repository-root `tests/` that does exist and is tracked, holding two markdown annotation ledgers
  with 200 and 486 `QFAI:` annotations; the scanner's default glob includes markdown, and spec-0001
  clears both ATDD gates from that directory today. The remaining `QFAI-ATDD-111` / `112` findings are
  ordinary later-stage annotation work dischargeable from those ledgers. `OQ-0017-0006` is `resolved`;
  no owner and no due date remain, and no user decision is outstanding.
