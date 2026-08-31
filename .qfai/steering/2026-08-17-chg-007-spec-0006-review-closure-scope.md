---
id: 2026-08-17-chg-007-spec-0006-review-closure-scope
status: active
kind: scope-up
created: 2026-08-17
updated: 2026-08-18
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
  - CR-20260817-0002
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

`TDD-0039` was the limit case: its `Evidence` cell was a ~1,900-character narrative **carrying the
payload**, and its anchor `#tdd-0039` resolved to nothing at all. The cell is specified as a pointer.

> **Both halves are closed, and the dates matter for reading this entry.** The missing heading was
> added at `3a9250bf`, which is _after_ this entry was written at `c9d73e9c` — so the sentence above
> was true when written and went stale under my own fix. It is kept in the past tense rather than
> deleted, because the finding is what justifies the consequence below it. The cell itself became a
> pointer when the six rows closed under `CR-20260817-0002` Option C; all six anchors now resolve,
> checked by matching the heading pattern against the ledger's six IDs rather than by eye.

The standing brief already names the fix — "a false statement is edited where it lives" — and this round
is the measurement of what ignoring it costs at scale.

## 4. Five defects of the orchestrator's own, recorded because three were already written down

> Count corrected from four to five as the review rounds progressed. The count itself is the point: two of
> the five are the **same class** (a change applied where it was written and not where it is read), and the
> second instance was found only after the first had been written down. A defect class survives being
> recorded; it stops when the scoping rule changes.

1. **A needle routed through a shell — three times in one session, after reading the rule that forbids
   it.** First a `python -c` string whose backticks bash expanded as command substitution, writing a
   mangled sentence into the evidence. Then two `node -e` invocations in a row while trying to fix the
   consequences: one collapsed an escape sequence to a literal newline, the other left a `**` inside a
   bolded span so prettier reflowed the bullet into nonsense. The standing brief's §3 already recorded
   three prior instances in this slice; this makes six. **The rule is not "escape carefully", it is
   "author the script as a file".** Every one of the three failures is silent — the command exits 0 and
   writes something plausible — which is why re-reading the rule did not prevent the second and third.
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
4. **A Change Request applied to the spec but not to the prose quoting the spec — the same class as (3),
   third instance.** `CR-20260810-0001` Option A reworded `TC-0006-0030`'s leg (b). Four test docblocks
   **quote** that TC, and all four went stale the moment the rewording landed:
   `provenanceGate.test.ts:286` still quotes the pre-CR string as its governing obligation;
   `unresolvedPackaged.test.ts:9-18` asserts "LEG (b) IS NOT COVERED" and that the CR is `open`, both
   false; `repairText.test.ts:13-14` carries the pre-CR partition claim. **Applying a CR to an obligation
   stales every artifact that quotes it**, and the quoting artifacts are exactly where a reader looks
   first. The scoping rule from (3) — grep every tree for restatements — has to include _quotations of the
   obligation_, not only restatements of the rule.
5. **Ten agents running `vitest` concurrently produced a false nondeterminism report.** A reviewer
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
- **An agent-level crash defeats a `finally`-based restore.** A delegated engineer died on a network
  error mid-mutation and left the mutant in the tree; its harness never reached its own `finally`, so the
  printed verification the standing brief prescribes — which caught two earlier _driver_ crashes — could
  not fire at all. The check that survives is external: run `git status --short` and
  `git diff --stat -- packages/qfai/src` before trusting any tree a mutation run has touched, **whether
  or not the run reported success**. A run that reports nothing at all is exactly the case where the tree
  is most likely dirty.
- **The Read tool renders control bytes invisibly, and Edit will still match around them.** A needle
  typed from Read output silently lost a literal `ESC` that was present in the file, and the edit
  reported success against text nobody could see. `node -p "JSON.stringify(line)"` is what exposed it.
  Author needles from a JSON byte dump, not from a render. This is the same family as the two hazards
  below and above it: the failure is silent and the command exits 0.
- **A ledger `Evidence` cell must not carry a derived count of file contents.** All six rows closed
  this round had one — a closure count, a comment-line ratio, a selector count, a per-file test count —
  and all six were stale. The cell is a pointer; counts belong in the row's per-item block, where they
  can be re-measured at the tip in one place. A count copied into a second location is a second thing
  to keep current, and the copy is the one nobody re-measures.
- **Close a shared-file group in one commit.** Rows sharing a test file cannot all be current under
  incremental closure: each row's landing commit stales the siblings' citations. Measure at the tip,
  then land every record and every `done` transition together. `CR-20260817-0002` records the
  arithmetic; the enabling clause is that a record-only commit covers no file any observation ran
  against, so it does not stale one.
- **`String.replace` with a string replacement interprets `$` in the replacement**, and this entry is
  where that bit. A paragraph being inserted contained a regex anchor followed by a closing code-span
  backtick; that two-character sequence means _everything before the match_, so the writer spliced the
  whole preceding file into the middle of a sentence — silently, exit 0. **Pass a function**, which
  makes the text literal. This is the seventh instance in this slice of the same root cause: a needle
  or a replacement handed to something that interprets it. Authoring the script as a file fixes the
  _shell_ half of that family and not this half.
  - What caught it was a check that looked pointless: a no-op pair asserting the front-matter date
    still occurred exactly once. It reported **two**. Keep the redundant invariant — in a silent
    failure class, the only thing that fires is a count nobody expected to change.
- **The evidence file is CRLF in the working tree.** A multi-line needle joined with \n matches
  nothing under `.qfai/evidence/`, and the script reports `0 occurrences` — which reads as “already
  fixed” rather than as “wrong line endings”, the same silent shape as the shell-expansion hazard.
  Detect the file EOL and build the needle against it. The standing brief already says whitespace is
  part of a needle's identity for mutations; it holds for evidence edits too, and git's commit-time
  normalisation is what hides it — the committed bytes are LF, so a needle derived from `git show`
  will not match the working tree.
