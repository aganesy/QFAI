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

- Change ID: DELTA-0002
- Date: 2026-09-25
- Primary: re-derive the approved local release command and traceability obligations
- Tags: release-gates, traceability, sdd
- Summary: separates the unchanged local command vector from release capability, records its active proof bindings, and reconciles the execution row without adding a new requirement.

## Triage

| Source           | Subject                                                                                                        | Existing Spec | Operation | Sub-op | Approved By     | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001         | Own-CI per-job least privilege measured by reachability (pack REQ-0001)                                        | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` (Repository Toolchain), registered in `_policies/03_Capabilities.md` before this row. No active spec owns `.github/workflows/**`; the four pre-existing slice categories are each defined by a distributed surface, so this had no home (DR-0276)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| REQ-0002         | Own-CI checkout credential hygiene, with full history kept job-scoped (pack REQ-0002)                          | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Same surface as REQ-0001 and inseparable from it; measured baseline is 0 of 11 checkout steps, so the rule has no partial owner elsewhere                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| REQ-0003         | Own-CI action pinning with a bump owner in a durable artifact (pack REQ-0003)                                  | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The pin form is own-CI; the shipped-side trailer prohibition is `spec-0003`'s. Splitting the two would put an undistributable obligation on a distributed surface, which DR-0276 forbids                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| REQ-0004         | Own-CI single-definition setup preamble with a file-derived Node version (pack REQ-0004)                       | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The mechanism is a repository-internal composite action, which is a hard pack failure if shipped (OC-68), so it is legal only in the tree this capability owns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| REQ-0005         | Own-CI build-artifact reuse, measurement-gated (pack REQ-0005)                                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Its subject is the own-CI job graph and the obligation-preservation rule on the job carrying the required status context; no distributed artifact is touched                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| REQ-0006         | Own-CI drift-proof aggregate verdict (pack REQ-0006)                                                           | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0004` owns the `pnpm ci:lint` lane inventory, not the workflow job topology the verdict is part of                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| REQ-0007         | Own-CI change detection and change-derived lane selection (pack REQ-0007)                                      | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Pairs mandatorily with REQ-0006 in the same job graph; filing them apart would let a job be added to a gate that ignores it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| REQ-0008         | Own-CI layer-separated test lanes inside one workflow file (pack REQ-0008)                                     | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0009` scopes adopter repository test configuration, not QFAI's own job partition, so an append there would be a scope escape                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| REQ-0009         | Own-CI artifact upload hygiene (pack REQ-0009)                                                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. One step in the same workflow file every other row here edits                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| REQ-0010         | Per-project runner parallelism knobs with a derived worker default (pack REQ-0010)                             | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. `spec-0011`'s parallelism is agent and worktree level, explicitly not CI-worker level; `vitest.workspace.ts` was unowned by every active spec                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| REQ-0011         | Slice-surface alignment across projects, matrix and scripts (pack REQ-0011)                                    | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. Sits inside the same runner workspace REQ-0010 rewrites; the dead project it deletes is referenced by zero spec items, so the removal cuts no downstream reference                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| REQ-0012         | Workflow-hygiene lint lane over the own workflows tree (pack REQ-0012)                                         | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The lane's rule set and its script are toolchain; only its registration in the lane inventory cascades to `spec-0004`, which carries its own companion row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| REQ-0013         | The hygiene lane also scans the shipped templates (pack REQ-0013, own-CI half)                                 | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` owns the **lane**; `CAP-0003` owns the files it scans. The split follows DR-0276's distributed-or-not boundary and `.qfai/contracts/cli/shipped-workflows.md` §1 and §6                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| REQ-0014         | Layer-to-CI-lane mapping in a parser-invisible catalog sibling (pack REQ-0023, own-CI half)                    | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017` owns the document. `spec-0009` carries the cascade row for its per-layer tool rationale cross-reference; the vocabulary must not grow either way (NFR-0015)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| REQ-0015         | Retire the repository's duplicate of the shipped validate workflow (pack REQ-0025)                             | (none)        | CREATE    | -      | user@2026-08-05 | `CAP-0017`. The file being deleted is the repository's own, not a shipped template; it is referenced by zero spec items, and its full-profile run is folded rather than dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| CR-20260820-0007 | Ratify the three decision records authored under `/qfai-implement`, and close the routing gap that forced them | spec-0017     | UPDATE    | APPEND | user@2026-08-23 | Approved option 1, mode `confirm-only`: the entries were already written by hand under approval and are adopted unchanged as this stage's output — none invents a decision, and one holds a user instruction that reverting would destroy. The ordering rule is added to both skills, so the next agent meets a routing constraint rather than a choice between three prohibited moves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| REQ-0008         | The engines-floor lane is sliced, and its before-and-after numbers are recorded                                | spec-0017     | UPDATE    | APPEND | -               | `BR-0017-0030` requires the numbers in three places, because the evidence tree is ignored by git. `DR-0017-0011` carries them and `.qfai/evidence/timing-node-floor-spec-0017.md` holds the per-job tables. Its own artifact rather than a section of the worker-setting one: different rule, different subject, and `TC-0017-0065` re-does that file's arithmetic.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| REQ-0011         | Slice-surface alignment widened from one sliced CI job to every job that expands over the slice set            | spec-0017     | UPDATE    | MODIFY | -               | The invariant is that every sliced lane names the same slice set, so a second sliced lane is one more surface rather than an exception. `AC-0017-0027`, `BR-0017-0056`, `BR-0017-0057`, `EX-0017-0056`, `EX-0017-0057`, `TC-0017-0062` and `TC-0017-0064` are reworded together. No identifier is renumbered, and no item is added or removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| REQ-0008         | The lint gate runs five lanes, and its before-and-after numbers are recorded                                   | spec-0017     | UPDATE    | APPEND | -               | `DR-0017-0011` named `lint` as the lane that sets the run's wall clock, so this lane was chosen by a measurement rather than picked. `BR-0017-0030` requires the numbers in three places, because the evidence tree is ignored by git. `DR-0017-0012` carries them and `.qfai/evidence/timing-lint-concurrency-spec-0017.md` holds the tables. One artifact for both rows below and not two: the lint gate's "after" figures already contain the concurrency change, because the shortened file runs in the mirror lane the other four lanes contend with. Not an extension of the worker-setting artifact either — `TC-0017-0065` reads that file's rows as worker settings, and the concurrency sweep has the same shape.                                                                                                                                                                                                                                                                                                                              |
| REQ-0010         | The within-file concurrency axis is capped to the machine's cores, on a sweep of its own                       | spec-0017     | UPDATE    | APPEND | -               | `DR-0017-0010` capped the worker axis and left this one open for want of a measurement; that statement is corrected in place rather than left standing beside its replacement. `DR-0017-0013` carries the sweep, the reason the adopted value is not the fastest on a large machine (`BR-0017-0051`), and the guard fix that makes the cap safe to declare.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| REQ-0011         | The aligned slice set gains a runner for each test file that spawns a process per case                         | spec-0017     | UPDATE    | MODIFY | -               | The two files sit in one project, take every core the runner has, and together set the wall clock of three jobs; measured per file, making the second concurrent left it no faster and slowed the first. A runner each is what stops them competing, and it moves the aligned set off seven. The count is restated, not dropped: it is the only claim that catches a shrink every surface agreed to, which claim 1's equality cannot see.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| REQ-0007         | The documentation-only path is pinned and re-pinned rather than held to a count of four job names              | spec-0017     | UPDATE    | MODIFY | -               | `NFR-0002` states what the ceiling serves — consumption falls from a baseline of fourteen job instances — and the four names were a value derived from the tree as it then stood. A lane measured at 250.1 s under contention and 111.7 s on a runner of its own needs that runner and must stay unconditional, so the set equality refuses a change the requirement permits. `AC-0017-0003`, `BR-0017-0007`, `EX-0017-0007` and `TC-0017-0006` are reworded together. The measure is restated, not dropped: without one, nothing stops every job becoming unconditional. No identifier is renumbered, and no identifier this row names is added or removed; the items the restatement needs are appended under the row below.                                                                                                                                                                                                                                                                                                                           |
| REQ-0007         | The refusing side of the restated measure                                                                      | spec-0017     | UPDATE    | APPEND | -               | The restated measure's refusing side has nothing behind it, and that is a consequence of this change rather than an addition to it. The Plan this cycle finalized asks for a case where the committed pin agrees with the recomputed value and a case where it disagrees, and a mutation listed in a passing row's oracle is not a case. The negative reaches the chain through the rule rather than through a criterion of its own, because this pack's granularity convention puts a planted-violation form in the rule it falsifies. So the items appended are two test cases, each citing an example a rule already has: this pack states one example per rule and gives the reason — its granularity convention folds a planted-violation form into the rule it falsifies, so a second example would split an oracle the rule keeps together. The second case covers the pair the lane-scope rule forbids, without which that rule's new sentence has no oracle. Appending is the operation because the subject is unchanged and the items are new. |
| REQ-0007         | The selection exemption is scoped to the lane rather than to the job that hosts it                             | spec-0017     | UPDATE    | MODIFY | -               | `BR-0017-0011` named one lane and enumerated four guards, while that lane also carries the agent-integration mirror guards, so the rule held of the tree by co-location rather than by statement. The pin rule does not close the gap: it requires the executing set to match the declaration, which a lane given a job of its own, a condition and a `dependencyConditions` entry satisfies with the guard skipped. The rule is restated over every lane of the lint aggregate, whichever job hosts it, and forbids that pair. `AC-0017-0006`, `EX-0017-0011` and `TC-0017-0012` are reworded together. No identifier is added or removed by this row.                                                                                                                                                                                                                                                                                                                                                                                                  |
| REQ-0008         | The mirror-surface lane gets a runner of its own, and its before-and-after numbers are recorded                | spec-0017     | UPDATE    | APPEND | -               | `DR-0017-0012` measured the five-lane lint gate locally and left one thing open in its own Consequences: the CI figure "must be read off the pull-request run rather than inferred". Read: `lint` is the longest job of a code-path run at 265 s, of which the gate step is 243 s, and the lane that sets it is `lint:mirror-surface`. `BR-0017-0030` requires the numbers in three places, because the evidence tree is ignored by git. `DR-0017-0017` carries them. No separate timing artifact: the measurement is two CI runs rather than a sweep, so there are no per-run tables to hold, and the record says so rather than implying a distribution it does not have. Appending is the operation because the subject is unchanged and the item is new. No identifier is renumbered, and none is removed.                                                                                                                                                                                                                                           |
| REQ-0008         | The code path leaves the falling claim, and what it costs is pinned instead                                    | spec-0017     | UPDATE    | MODIFY | -               | `NFR-0002` capped a code path at 12 job instances / 8 installs / 3-or-5 builds against a baseline of 14 / 13 / 6, and the tree runs 26 / 24 / 5. Nothing regressed: both matrices were widened to nine legs to shorten the wall clock, and nine legs finishing together cost fewer runner minutes than one leg running them in series while counting more instances — so an instance figure on a code path moves against the very thing this requirement is named for. The clause therefore keeps the documentation-only claim, where consumption does fall, and hands the code path to `NFR-0001`, whose subject is the wall clock the widening buys. `DR-0017-0018` records the decision and the figures. The units stay instances, installs and builds, which `DR-0017-0015` settled and this row does not reopen. `REQ-0015`'s ordinal is anchored to the baseline in the same edit, because the workflow it counts is gone and the present tense read as a claim about the tree as it stands. No identifier is renumbered or removed by this row.   |
| REQ-0008         | The code-path figures gain a pin, a pinner and a rule that reads it                                            | spec-0017     | UPDATE    | APPEND | -               | Removing the ceiling leaves the cost recorded by nothing, and the measurement showed that it already was: no test anywhere asserted the code-path instance, install or build count, which is how the figure went stale in silence. The items appended are one business rule, one example and two test cases — the accepting side over the real tree and the refusing side over planted ones. `BR-0017-0030`'s numbers are not owed here, because the rule states a re-pin obligation rather than a cost claim, which is the distinction `DR-0017-0015` drew for the sibling path. Appending is the operation because the subject is unchanged and the items are new.                                                                                                                                                                                                                                                                                                                                                                                     |
| CR-20260924-0001 | Current matrix-leg selection permits approved retirement of an owned suite                                     | spec-0017     | UPDATE    | MODIFY | user@2026-09-24 | REQ-0007, AC-0017-0003, BR-0017-0006, EX-0017-0006 and TC-0017-0007 apply skip behavior to retained legs and allow an approved suite retirement to remove its leg and update check-name pins. No item ID is removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CR-20260924-0001 | The aligned slice set has seven names after both repository skills retire                                      | spec-0017     | UPDATE    | MODIFY | user@2026-09-24 | REQ-0011, AC-0017-0027, BR-0017-0056/0057, EX-0017-0056/0057 and TC-0017-0062/0064 require seven matching names across the runner, scripts, both CI matrices, both release matrices and release verify SUITE_SLICES. No item ID is removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| CR-20260924-0001 | Older nine-slice tags keep the complete whole-suite release path                                               | spec-0017     | UPDATE    | MODIFY | user@2026-09-24 | AC-0017-0036, BR-0017-0069, EX-0017-0070 and TC-0017-0090/0091 require exact slice-set equality before selecting operations. A nine-slice tag containing the current seven is not a current sliced tag. No item ID is removed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| CR-20260924-0002 | Name the six CI acceptance cases by independently observable result                                            | spec-0017     | UPDATE    | MODIFY | user@2026-09-24 | TC-0017-0007/0043/0062/0064/0090/0091 retain their IDs and expose 15 named result boundaries. The failed-operation publication refusal remains with TC-0017-0089, so no second row duplicates it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| CR-20260924-0002 | Seed one execution row per newly named boundary                                                                | spec-0017     | UPDATE    | APPEND | user@2026-09-24 | Keep TDD-0007/0043/0062/0064/0099/0100 for their first boundaries; append TDD-0102 through TDD-0110 at todo with distinct Boundary slugs. Every changed row requires fresh formal evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| CR-20260924-0004 | Separate the unchanged local release command vector from workflow capability                                   | spec-0017     | UPDATE    | MODIFY | user@2026-09-25 | AC-0017-0036 keeps both release and local command obligations. BR-0017-0069 and EX-0017-0070 retain capability, fallback and isolation. TC-0017-0090 retains classification and runtime outcomes. BR-0017-0070, EX-0017-0071 and TC-0017-0093 own the local ordered vector. TDD-0107 keeps its ID and selector under TC-0017-0093; a new live mutation round rechecks its evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| CR-20260924-0004 | Reconcile active traceability against actual implementation bindings                                           | spec-0017     | UPDATE    | MODIFY | user@2026-09-25 | Promote all current bindings for changed AC-0017-0003/0027/0036 and BR-0017-0006/0056/0057/0069/0070. AC-0017-0036 and BR-0017-0070 both bind to unchanged package.json with TDD-0107 proof. Planned rows keep only unpromoted obligations.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |

### DELTA-0002 (2026-09-25)

- 0 new REQ/NFR rows. The approved change request re-derives the two UPDATE/MODIFY rows already recorded in the Triage table above; it adds no incoming requirement.

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

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

D4 named seven specs for Change Requests, and this spec is not one of them. The user added it on 2026-09-24 by answering `OQ-0012` with A: a `windows-latest` job limited to the control-core and init and migration suites.

| Source   | Subject                                                                      | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                           | Depends-On |
| -------- | ---------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| NFR-0011 | A `windows-latest` CI job for the control-core and init and migration suites | spec-0017     | UPDATE    | APPEND | -           | spec-0017 owns the job topology of `.github/workflows/**`, and the job needs a `SHIPPED-CI:` disposition. Size signal: AC 36 and TC 92 are over both thresholds. spec-0017 owns only CAP-0017, so there is no split | REQ-0033   |

## 2026-09-24 — Intent-driven entry: change summary

- Change ID: DELTA-0002
- Date: 2026-09-24
- Primary: Ops
- Tags: @test
- Summary: the one row of `## Triage (2026-09-24 intent-driven entry)` applied. A
  `windows-parity` job on `windows-latest` runs the control-core suites and the init and
  migration suites through the `test:windows-parity` script, is selected like the other test
  lanes, and joins the aggregate verdict.
- Appended: US-0017-0016; AC-0017-0037..0039; BR-0017-0071..0073; DR-0017-0024. Modified:
  none. `US-0017-0010..0015` are skipped because `spec-0012/09_delta.md` cites them for a retired
  spec that once held this number.
- Resolved pack question: `discussion-20260923171450572#OQ-0012` (how Windows parity is
  verified), answered A by the user on 2026-09-24 and recorded in DR-0017-0024. OQ-0017-0002 is
  unchanged; the job's merge gating waits on it.
- `SHIPPED-CI:` disposition: `not-applicable`, on the lines the change adds at the new job in
  `.github/workflows/ci.yml`. The shipped test lanes run the adopter's own scripts on the runner
  the adopter names, so the shipped set has no QFAI suite or fixed platform to add. The
  `test:windows-parity` script is in `packages/qfai/package.json`, which the parity guard does not
  watch, so `.github/shipped-ci-dispositions.md` gets no entry.
- Known finding, by the user's decision: once committed, this change to `03` and `04` makes
  `QFAI-TRACE-001` report the three first-table rows of `16_Traceability-ledger.md` whose files
  it does not touch (`.github/workflows/release.yml` twice and the root `package.json`) under
  `tdd` and `full`. The user chose on 2026-09-24 to record them as known and proceed; narrowing
  the check to rows whose BR or AC changed is a follow-up.
- Size: AC 36 → 39 and TC 92 → about 99, both over the thresholds before this change. One
  capability (CAP-0017), so no split (DR-0017-0001).

## Decision Log

One entry per `07_Decisions.md` record added on 2026-09-24.

### DL-0001

DR-0017-0024: a `windows-latest` job runs the control-core and init suites, and gates no merge
yet.

#### Meta

```yaml
id: DL-0001
date: 2026-09-24
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - .github/workflows/ci.yml
  - .github/required-status-contexts.json
  - packages/qfai/package.json
notes: The user's answer A to the pack's question on Windows verification; the job is not merge-gating until the required context moves
```

#### Migration / Follow-ups

- No migration required. The code-path cost pin is re-pinned by the change that adds the job,
  with the trial run's numbers appended to DR-0017-0024.

#### Rejected

- option: a recorded manual Windows run before each release
  reason: a regression then ships from the pull request that caused it
  do_not: rely on a manual run to find a Windows regression
  temptation: it costs no runner minutes
- option: make the job named build depend on the Windows job
  reason: build would be skipped whenever detection skips the job, and a skipped job reports success
  do_not: put a conditional job under the required-context job
  temptation: it would gate merges today

## 2026-09-24 — Retire two repository skills

- Change Request: CR-20260924-0001, approved by the user.
- Decision: keep seven current test slices across the runner, scripts, both CI matrices, both release matrices and release verify's `SUITE_SLICES`. Remove the pr-fix and pr-merge slices from each surface with their suites.
- Selection: skip an unneeded retained leg; remove a retired leg from every slice surface and the check-name inventory.
- Release: choose the sliced operations path only on exact tag-manifest equality with the current slice set. An older nine-slice tag runs the complete whole-suite aggregate.
- Rejected: keeping empty slices would violate the requirement that every declared project match tests. Keeping the skills would retain the behavior the user removed.
- Ledger reset to todo under CR-20260924-0001: spec-0017/TDD-0007, spec-0017/TDD-0043, spec-0017/TDD-0062, spec-0017/TDD-0064, spec-0017/TDD-0099 and spec-0017/TDD-0100. Earlier evidence remains historical, without credit toward the revised obligations.
- Downstream artifacts: packages/qfai/vitest.workspace.ts, packages/qfai/package.json, .github/workflows/ci.yml, .github/workflows/release.yml, .github/required-status-contexts.json, packages/qfai/tests/scripts/ownWorkflowTopology.test.ts and packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts. The alignment test reads all four job matrices and `SUITE_SLICES`.
- Targeted verification: the revised slice and release tests pass, and a distinct mutation makes each of the six changed obligations fail. The older tag's exact-set test rejects the former subset classifier. Commands and outcomes are recorded in `.qfai/evidence/atdd-spec-0017.md#retired-slice-verification`.
- Ledger state: all six reset rows remain `todo`. Targeted GREEN and mutation runs do not provide the row-by-row implementation cycle, test hashes and reviewer packs needed to advance them.

## 2026-09-24 — Split CI acceptance boundaries

- Change Request: CR-20260924-0002, approved by the user.
- Six existing test cases retain their IDs and name 15 independently observable boundaries. TDD-0007, TDD-0043, TDD-0062, TDD-0064, TDD-0099 and TDD-0100 retain the first boundary of each case. TDD-0102 through TDD-0110 hold the remaining boundaries.
- The required-operation failure state is already tested by TC-0017-0089 and TDD-0098. TC-0017-0091 adds no duplicate execution row for it.
- The six parked rows resume at todo with CR-20260924-0002; existing targeted runs and old completion evidence remain historical. The nine new rows also start at todo. Each row needs a distinct ATDD selector and fresh formal implementation evidence.
- Contracts: none; this change refines test-case and ledger granularity within existing acceptance criteria and business rules.

## 2026-09-25 — Scope traceability to changed obligations

- Change Request: CR-20260924-0004, option 3 approved by the user.
- BR-0017-0070, EX-0017-0071 and TC-0017-0093 name the unchanged local command vector. BR-0017-0069 remains the release workflow capability, fallback and isolation rule.
- TDD-0107 keeps its identifier and selector and now cites TC-0017-0093 and BR-0017-0070. Its prior ATDD evidence remains historical; a new Round 2 live mutation and independent QA were recorded for current proof. TDD-0099/0100/0101/0107/0108/0109/0110 remain todo under this CR pending the required rerun and checkpoint.
- The active ledger records all current implementation bindings for the changed acceptance criteria and business rules. Its two unchanged package.json bindings cite TDD-0107 proof. Planned rows retain unpromoted obligations only.
- The shipped traceability contract and validator are updated together. An unavailable diff, missing or ambiguous binding, or failed proof rejects validation.

## Change Requests

| CR ID            | Upstream artifact                            | Mode      | Approved by     | Applied at           |
| ---------------- | -------------------------------------------- | --------- | --------------- | -------------------- |
| CR-20260924-0001 | `.qfai/specs/spec-0017/04_Business-Rules.md` | re-derive | user@2026-09-24 | 2026-09-24T07:20:10Z |
| CR-20260924-0002 | `.qfai/specs/spec-0017/06_Test-Cases.md`     | re-derive | user            | 2026-09-24T09:58:00Z |
| CR-20260924-0004 | `.qfai/specs/spec-0017/04_Business-Rules.md` | re-derive | user            | -                    |

## Merge reconciliation (2026-09-25)

Bringing `origin/main` into the intent-driven work found IDs that both lines of work had
assigned to different items. `origin/main` had already published its IDs, so the
intent-driven IDs moved to the next free ones. Meaning is unchanged, and no Change
Request applies.

- `BR-0017-0070`..`BR-0017-0073` became `BR-0017-0071`..`BR-0017-0074`.
- `EX-0017-0071`..`EX-0017-0074` became `EX-0017-0072`..`EX-0017-0075`.
- `TC-0017-0093`..`TC-0017-0099` became `TC-0017-0094`..`TC-0017-0100`.
- `TDD-0102`..`TDD-0109` became `TDD-0111`..`TDD-0118`.
- Change Request records `CR-20260924-0001`, `CR-20260924-0002` and `CR-20260925-0008` became `CR-20260924-0005`, `CR-20260924-0006` and `CR-20260925-0010`; every reference here follows them.
