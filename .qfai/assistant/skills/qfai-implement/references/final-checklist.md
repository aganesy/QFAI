# Final Checklist

Check this list last, immediately before the completion message. Every box must be ticked; a box that
cannot be ticked is a reason not to declare completion, not a note to carry forward.

**Derivation rule (MUST).** These boxes are the item completion checklist
(`SKILL.md#item-completion-checklist-12-point-gate`) plus the spec completion conditions
(`SKILL.md#spec-completion-conditions`) and the completion prohibitions that enforce them
(`SKILL.md#completion-prohibition-conditions`), restated as one sweep. Every gate item has at least
one box naming its number; a box covering a spec-level condition names that condition instead, so the
correspondence is auditable both ways. Adding a gate item, a completion condition or a prohibition
without adding or extending the box that covers it is a defect in this file — the sweep would then
pass on work the gate rejects. A box asserts a **terminal** state, not an accurately recorded one:
"the record is correct" and "the work is finished" are different claims, and only the second one
releases completion.

- [ ] CRITICAL CONSTRAINTS were followed.
- [ ] Each item was processed one test at a time with its `TDD-ID` selected and in progress, or inside an item-level parallel dispatch authorized by `SKILL.md#parallelization-policy` (gate item 1).
- [ ] Red phase: test was written first and confirmed to fail, and `qa-gatekeeper` confirmed the
      failure is **admissible** — an assertion or expected-exception check inside the row's
      `Selector`, not a load or fixture error (`red-admissibility.md`) — or, on the _RED not
      observable_ path, the correct test was written first, the falsifiability trio replaces the
      natural RED, **and `qa-gatekeeper` returned PASS on that mutation run**, recorded in the
      entry. The trio on its own is the implementer's own account of what was broken and why it
      failed; the gatekeeper reads the mutated tree and is the only thing that confirms the
      predicate broken is the one `Satisfied-by` names, which is why that path routes it too
      (`red-not-observable.md`, `SKILL.md#phase-red-write-failing-test` step 3c) (gate items 2, 3).
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
      blocking reviewer issues (gate items 7, 8, 11). **Both responses are also in the round's review
      pack** — `R0N_completion-reviewer.md` and `R0N_implementation-reviewer.md`, each with its own
      `reviewers[]` entry in `summary.json`, exactly like the parity verdict below
      (`review-artifact-layout.md` makes gate items 7-9 alike pack-bearing). The append is the row's
      copy of a verdict, not the verdict: a pack holding only some third reviewer still seals and
      recomputes cleanly here, and the `--profile tdd` run this list ends on reports no
      `QFAI-REVIEW-*` finding, so a review that never reached a pack passes every mechanical check
      there is. Never waived — the verdict is required even on a row whose review produced only
      advisories (`finding-classification.md`).
- [ ] Every UI-affecting row carries a `product-surface-reviewer` PASS — **prototype parity** on a
      visual-prototyping target, and on a cli-only target a surface review of the captured command
      output in its place, since `/qfai-prototyping` rejects `cli` and leaves no prototype to compare
      against — **and that reviewer's response is in the round's review pack**: its own
      `R0N_product-surface-reviewer.md` file with a matching `reviewers[]` entry in `summary.json`,
      like the two verdicts above (`review-artifact-layout.md`). `Prototype parity: PASS` in the
      evidence entry records the verdict on either target — the field name does not change — and it
      is not the verdict; the `--profile tdd` run this list ends on reports no `QFAI-REVIEW-*`
      finding, so a pack that never held a UI review passes it (gate item 9).
      Its `Prototype parity reviewed revision` names the **same** revision as items 6, 7
      and 8: a parity PASS taken before the surface moved is stale, and it is the one
      verdict a later reader cannot re-derive from the spec and the diff (gate item 10).
