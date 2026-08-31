# Final Checklist

Check this list last, immediately before the completion message. Every box must be ticked; a box that
cannot be ticked is a reason not to declare completion, not a note to carry forward.

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time, or inside an item-level parallel dispatch authorized by `SKILL.md#parallelization-policy`.
- [ ] Red phase: test was written and confirmed to fail — or, on the _RED not observable_ path,
      the correct test was written first and the falsifiability trio replaces the natural RED
      (`red-not-observable.md`).
- [ ] Green phase: minimal code was written and test confirmed to pass — waived on the _RED not
      observable_ path, where the `Satisfied-by` row already implements the predicate.
- [ ] Refactor phase: code improved with tests still passing.
- [ ] `test-list.md` statuses are accurate.
- [ ] No backward transitions occurred — other than an approved Change Request reset, the
      one the lifecycle sanctions (`execution-ledger.md#allowed-transitions`). A resumption, an
      anomaly exit and the `qa-gatekeeper` rework edge are re-entries, not backward transitions,
      and do not need to be declared here.
- [ ] Exception items have DR-IDs recorded.
- [ ] All tests pass.
- [ ] `npx qfai validate --profile tdd --fail-on error --spec <spec-id>` passes with zero
      `QFAI-TEST-001` findings (no `it.todo` / `test.todo` / `describe.todo` stubs remain).
      The JS/TS `.skip` family is a separate warning rule, `QFAI-TEST-003`, and is **not**
      counted here — a `.skip` parked in some unrelated scaffold cannot block completion.
      `--spec` scopes the **spec-owned** rules; `QFAI-TEST-001` is **not** one of them and
      still fails this gate wherever the stub lives. It names a test file, which no spec
      owns, so a sibling spec's `it.todo` exits 1 here. That is a real limit, not a
      formality: record the finding, its owning spec and why it is not this run's work,
      say so in the completion report, and do **not** claim the gate passed, weaken the
      profile or lower `--fail-on`. The repo-wide run belongs to `/qfai-verify`.
