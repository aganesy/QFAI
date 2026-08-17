---
id: 2026-08-17-chg-007-spec-0006-review-closure-scope
status: active
kind: scope-up
created: 2026-08-17
updated: 2026-08-17
scope: spec-0006
blocking: false
promote-to: null
links:
  - spec-0006
  - CR-20260807-0001
  - CR-20260807-0002
  - CR-20260810-0001
  - CR-20260814-0001
  - CR-20260817-0001
---

# `refactor` did not mean what the ledger implied, and unblocking step 4 is what showed it

The remaining spec-0006 work was reported to the user as **four rows**. It is **ten**. This entry records
why the estimate was wrong, because the cause is structural and the ~94 rows still queued across
spec-0017, spec-0015 and spec-0008 will hit it in the same shape.

## 1. The estimate error, and why the ledger could not have prevented it

Six rows sat at `refactor`. The evidence file said, in a roll-up, that they had "all three required
reviewers reported PASS", and step 4 — blocked by two pre-existing errors no row could discharge — was
recorded as the only thing holding them. Reading the ledger, `refactor` looked like _reviewed and
complete, waiting on an external gate_.

It was not. An independent audit of all six found that **four carry a reviewer PASS followed by further
commits to test or production code**, and two have no `completion-reviewer` or `implementation-reviewer`
verdict at all. `refactor` meant _implemented_, not _review-closed_, and **the ledger has no column that
distinguishes the two**. `Status` alone cannot: both states are spelled `refactor`.

The roll-up sentence was itself false for one row and had been since it was written. It is corrected in
place now, per the standing brief's record-hygiene rule.

## 2. Step 4 was masking the real blocker, not merely delaying it

`CR-20260807-0001` was raised because checkpoint step 4 cannot exit 0 against a standing baseline error.
It is a real defect and Option A was the right call. But while step 4 failed, **no row ever reached the
question of whether its reviews were current** — the checkpoint failed first, every time, for a reason
external to the row. Approving the substitution removed the outer gate and exposed **seventeen** record
defects underneath it.

Generalise: _a gate that fails for an external reason hides every gate behind it._ When one is finally
released, budget for what it was standing in front of rather than for the rows it was blocking.

## 3. The dominant defect class this round: records true when written, false at HEAD

Every one of the seventeen findings is a record defect. Not one is a code defect — two reviewers returned
`implementation-reviewer` PASS, and every reviewer re-measured its row green at HEAD. The shape recurs:

- A row is reworked. The commit lands. **The per-item evidence is not refreshed.**
- The correction, when it comes, is appended under a **sibling `##` heading**, outside the subsection the
  ledger's `Evidence` anchor points at. A reader following the anchor gets the stale version.
- Figures age silently: `GREEN 3 passed` where the file now holds six tests; a closure count superseded
  five times; a mutation table whose base blob is no longer the row's bytes.

`TDD-0039` is the limit case: its `Evidence` cell is a ~1,900-character narrative **carrying the payload**,
and its anchor `#tdd-0039` resolves to nothing at all. The cell is specified as a pointer.

The standing brief already names the fix — "a false statement is edited where it lives" — and this round
is the measurement of what ignoring it costs at scale.

## 4. Four defects of the orchestrator's own, recorded because three were already written down

1. **A needle routed through a shell.** A `python -c` string with backticks was expanded by bash as
   command substitution and wrote a mangled sentence into the evidence. The standing brief's §3 says
   exactly this, from three prior incidents in this slice. Author with the Write tool or a script file.
2. **A shipped-prose edit made without running the suite.** `prettier`, `lint:md` and the leakage guard
   all passed; none of them reads a test. Four assertions in
   `packages/qfai/tests/assets/ledgerWriteAuthorization.test.ts` were red and the edit shipped anyway.
   **A shipped-prose edit needs the suite, not just the formatters.**
3. **A Change Request applied only where it was written.** `CR-20260807-0002` widened the ledger carve-out
   in `drift-protocol.md`; the CR's own four-step plan named nothing else. But the rule is _restated_ in
   two other shipped documents, and an agent reading `qfai-implement/SKILL.md`'s Non-goals would still
   have refused the write the user had just authorised. **Following an incomplete plan faithfully still
   leaves an inconsistent artifact.** Scope a CR application by grepping every tree for restatements, not
   by its step list — `.agents/rules/distributed-surface.md` already states the governing discipline.
4. **Ten agents running `vitest` concurrently produced a false nondeterminism report.** A reviewer
   reported the six-suite closure as flaky; run serially it is `Tests 13 passed (13)` four times out of
   four. `useAdopterTreePool` builds real temp trees, so heavy parallel dispatch contends on the
   filesystem. **Cap concurrent suite-running agents.** The failure mode is a defect report against
   sound code, which costs a round to disprove.

## 5. Standing consequences

- **Do not read `refactor` as review-closed.** Before estimating remaining work on any queued spec, grep
  the evidence for each parked row's reviewer verdicts and for commits landing after them.
- **Re-route `completion-reviewer` whenever the artifact moves**, which the standing brief already says
  after that verdict went six rounds stale. This round found four more instances of the same shape.
- **A CR's `Approved actions` list is a starting point, not a scope.** Verify the delivered state.
- **Cap parallel suite execution.** Reviews and audits can fan out; suite runs should not.