- [ ] `test-list.md` statuses are accurate **and** each row's `Evidence` anchor resolves to a fresh
      entry in the file its `Layer` owns, with `Review pack seal` and each `Audited evidence hash`
      recomputed, **and the entry's identity copy still matches the ledger row** — `TDD-ID`, `Layer`,
      `Test file`, `Selector` and the obligation reference the row's `Layer` selects (`TC-ref` for
      `Unit` / `Component` / `Integration`, `US-ref` for `E2E`, `CON-API-ref` for `API`). A handback
      or review-fix that renames a `Selector` or `Test file` in the ledger alone leaves every hash
      recomputing correctly over the stale copy, so the row completes with the reviewers having
      audited a selector it no longer names. **Except** an `E2E` / `API` row carrying the
      `Pre-split-evidence: implement` marker, whose `implement-<spec-id>.md` anchor is the accepted
      legacy location; requiring the ATDD file there would leave an already-complete row permanently
      ungateable. A verdict carrying a `Record re-attestation` is compared against **that** hash and
      not the superseded original — a record repair moved the bytes the original verdict read — and
      the `Record re-attestation pack seal` recomputes here beside the round's `Review pack seal`,
      each from the pack it names, so a repaired record stays checkable rather than becoming an
      unsealed rewrite of a closed pack (gate item 10).
- [ ] Each row's remaining observations **agree on the revision the row finally landed at** — item
      6's `Refactor verify revision`, the `Reviewed revision` of **every** reviewer response the row
      required (`completion-reviewer` and `implementation-reviewer`, **plus
      `product-surface-reviewer` on a UI-affecting row**: the shared reviewer template makes that
      field required on every response, so the third reviewer is the same rule and not a new one)
      and the pack's `summary.json.revision`. `RED revision` (or `Falsifiability revision` in its
      place) and the GREEN's `Revision` are the standing exceptions among the observations this
      comparison reaches: the RED is taken before the code that makes it pass exists, and the GREEN
      before Phase: Refactor, so demanding it agree makes this box and item 6 jointly satisfiable
      only by a refactor that changed nothing. Nothing else in this sweep compares what the
      reviewers read with the tree the row ended on — production or test code changed after a PASS
      leaves anchor, identity copy, pack seal and every `Audited evidence hash` recomputing
      correctly, and the later checkpoint runs green against the new tree, so the spec completes
      carrying a change no reviewer ever saw. A UI edited after the parity PASS is that same failure:
      leave the product response's revision behind and bring the other two into line and the surface
      that shipped is the one nobody reviewed. **The comparison reaches the rounds written under the
      current contract**, and a **registered legacy pack** is outside it — `revision_form: "legacy"`
      corroborated by `.qfai/review/.legacy-packs`, whose `summary.json.revision` is accepted
      malformed or absent because the tree that round described is not reconstructible and there is
      no content hash to migrate it to, so the observations it holds name no revision to compare
      against. The pack's own word is not enough: `legacy` without the manifest entry is a current
      producer downgrading its own broken value, and is judged by the rule above. A row this run
      advances opens a new pack under the current contract, so it can never reach this exception —
      like `Pre-split-evidence: implement`, it covers only work that was already complete when the
      migration ran, and without it re-checking such a spec would block completion forever with
      nothing the operator could do (gate item 10,
      `evidence-revision.md#what-makes-evidence-stale`, `evidence-revision.md#the-field`).
- [ ] Every handed-over `E2E` / `API` / `Integration` row's `Round N: RED test hash` **recomputes**
      here over the manifest recorded beside it, and matches. The other three recomputations above
      address the evidence entry, not the test: a fixture, snapshot or the test body edited after
      `/qfai-atdd` observed the RED leaves anchor, pack seal and `Audited evidence hash` all correct
      while the row's RED describes a test that no longer exists. A mismatch sends the row back for a
      fresh RED unless a `Shared-artifact re-verify` entry names this row's spec and `TDD-ID` **and
      carries the re-verification itself**: the selector re-run under the changed artifact with its
      result, the row's own mutation — the one its `Oracle proof` plan or `Satisfied-by` names —
      re-applied, its failure, the restored GREEN after the revert, and the artifact's new manifest
      and hash. The manifest and hash address the current bytes and nothing else: an assertion
      helper, snapshot or expected-value fixture weakened until the row's test cannot fail hashes
      exactly as cleanly as a sound one, and its recorded proof was taken against the artifact as it
      was. Re-taking that proof is what the exception is for (gate item 10,
      `round-evidence.md#round-block`).
