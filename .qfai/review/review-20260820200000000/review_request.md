# Review request

- Stage: /qfai-atdd (spec-0017)
- Unit: the nine `US-0017-*` E2E rows, the Coverage Depth Matrix, and the stage evidence
- Round: 1 (this stage's first review; the six earlier rounds were `/qfai-implement`)
- Evidence: `.qfai/evidence/atdd-spec-0017.md`, `.qfai/evidence/coverage-depth-spec-0017.md`
- Revision under review: the commit that adds this file — take `git rev-parse --short HEAD` at your
  start; it will not move while you run

## Why this round exists

The stage evidence records `Final status: FAIL`, and one of the two reasons is that this gate was
never run: the skill's Stage Minimum Roles require `test-design-analyst`,
`acceptance-test-engineer` and `devops-ci-engineer` work orders with the orchestrator not drafting
the primary artifact, plus an independent `completion-reviewer`. The stage ran inline instead. The
E2E file, the matrix and the evidence were authored by the party that also judged them.

That deviation is not repairable retroactively — the work orders did not happen. What is repairable
is the gate, and this is it.

## What the stage did

- **new** `packages/qfai/tests/e2e/spec0017LayeredCiScaffoldE2E.test.ts` — nine annotated describes,
  one per `US-0017-*`, over the project `qfai init` produces
- **appended** `tests/e2e/qfai-traceability.md` — nine `QFAI:SPEC-0017:US-0017-NNNN` lines, after the
  test existed and gated on every declared US being covered by a describe
- **new** `.qfai/evidence/coverage-depth-spec-0017.md` — ✅ 3 / ⚠️ 2 / ❌ 4 by `Status`, with a
  justification per `❌`
- **new** `.qfai/evidence/atdd-spec-0017.md` — the stage record

Measured effect: `validate --profile atdd --spec 0017` went `error=2` to `error=1`; repo-wide
`QFAI-ATDD-111` went 20 items to 11; `test:e2e` 1414 passed; `ci:lint` 0.

## What I most want challenged

1. **Whether the nine assertions earn their annotations.** Four user stories are satisfied in the
   shipped tree and asserted on their substance. Five are not satisfied, and for those the test
   asserts an INVARIANT the story depends on rather than the story itself — the `pull_request`
   trigger a lint lane would run on, the one-file shape a matrix would live in, the reachability a
   retirement must not break. I claim that is honest and that pinning the absences would be a test
   that punishes its own fix. **Challenge it**: is an invariant assertion plus a `❌` matrix cell
   adequate coverage for `QFAI-ATDD-111`'s purpose, or is it an annotation over a gap?
2. **The order of test and annotation.** I appended the ledger lines only after the E2E file existed,
   with a script that refuses unless every declared US is covered by a describe. Check that the
   refusal is real and that no annotation names a US no describe covers.
3. **The five oracle rounds.** `E1`–`E4` redden, `E5` is a control that does not. Assume they may be
   vacuous: rounds 4, 5 and 6 of the implement stage each found a vacuous claim inside the previous
   round's repairs, and this round's author is the same one. In particular check whether `E4`'s
   mutation actually violates the property it tests.
4. **"No ledger row was advanced, and zero is correct."** All 71 `Integration` rows are already at
   `refactor`, so none is `todo` and none is selectable. I claim merged Phase Red step 3b's handover
   applies only to rows this stage would advance from `todo`, and that manufacturing provenance for
   rows this stage did not observe would be worse than the gap. **Challenge that**: does step 3b's
   requirement reach rows already past `todo`, and if so what does this stage owe them?
5. **The shipped-tree finding.** Five of nine user stories unsatisfied in
   `assets/init/root/.github/workflows/**`. Verify the measurement — 0 uploads, 0 builds, five
   separate layer jobs, no hygiene lane invocation, no knob file, `qfai-validate.yml` still shipped —
   and say whether the split I report is right.

## Instructions

- **No mutations.** Read-only: run suites and gates, plant nothing. Scratch under `tmp/` only.
- No `git checkout` / `stash` / `reset`. Note that `validate` writes the TRACKED
  `.qfai/report/validate.log`; use a `git archive HEAD` shadow root if you need to run it.
- Report `git rev-parse --short HEAD` at your start and confirm `git status --porcelain` was empty.
  If HEAD moves during your run, that is a finding.
- `PASS` or `REVISE` only. `PENDING` for a gate you could not run.
- Write findings into this pack.
