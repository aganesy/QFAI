# Final Checklist

Check this list last, immediately before the completion message. Every box must be ticked; a box that
cannot be ticked is a reason not to declare completion, not a note to carry forward.

**Derivation rule (MUST).** These boxes are the item completion checklist
(`SKILL.md#item-completion-checklist-12-point-gate`) plus the spec completion conditions
(`SKILL.md#spec-completion-conditions`), restated as one sweep. Every gate item has at least one box
and every box names the gate item it covers, so the correspondence is auditable both ways. Adding a
gate item or a completion condition without adding or extending the box that covers it is a defect in
this file — the sweep would then pass on work the gate rejects.

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time with its `TDD-ID` selected and in progress, or inside an item-level parallel dispatch authorized by `SKILL.md#parallelization-policy` (gate item 1).
- [ ] Red phase: test was written first and confirmed to fail, and `qa-gatekeeper` confirmed the
      failure is **admissible** — an assertion or expected-exception check inside the row's
      `Selector`, not a load or fixture error (`red-admissibility.md`) — or, on the _RED not
      observable_ path, the correct test was written first and the falsifiability trio replaces the
      natural RED (`red-not-observable.md`) (gate items 2, 3).
- [ ] Green phase: minimal code was written, `qa-gatekeeper` confirmed the test passes, **and**
      `Oracle proof` (or `equivalent-mutant` naming the weaker contract clause) is recorded, reverted,
      and absent from the commit — exit code 0 alone does not distinguish a discriminating test from
      one that cannot fail (gate items 4, 5, `oracle-strength.md`). On the _RED not observable_ path
      the waiver reaches the **minimal-code clause only** (gate item 4): the `Satisfied-by` row
      already implements the predicate, and its falsifiability mutation already satisfies
      `Oracle proof`. The observed GREEN on the reverted tree is still required there — every other
      gate item is unchanged on that path (gate item 5, `red-not-observable.md`).
- [ ] Refactor phase: code improved with tests still passing, and GREEN re-confirmed after the
      refactor (gate item 6).
- [ ] `completion-reviewer` and `implementation-reviewer` returned PASS for every row advanced this
      run, and both verdicts are appended to the evidence file the row's `Layer` owns, leaving 0
      blocking reviewer issues (gate items 7, 8, 11). Never waived — the verdict is required even on
      a row whose review produced only advisories (`finding-classification.md`).
- [ ] Every UI-affecting row carries a `product-surface-reviewer` prototype-parity PASS (gate item 9).
- [ ] `test-list.md` statuses are accurate **and** each row's `Evidence` anchor resolves to a fresh
      entry in the file its `Layer` owns, with `Review pack seal` and each `Audited evidence hash`
      recomputed — **except** an `E2E` / `API` row carrying the `Pre-split-evidence: implement`
      marker, whose `implement-<spec-id>.md` anchor is the accepted legacy location; requiring the
      ATDD file there would leave an already-complete row permanently ungateable (gate item 10).
- [ ] Checkpoint verification passed for **every** row advanced this run — the **full** suite where
      the row sits on a checkpoint boundary, the narrow relevant suite from Phase: Refactor step 2
      (the touched module plus its reverse-dependency closure, or the package fallback when that
      walk cannot be completed) where it does not — and each `Checkpoint verification seal`
      recomputes over the recorded command, result and revision (gate item 12).
- [ ] Spec-level checkpoint verification ran against the terminal ledger and **passed** — a non-zero
      formatter, linter, type-check or test result fails this box however correctly the record was
      sealed — and its `Checkpoint verification seal` recomputes. That boundary has no row, so the
      per-row checkpoint item above never runs for it
      (`checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger`).
- [ ] No backward transitions occurred — other than an approved Change Request reset, the
      one the lifecycle sanctions (`execution-ledger.md#allowed-transitions`). A resumption, an
      anomaly exit and the `qa-gatekeeper` rework edge are re-entries, not backward transitions,
      and do not need to be declared here.
- [ ] Exception items have DR-IDs recorded.
- [ ] Every applicable `TC-*` from `06_Test-Cases.md` is present in `test-list.md`, and
      `QFAI-ATDD-111` / `QFAI-ATDD-113` are clean for this spec.
- [ ] No in-scope Change Request or waiver dependency is unresolved
      (`change-request-reset.md#when-an-in-scope-cr-counts-as-resolved`).
- [ ] All tests pass.
- [ ] `npx qfai validate --profile tdd --fail-on error --spec <spec-id>` passes with zero
      `QFAI-TEST-001` findings (no `it.todo` / `test.todo` / `describe.todo` stubs remain).
      `--spec` scopes the **spec-owned** rules; `QFAI-TEST-001` is **not** one of them and
      still fails this gate wherever the stub lives. It names a test file, which no spec
      owns, so a sibling spec's `it.todo` exits 1 here. That is a real limit, not a
      formality: record the finding, its owning spec and why it is not this run's work,
      say so in the completion report, and do **not** claim the gate passed, weaken the
      profile or lower `--fail-on`. The repo-wide run belongs to `/qfai-verify`.