- [ ] Checkpoint verification passed for **every** row advanced this run — the **full** suite where
      the row sits on a checkpoint boundary, the narrow relevant suite from Phase: Refactor step 2
      (the touched module plus its reverse-dependency closure, or the package fallback when that
      walk cannot be completed) where it does not — and each `Checkpoint verification seal`
      recomputes over the recorded command, result and revision (gate item 12).
- [ ] Spec-level checkpoint verification ran against the terminal ledger and **passed** — a non-zero
      formatter, linter, type-check or test result fails this box however correctly the record was
      sealed — its `Checkpoint verification seal` recomputes, **and the state that record names is
      this ledger's current one**: the recorded revision and result cover the ledger as it stands
      now, not an earlier terminal state it once reached. A record written before an approved Change
      Request reset and re-ran a row predates the last ledger change and owes a re-run. Its seal
      recomputes over the old command, result and revision exactly as cleanly as a current record's
      would, because the seal addresses the record and never the ledger the record was meant to
      cover. That boundary has no row, so the per-row checkpoint item above never runs for it
      (`checkpoint-verification.md#spec-level-boundary-on-an-already-complete-ledger`).
- [ ] No backward transitions occurred — other than an approved Change Request reset, the
      one the lifecycle sanctions (`execution-ledger.md#allowed-transitions`). A resumption, an
      anomaly exit and the `qa-gatekeeper` rework edge are re-entries, not backward transitions,
      and do not need to be declared here.
- [ ] Every ledger row reached a **terminal** status: `done`, or `exception` whose `DR-ID` names a
      Decision Record recorded as a **user-approved accepted-risk waiver** (a `TDDLIST-001` entry in
      `.qfai/waivers.yml`) — an `exception` whose DR only describes the anomaly is a parked defect.
      No `todo`, `blocked`, `red`, `green`, `refactor` or `review-fix` row remains. Accurate statuses are a
      different claim: a run that advanced no row records the ones left mid-cycle correctly and still
      may not declare the spec complete (`SKILL.md#completion-prohibition-conditions`).
- [ ] No `## Cross-spec obligations` entry of the **code-ownership** kind in this spec's evidence
      file is still open — each one's `Resolution` reads `re-reviewed` or names a `CR-*` that is
      itself resolved. An open entry means another spec's `done` rows still certify a behaviour this
      run changed and nobody re-verified, which is a completion prohibition however clean the local
      rows are. The **contract-residue** kind a `/qfai-atdd` run records for a sibling spec's
      uncovered `CON-API` / `CON-DB` is not this box: it is attributed to a named owning spec and
      closed by that spec's run, so reading it here re-blocks what that stage already discharged
      (`cross-spec-ownership.md#the-evidence-entry`, `SKILL.md#completion-prohibition-conditions`).
- [ ] Every applicable `TC-*` from `06_Test-Cases.md` is present in `test-list.md`, and
      `QFAI-ATDD-111` / `QFAI-ATDD-113` are clean for this spec.
- [ ] If any item ran as a parallel slice: the trunk ledger was reconciled from the worker reports
      **before** the verify (no merged item's row still `todo`), integration verify ran on the
      **merged** result and passed, and the seams were reconciled — each slice's touched `src/` paths
      diffed against its declared `Owning module`, with undeclared or overlapping paths recorded as a
      deny-condition breach. That last one is required **whether or not the merged suite is green**;
      a green suite is what the reconciliation exists to see past
      (`SKILL.md#post-parallel-integration-verify`,
      `parallelization-policy.md#seam-reconciliation-after-a-parallel-run`).
- [ ] No in-scope Change Request or waiver dependency is unresolved
      (`change-request-reset.md#when-an-in-scope-cr-counts-as-resolved`).
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
