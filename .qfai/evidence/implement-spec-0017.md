# Implement evidence — spec-0017 (layered CI scaffold, own toolchain)

Per-item TDD evidence for spec-0017. One `### TDD-NNNN` section per ledger row; the ledger's
`Evidence` cell is a POINTER into this file and never carries the payload.

Recorded under `CR-20260817-0002` Option A: **revisions, not blob enumerations.** A blob is derived
state (`git rev-parse <rev>:<path>`), and a written blob diverges from its source whenever rows
share a file — which is the normal case here, because this spec's ledger points **all 82 rows at one
test file**. The one exception is a **mutant** blob, which no revision determines; those are recorded
as base revision + literal needle + literal replacement, with the mutant hash kept.

## Change 1 — the derived verdict (TDD-0001 … TDD-0005)

`10_Plan.md` § `The shape of the change, in order` step 1, and `DR-0017-0005` edge 1: this change
merges before any change that adds a job to the own-CI workflow. Nothing else is in it.

### What changed in production

`.github/workflows/ci.yml`, the `ci-pass` job only. Its single step replaced a six-way shell
condition over hand-written need names with a Node program that iterates `${{ toJSON(needs) }}`.
The job key and display name are unchanged — `ci-pass` — because a check name is a
repository-settings surface no agent can reconfigure.

### The design decision this spec did not make for me, and why it went the way it did

Neither `07_Decisions.md` nor the business rules fix the verdict body's implementation language.
Three things had to be true at once, and they select the design:

1. **`BR-0017-0001`** — iterate the serialized map, hold no hand-written list of names.
2. **`TC-0017-0002` / `TC-0017-0004` / `TC-0017-0005` are `unit` rows** whose oracle is "the verdict
   expression **evaluated** over a needs map the test supplies". Evaluated, not pattern-matched: a
   test that greps the body for `success` passes on a body that accepts everything.
3. The evaluation has to run wherever this repository's tests run, which includes Windows.

So the body is a **Node program inside a quoted heredoc**:

- **Node, not `jq`.** The runner image ships both, but a `jq` body is unverifiable on a developer
  machine without `jq`, and an unverifiable gate is exactly what the derived verdict replaces. Node
  is the one interpreter guaranteed to be present in the test process itself.
- **Quoted heredoc (`<<'NODE'`), and this is load-bearing twice.** Bash performs no expansion inside
  a quoted heredoc, so (a) the bytes GitHub executes are the bytes the test extracts and runs, and
  (b) no `$` or backtick in the program can be rewritten by the shell on the way in. Under an
  unquoted heredoc the executed text and the tested text would differ **silently**, which is the
  failure mode this slice has already been bitten by in three other forms.
- **The extractor refuses anything but one well-ordered delimiter pair.** A silent zero-match
  extractor would hand every test an empty program; `node ""` exits 0; the two accepting rows would
  pass and the three rejecting rows would fail against the wrong cause.

### RED: the order was wrong, and how it was recovered

**Stated plainly because it is a process deviation, not a footnote: the production body was authored
BEFORE the test file.** That is not test-first, and no later measurement makes it so.

What the recovery could and could not do. `red-admissibility.md` § "Step 3a: create the seam first"
prescribes the shape of an admissible RED when the first failure would otherwise be a resolution
failure: create the **minimal seam with no behaviour**, so the failure is an assertion inside the
row's own Selector. Reverting to the pre-change body would NOT have produced that — the old body has
no heredoc at all, so `extractVerdictProgram` throws and every row fails with a fixture error, which
the same document lists under "What is not a RED".

So the verdict program was reduced to the prescribed seam — three comment lines and
`process.exit(0);`, returning rather than throwing, per the same section's explicit instruction —
and the suite was run against it.

- **RED command**, from `packages/qfai`:
  `./node_modules/.bin/vitest run tests/scripts/ownWorkflowTopology.test.ts`
- **RED result**: `Tests 4 failed | 1 passed (5)`, exit 1.
- **Admissibility, checked against all four criteria rather than asserted**: the module loads; every
  failure is an assertion inside its row's own Selector; the messages name the predicate
  (`expected +0 to be 1`, `expected '' to contain 'lint'`); and deleting the assertions would make
  the run pass, since the seam exits 0.

### The one row that could not have a natural RED, and the general reason

`TDD-0004` **passed** against the seam. That is not an accident of this seam — it is structural:
`TC-0017-0004` asserts the **accepting** direction (exit 0 for all-success and for all-skipped), and
a no-behaviour seam accepts everything. **No seam can redden an accepting-direction row.** Only a
mutation that narrows the accepting set can.

`TDD-0004` therefore records `RED failure mode: falsifiability` with mutation `O1` below. This is a
different situation from the one `red-not-observable.md` describes — there the obligation is already
satisfied by a **sibling row**; here it is satisfied by the **seam**, which is not production code.
The evidence form is the same and the classification is recorded honestly rather than filed under
the nearest existing label.

### GREEN

- **GREEN command**: the same file-scoped command, with the real body restored and byte-verified
  against the pre-seam text.
- **GREEN result**: `Tests 5 passed (5)`, exit 0.

### Oracle proof — aimed at the two claims the seam could not redden

