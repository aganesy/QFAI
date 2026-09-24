# Steering removal handoff

## Objective and location

- Finish removing the shipped AI work-log workflow under `.qfai/steering/`,
  including its validators, templates, documentation, tests, and workflow
  evidence. Take the existing pull request through review and merge only after
  the remaining gates pass.
- Worktree: `C:\Users\pc\Documents\GitHub\QFAI\.claude\worktrees\qfai-steering-discussion-69d8a9`
- Branch: `claude/qfai-steering-discussion-69d8a9`
- Pull request: `https://github.com/aganesy/QFAI/pull/2221` (draft at handoff)
- The user stopped this run on 2026-09-25 and requested a checkpoint commit and
  push. This checkpoint is incomplete. Do not treat it as approval to merge.

## State at interruption

- The prior pushed head was `848174196541c183b56879f03c9075e61f64dd0f`.
  Its CI run was green. This checkpoint's changed tree has not passed full CI.
- Stage 0 of the SDD rerun returned `ready` and selected
  `.qfai/discussion/discussion-20260923060900824`. Stage 1 triage was added to
  the deltas for specs 0002, 0010, and 0014. The Phase 0 contract grilling was
  interrupted before a final result. No approved SDD change was applied to a
  primary spec or contract in this checkpoint.
- Four earlier change requests were marked approved. Their selected outcomes
  are: `CR-20260912-0003` option 1, `CR-20260913-0005` defect repair,
  `CR-20260913-0006` option 2, and `CR-20260913-0002` option 1. The first
  request's impact scope now names only the selected outcome, and its policy
  pointer was corrected from the unrelated `DR-0094` to `DR-0282`. The other
  two optioned requests also have selected-only impact scopes.
- New approved requests are `CR-20260925-0002` (repair 17 active selectors and
  retire six superseded rows), `CR-20260925-0003` option 2 (retire the pivot
  obligation), `CR-20260925-0004` option 2 (three required audit fields plus a
  validated optional tier map), and `CR-20260925-0005` (repair four incomplete
  selector proofs). An earlier approved and unapplied request,
  `CR-20260923-0001`, governs the capture, serve, convergence, and URL-helper
  rows. Read the requests before editing their upstream paths.
- Approval for draft `tmp/cross-spec-closure/CR-20260925-0001-spec-0012-selector-proof.draft.md`
  is still pending. It covers 25 comment-only selectors. Do not apply it until
  the user answers the already-sent question.

## Checkpoint changes and proof

- `spec-0012/tdd/test-list.md` has ten selector-only repairs. Eighteen
  candidate selectors ran nonzero tests and passed, but independent review
  rejected eight as incomplete against their cases. Those eight selector cells
  were restored to their former values; the approved request above and the
  earlier approved request govern their repair. Do not call the ten remaining
  rows fully re-reviewed without current semantic and mutation review.
- `spec-0006/TDD-0020` and `spec-0015/TDD-0020` received executable selectors.
  Focused runs passed with one and two selected tests, respectively.
- `shippedWorkflowOwnership.test.ts` now locates the TypeScript function body
  through the parser, so the TDD-0048 oracle reads the body rather than a
  parameter type literal. A TDD-0045 orphan fixture exceeds the digest limit,
  making its original delete mutation observable. Focused GREEN and isolated
  mutation FAIL, byte restoration, and GREEN were recorded for TDD-0045,
  TDD-0046, and TDD-0048. The latest local report is
  `tmp/cross-spec-mutations-qa/runs26.json`; its test SHA is
  `9e49861577ebedd15a0703adcc7fa77b295901437ebaa8e3a72516fc18e076d9`.
  Final evidence text still needs that SHA and reviewer
  reconciliation.
- The old single TDD-0054 mutation survives because a second current guard
  protects the same behavior. `runs19.json` and `runs24.json` show current
  fresh-writer and declined-name mutations failing their own assertions,
  followed by source restoration and GREEN. Keep the historical survivor
  visible. Its replacement proof and independent completion review remain open.
- The cross-spec evidence tables for spec 0004 still say `open`. A local
  inventory found 341 affected done rows across 140 test files. Its snapshot
  executed 287 row selectors successfully and left 54 unresolved; subsequent
  selector edits do not close the mutation or review gates. The detailed local
  reports are `tmp/cross-spec-closure/review-draft.json` and
  `tmp/cross-spec-mutations-qa/all-341-report.json`.
- `git diff --check` passed before this handoff was written. Earlier focused
  TypeScript lint and type checks passed, and format check passed before the
  latest edits. Re-run format, lint, types, tests, QFAI validation, and CI on
  the resumed tree. The prior green CI result applies only to the prior head.

## Required next work

1. Finish SDD in its fixed order: Phase 0 contracts, policy outline, affected
   spec slices, ledger identities, obligation reconciliation, plans, deltas,
   validation, and independent reviews. The requirements, test-design, and
   product drafts are under `tmp/sdd-approved/`. The architecture draft was
   not finished. Preserve the
   approved outcome and rejected-option boundaries in each change request.
2. For spec 0014, apply the three requests in order: ledger repair, integration
   re-level, then iteration evidence layout. The promotion row is `TDD-0042`;
   `TDD-0037` is already an E2E row. Repair the ledger's malformed separator
   without renumbering existing E2E rows.
3. For spec 0012, derive the approved audit, capture, pivot, selector, and
   supersession changes. The four newly approved proof gaps concern
   `TDD-0489`, `TDD-0498`, `TDD-0499`, and `TDD-0500`. The earlier approved
   request owns `TDD-0497`, `TDD-0514`, `TDD-0515`, and `TDD-0516`.
4. Complete the product and acceptance tests after SDD: validation must read
   top-level `iter-NN/<screen-id>.png` and `.html`, while aggregate directories
   remain handoff copies. Re-run every affected other-spec selector and its
   original mutation where a proof exists. Obtain independent completion
   review before changing any `open` cross-spec resolution to `re-reviewed`.
5. Refresh the handoff's checkpoint proof, run the repository gates, update the
   draft pull request, complete the live review and CI monitor, then merge only
   when all required gates pass and the user resumes the work.

## Local-only working material

`tmp/` is ignored and is not part of the checkpoint commit. The worktree path
above contains the SDD role drafts, selector plans, mutation logs, and the
pending change request draft. Copy these elsewhere if the worktree will be
removed. The tracked change requests and this handoff remain in Git.
