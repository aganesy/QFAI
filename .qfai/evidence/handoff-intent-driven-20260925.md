# Intent-driven implementation handoff

## Status

Work was interrupted at the user's request on 2026-09-25 JST. This checkpoint contains an incomplete implementation. No pull request has been opened or merged. Do not treat the SDD batch, the workflow implementation, or the prototyping reconciliation as complete.

## Workspace and source of direction

- Working tree to resume: `C:\Users\pc\Documents\GitHub\QFAI\.claude\worktrees\issue-pr-cycle-496f7a`
- Branch: `claude/qfai-intent-driven-design-3990c1`
- Remote: `https://github.com/aganesy/QFAI.git`
- Original Claude Code session: `Intent-drivenの実装` in the same working tree. Re-read its session log if an SDD artifact conflicts with a later decision.
- Discussion pack: `.qfai/discussion/discussion-20260923171450572/`. Read its decisions and delta before changing scope.
- Implementation ledger: `.qfai/specs/spec-0018/tdd/test-list.md`; implementation evidence: `.qfai/evidence/implement-spec-0018.md`.
- Shipped source is under `packages/qfai/`. The repository's `.qfai/assistant` tree is generated.

## Decisions already authorized

- Finish completion: commit tracked evidence immediately before `finish`; `finish` records completion in the runtime journal only. The CLI contracts and spec-0018 reflect this choice.
- `CR-20260924-0008` option 1: add an independent negative case and ledger row for a missing CREATE authorization ID.
- `CR-20260925-0017`: assign TDD-0014 to workflow core `decide.ts`.
- `CR-20260925-0018` option 1: use typed `{kind,ref}` route references. SDD is updated; implementation and affected ledger rows remain pending.
- `CR-20260913-0012` option 1: remove two contradictory later acceptance criteria and retain the valid optional side-artifact criterion under a new ID. The spec-0013 limited SDD rerun passed.
- `CR-20260925-0019` option 1: reconcile spec-0012 duplicate and stale boundaries. This CR is only partially applied at interruption; its `Applied at` field remains unset.
- The choice for `CR-20260912-0003` was still awaiting the user's answer when work stopped. Do not infer approval.

## Implementation position

- TDD-0001, 0002, 0004 and 0013 have sealed done evidence. TDD-0003 is in review-fix. TDD-0015 needs a review fix under the approved typed-reference contract.
- TDD-0026 and 0027 passed RED, GREEN, oracle and refactor checks and are parked at `refactor` until the `BR-0018-0010` group closes. Reverify both against the final group tree.
- TDD-0028 is recorded as `red` in the ledger. Independent RED QA passed. The bounded-change GREEN source change is present in `packages/qfai/src/core/workflow/decide.ts`; the worker reported selector 1/1, direct and bugfix siblings 2/2, related suite 6 files/9 tests, and an oracle mutation that failed the selector and was restored. Its GREEN revision, evidence entry, independent GREEN QA and refactor verification were **not** completed before interruption. Source SHA-256 reported after restoration: `a49294c3ca11f8dde947869eba0ee42f9da2223556e81d2e33b1011e038c367e`; test SHA-256: `efbfba64528939ae5faba7a18b44174d4bd76361b524c1a137edc9c377e7d872`. Recheck these before accepting the report.
- TDD-0029 and 0030 and the remaining spec-0018 ledger rows have not been implemented. The existing `decide.ts` is only a partial core.
- The earlier TDD-0027 S5 session-ending revision was captured too late. Its rejected RED record and QA REVISE remain in the evidence; a later invocation re-observed RED and passed. Preserve both records.

## Interrupted spec-0012 reconciliation

- `CR-20260925-0019` has approved metadata and an unfinished resolution. The SDD owner changed `06_Test-Cases.md`, `09_delta.md`, `16_Traceability-ledger.md`, and `tdd/test-list.md`, but did not finish the scoped validation or mark the CR applied.
- TC-0012-0334 was removed from active coverage; TC-0012-0335 was moved to L3 with a real post-handoff output oracle. TDD-0583 and 0568 were seeded as Integration rows. Six duplicate or stale rows were retired with their original Evidence strings preserved. TDD-0336, 0337 and 0338 were re-scoped, but their `done` status, DR-ID and Evidence still need the `/qfai-implement` change-request preflight reset.
- The CR originally misstated that the six retired rows had `Evidence: -` and had never executed. All six were `done` with descriptive Evidence. The CR was corrected after an independent review; preserve that history.
- A scoped SDD run then found `TDDLIST_TC_NOT_COVERED TC-0012-0321`. Independent review found that the superseded index-14 case should leave active `06_Test-Cases.md`, with its former text and successor TC-0012-0357 retained in `09_delta.md`. The owner was applying that correction when interrupted. Check the current files and rerun scoped SDD, drift, ATDD/full profile, and dogfood backlog. TC-0012-0325 may have the same residual coverage problem.

## Validation and delivery still needed

- Before resuming implementation, audit the interrupted spec-0012 files and record an honest scoped validation result. The prior global SDD backlog had 10 errors: spec-0002 (1), spec-0010 (1), and spec-0012 (8). The current count is unknown.
- Complete TDD-0028 GREEN evidence and independent QA, then its refactor verification. Continue the remaining ledger one test at a time under `qfai-implement`. Close the `BR-0018-0010` group only after TDD-0029/0030 and closed-tree reviews.
- After any TypeScript edit, run `pnpm format:check && pnpm lint && pnpm check-types`. Earlier `pnpm format:check` was blocked by `ERR_PNPM_UNSAFE_MODULES_DIR` on the existing node_modules junction. Direct Node Prettier, ESLint and TypeScript checks passed for the edited workflow files; the package gates have not passed as a whole.
- Run full relevant tests, QFAI validation/report gates, independent completion and implementation reviews, and the repository CI gate. The current checkpoint has not met those gates.
- Read `REVIEW.md` from the PR base branch before writing or reviewing a PR. No release version is pinned on this branch; do not choose a version or tag. The user originally authorized work through PR merge, but subsequently requested interruption and handoff, so do not continue that work without a new instruction.