The RED reddened `TDD-0001` CLAIM 2, `TDD-0002`, `TDD-0003` and `TDD-0005`. Two claims survived it
for structural reasons and needed their own mutations. Base is the working tree at revision
`3dbeeef6` plus this change; needles are literal and were each measured to occur **exactly once**.

| id   | claim                                                | needle -> replacement                                                                             | mutant blob | result |
| ---- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------- | ------ |
| `O1` | `TDD-0004` — `skipped` is an accepting state         | `const ACCEPTING = new Set(["success", "skipped"]);` -> `const ACCEPTING = new Set(["success"]);`   | (uncommitted tree) | `Tests 1 failed \| 4 passed (5)`, reddening the all-skipped claim **alone** |
| `O2` | `TDD-0001` — no literal enumeration of need names     | the `for (const [name, need] of entries) {` header gains a `NAMES` array and `.filter(...)`         | (uncommitted tree) | `Tests 1 failed \| 4 passed (5)`, reddening all six name claims **and** the future-job claim |

`O2` is the exact regression this change exists to prevent: it restores a hand-maintained list, and
the row detects it from both directions at once — the names reappear in the body, and a need the
list does not carry stops being evaluated.

Mutant blobs are not quoted here because the base is an **uncommitted** working tree at the time the
mutations ran, so `git hash-object` on the mutant is joinable only to bytes that no revision
addresses. The needle and replacement text are the reproducible record, which is what
`references/oracle-strength.md` asks for; the base becomes addressable at the commit that lands this
change.

Restoration was verified by byte comparison against a snapshot after each mutation, plus
`git status --short -- .github` printed at the end — expected NON-empty, carrying this change and
nothing else. A `finally` is not the mechanism, because a process-level crash defeats one.

### Two assertion-design choices worth the reader's time

- **`TDD-0001`'s "no enumeration" claim is checked against the body with whole-line comments
  removed.** One of the need names is the English word `test`, so a raw substring check over the
  whole body reddens on a comment that explains the rule. Only whole-line comments are stripped, so
  a name in a **trailing** comment still fails — a stricter rule than the obligation, chosen because
  the looser one cannot be written without a JavaScript parser, and because a trailing comment
  naming a need sitting beside the code that would use it is indistinguishable from the enumeration
  this row removes.
- **`TDD-0005` tests five near-miss tokens, not one.** The rule is that the accepting set is
  **closed**, not that a known-bad list is rejected, and one unknown token cannot tell those apart —
  a denylist containing `neutral` would pass that test. The five are a real GitHub conclusion the
  verdict does not accept (`neutral`), a case variant (`SUCCESS`), a whitespace variant
  (`success `), the empty string, and a need with no `result` key at all. The empty needs map is
  asserted separately: "no job result was observed" is the strongest form of "nothing was verified".

### A validator defect this change surfaced, filed rather than worked around

Creating the test file raised `validate --profile tdd` from `warning=352` to `warning=369`, and
**12 of the 17 new `TDDLIST_STALE_STATUS` warnings are false** — they name rows whose test does not
exist. Cause: `selectorResolves` falls back to containment of the selector's last identifier-shaped
token, which in this repository's house style is an ordinary English word (`removed`, `open`,
`only`, `name`, `set`). The rule's own docblock claims the selector is "what makes this
trustworthy"; under the fallback that sentence is false.

Filed as `CR-20260818-0001` with the per-row measurement. **Consequence to carry**: spec-0017's
warning total is not a stable step-4 baseline while this is open — it moves with the size of
`ownWorkflowTopology.test.ts` for reasons unrelated to the rows being implemented, so the
`TDDLIST_STALE_STATUS` count must be quoted separately rather than folded into a total.

### Gate items NOT satisfied

- **Test-first (gate item 2) was not met.** Recorded above rather than obscured. The RED that was
  observed is admissible, but it was reconstructed after the fact.
- **The two blocking reviewer verdicts are not yet obtained** for these rows.

`Status` is `refactor` for all five: implemented, not review-closed.

### TDD-0001

`TC-0017-0001` (AC-0017-0001 / EX-0017-0001, `integration`). RED mode `assertion` — CLAIM 2 reddened
against the seam; CLAIM 1 proven by `O2`. Both halves matter: CLAIM 1 is textual (no name appears in
the code), CLAIM 2 is behavioural (a need this repository has never declared still drives the
verdict), and only the second is immune to a body that renames its variables.

### TDD-0002

`TC-0017-0002` (AC-0017-0001 / EX-0017-0003, `unit`). RED mode `assertion`: `failure` and
`cancelled` each returned 0 against the seam and each returns 1 against the real body, with the
state named in the output.

### TDD-0003

`TC-0017-0003` (AC-0017-0001 / EX-0017-0005, `boundary`, `integration`). RED mode `assertion`. The
"set difference is empty" obligation is measured rather than argued: each of the six declared needs
is forced to `failure` in turn and must drive the verdict to 1 **and** be named in the output. A
need outside the derivation would leave the verdict at 0 for its own iteration only — a leak no
text-level check can see.

### TDD-0004

`TC-0017-0004` (AC-0017-0002 / EX-0017-0002, `unit`). RED mode `falsifiability`, for the structural
reason recorded above. Oracle `O1`.

### TDD-0005

`TC-0017-0005` (AC-0017-0002 / EX-0017-0003, `boundary`, `unit`). RED mode `assertion`: all five
near-miss tokens and the empty map returned 0 against the seam and return 1 against the real body.
