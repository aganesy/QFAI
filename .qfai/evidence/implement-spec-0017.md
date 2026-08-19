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

## Change 2 — own-tree hardening (TDD-0014, TDD-0019, TDD-0021, TDD-0022, TDD-0024)

`10_Plan.md` step 2: per-job permissions, `persist-credentials: false` on every checkout step, and
every action reference pinned to a full SHA. Mechanical and wide; no topology change. Base revision
`08214aeb`.

### The baseline, measured before any edit — and the spec's own figures reproduce exactly

```text
jobs                     12   permission block reachable   4    declared  2
checkout steps           11   persist-credentials: false   0
full-history jobs         3   ci.yml::lint, release.yml::verify, release.yml::gate
uses references          21   pinned to a full SHA         0
```

`BR-0017-0014`'s Notes say "2 of 12 declare, 4 of 12 reach. The gap this spec closes is 8 jobs, not
10." Both halves reproduce: the two declarations are `release.yml`'s `github-release` and `publish`,
and the four reachable are `release.yml`'s jobs, which inherit its workflow-level block. A spec figure
reproducing to the digit is worth recording, because most of this slice's rework has come from figures
that did not.

### One measurement decided a change the plan did not spell out

`BR-0017-0019` names **two** jobs as legitimately needing full history — the lint lane's pair-changed
diff and the release workflow's verification job — and the tree had **three**. Rather than assume the
rule undercounted or that the third was needed, I measured what the third job runs:

- `release.yml`'s `gate` runs `pnpm ci:gate`, which is `sync:ssot` + a WORKING-TREE
  `git diff --exit-code` + `format:check` + `lint` + `lint:md` + `check-types` + `check-bidi` +
  `check-instructions-size` + `check-build-warnings` + the package tests + `verify:pack`.
- **`ci:gate` does not include `check-prompt-scanner-pair.mjs`** — that is `ci:lint`'s member, and it
  is the only history-dependent one in either aggregate. Grepping the remaining members for `origin/`,
  `rev-list` and `git log` returns nothing; `sync-init-to-root.mjs`'s only match is inside a comment,
  and `check-build-warnings.mjs`'s two `spawnSync` hits run the build.
- The job also checks out a pinned SHA (`needs.verify.outputs.sha`), so there is no base ref to reach.

So the rule's count was right and the tree carried an unnecessary full clone on a release-path job.
`fetch-depth: 0` was removed from `gate`. Recorded at this length because it is the one edit in change
2 that is not mechanical, and because the safe-looking alternative — leaving it and weakening the
row's assertion to "at least two" — would have made the row unable to detect the case it exists for.

### RED

- **RED command**, from `packages/qfai`:
  `./node_modules/.bin/vitest run tests/scripts/workflowHygiene.test.ts`
- **RED result**: `Tests 4 failed | 1 passed (5)`, exit 1. Four assertion failures, each inside its own
  row's `describe`, each naming the predicate its row owns:

```text
workflowHygiene.test.ts:223:8  every own-CI job must have a permission block reachable from it
workflowHygiene.test.ts:254:8  every checkout step must set `persist-credentials: false`
workflowHygiene.test.ts:276:8  full history belongs to the lint lane's pair-changed diff and the
                               release verification job, and to no other job
workflowHygiene.test.ts:309:8  every action reference must be pinned to a full commit SHA
```

  Admissible on all four of `red-admissibility.md`'s criteria: the module loads (the fifth test
  collected and passed), every failure is an assertion inside its row's own selector, every message
  names the row's predicate, and deleting the assertions would make the run pass.

- **`TDD-0024` passed at RED, and that is structural rather than accidental.** Its two claims —
  `.github/` is outside `package.json#files`, and the leakage guard exits 0 — were both true before
  the pins landed and are both true after. The row is a **regression guard**: its value is that the
  claims survive the arrival of trailers that look exactly like the version markers the guard forbids.
  `RED failure mode: falsifiability`, with `P5a`/`P5b` below standing in for the RED pair.

### The production change

- `ci.yml`: workflow-level `permissions: { contents: read }`; `permissions: {}` on `ci-pass`;
  `persist-credentials: false` on all six checkout steps; seven references pinned.
- `qfai-validate.yml`: workflow-level `permissions: { contents: read }`; the flag on its one checkout
  step; two references pinned. (This file is deleted at change 7; it is hardened now because it is in
  the tree now, and a row that skipped it would be asserting over a subset.)
- `release.yml`: the flag on all four checkout steps; six references pinned; `gate`'s `fetch-depth: 0`
  removed.

Pins, each with the semver tag it resolves to, taken from the GitHub API:

```text
actions/checkout         11d5960a326750d5838078e36cf38b85af677262   v4.4.0
actions/setup-node       49933ea5288caeca8642d1e84afbd3f7d6820020   v4.4.0
actions/upload-artifact  ea165f8d65b6e75b540449e92b4886f43607fa02   v4.6.2
```

**Pinned, not upgraded.** All three are `v4` while the current majors are `v7`. Change 2's obligation
is `BR-0017-0010`'s "every reference is a full-SHA pin", and upgrading three majors is a different
decision with its own compatibility surface. Recorded so the gap is visible rather than discovered
later as a surprise.

### GREEN

- **GREEN command / result**: the same file-scoped command — `Tests 5 passed (5)`, exit 0.
- **Post-change measurement**: jobs 12, reachable **12**, declared 3; checkout steps 11 with the flag
  **11**; full-history jobs exactly `ci.yml::lint` and `release.yml::verify`; `uses` 21, floating **0**.
- **`Refactor verify`**: the same command after the prettier pass and the comment repair below —
  `Tests 5 passed (5)`, exit 0.
- **Sibling suites**: `tests/scripts/**` plus `shippedWorkflowShapeGate` — `Test Files 9 passed (9)` /
  `Tests 87 passed (87)`, exit 0. `ci:lint` exits 0 across all ten members.

### Oracle proof — one mutation per row, each reddening exactly one

Base revision `08214aeb` plus change 2's uncommitted edits; needles literal, occurrence counts
measured, restoration byte-compared and confirmed with `git diff --exit-code`.

| id | row | file | mutant | reddens |
| --- | --- | --- | --- | --- |
| `P1` | TDD-0014 | `ci.yml` | `9232ee34` | `:223:8` — the workflow-level block is removed, so every inheriting job loses reachability |
| `P2` | TDD-0019 | `ci.yml` | `79ae81d6` | `:254:8` — the flag deleted from exactly one checkout step |
| `P3` | TDD-0021 | `release.yml` | `d5ccf147` | `:276:8` — full history returns to a third job |
| `P4` | TDD-0022 | `ci.yml` | `3af46a42` | `:309:8` — one reference floats back to a major-version tag |
| `P5a` | TDD-0024 | `packages/qfai/package.json` | `db85df2e` | `:335:8` — `.github` enters the distributed surface |
| `P5b` | TDD-0024 | `assets/init/root/DESIGN.md` | `d4f20c19` | `:349:8` — a version marker planted INSIDE the surface, so the guard exits 1 |

Every one is `Tests 1 failed | 4 passed (5)`. `TDD-0024`'s two claims are killed separately: `P5a` the
structural half (why the trailer is legal), `P5b` the behavioural half (that the guard actually
passes). `P5a` mutates `package.json` rather than a workflow because that file **is** the row's
subject — the trailers are legal only while `.github/` stays out of `files`.

### `TC-0017-0016` is absent, and routed rather than guessed

`BR-0017-0016` says exactly two permission blocks depart from "the minimal-scope default". Measured,
the tree already holds a third the rule never names: `github-release`'s `contents: write`. And
"minimal-scope default" has two readings the pack does not choose between — a fixed `contents: read`
literal (count three, rule wrong) or each job's own minimum (count two, term undefined). A `boundary`
row exists to fix where a rule stops, and this one is ambiguous at exactly that point, so writing it
would encode my reading of an undefined term as a hard assertion. Filed as `CR-20260818-0007` with
`TDD-0016` as its blocked set.

### A sibling row caught my prose, and it was right to

The full package suite went red on `shippedWorkflowPins.test.ts`, not on anything change 2 asserts.
That row scans **every** `.ts` file under `packages/qfai/tests`, line by line, for a floating-major
action reference and forbids it — because a surviving expectation of that form would demand the
un-pinned tree back. My new test file carried one in a COMMENT, as an example of what the pin rule
rejects.

The scan is comment-blind on purpose; its own docblock records that the class escaped a file-scoped
scan once. So the prose was reworded to describe the forbidden forms rather than write them, and the
reason is now recorded beside the assertion. A gate that fires on prose is annoying exactly once and
protects a real invariant; weakening it to make room for a comment would have been the wrong trade.

### The step-4 aggregate got WORSE, and my earlier prediction about it was wrong

I told the user that implementing spec-0017 rows would reduce the twelve false `TDDLIST_STALE_STATUS`
positives that block spec-0006's checkpoint clause 3. **That was wrong, and the correction is
measured**: creating `workflowHygiene.test.ts` took the count from 16 to **36**, `warning` from 364 to
384. Advancing this change's five rows past `todo` returns five of them, leaving 31.

Attributed: spec-0003 **1**, spec-0012 **3**, spec-0017 **32**. Of the spec-0017 ones checked against
the new file, **5 resolve verbatim** (this change's own rows, correctly firing while their `Status` was
still `todo`) and **23 resolve only through the last-token fallback** — false positives, the same
mechanism `CR-20260818-0001` documents, from a single file.

The direction of the effect is the opposite of what I said: a row advancing past `todo` clears its own
warning, but a new test file adds one for every remaining `todo` row whose selector's last token
appears anywhere in it. With 72 rows still `todo`, each new file adds more than the rows it closes
remove. The net only turns downward near the end of the spec. `CR-20260818-0001`'s "monotone in file
size" claim is now measured twice, at +12 and +20.

**Consequence carried:** spec-0006's four parked rows are blocked by checkpoint clause 3, and this
change moved that aggregate further from its baseline rather than closer. That is recorded in
`CR-20260818-0006`, and it is the strongest argument in it: a clause that reads an unattributed total
makes progress in one spec into an obstacle for another.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained for these five rows. `Status` is `refactor`:
implemented, not review-closed. The item-12 checkpoint is not attempted, because step 4 cannot pass
while clause 3 reads a total this change increased.

## Change 3 — the hygiene lane (TDD-0015, TDD-0017, TDD-0018, TDD-0020, TDD-0023)

`10_Plan.md` step 3: the script, its fixtures, and the `ci:lint` registration. Lands after change 2
so it is green on arrival — and it is: run against the real tree it exits 0 and prints its rule set.
Base revision `a8a9e4e3`.

### The rows above assert properties of the tree; these assert the LANE's verdict

Change 2's five rows parse `.github/**` and measure it. These five run the script and read its exit
code and output. That is a different observation and it needs the script to exist, which is why they
are change 3's and were deliberately absent from change 2's file rather than stubbed there.

### Violations are planted into a COPY, never into `.github/`

Every planted-violation row copies the own `.github` tree into a temp directory, mutates the copy, and
points the lane at it with `--root`. Two reasons, and the second decided it: a mutation in the shared
working tree produced a false red for a concurrent reviewer earlier in this branch's history, and a
test that edits the repository it runs inside leaves that repository broken if it dies between the
edit and the restore. The `--root` flag exists for this and for nothing else.

`runLane` maps a signal death to `-1` rather than to `1`. Without that, a lane that CRASHED would
satisfy every row asserting exit 1 — which is exactly how a missing script would have passed them.

### RED, and a seam that had to be fixed before it was a seam

`red-admissibility.md` § "Step 3a" requires a minimal seam so the first failure is an assertion rather
than a missing module. The first seam called `process.exit(0)` at module scope — and `TDD-0015`
IMPORTS the lane to compare its two counters, so the import killed the test process and that row
failed with `process.exit unexpectedly called`. A load-level failure: precisely what the seam exists
to avoid. The exit moved behind an entry-point guard, which the shipped lane keeps.

- **RED command**, from `packages/qfai`:
  `./node_modules/.bin/vitest run tests/scripts/workflowHygiene.test.ts`
- **RED result**: `Tests 4 failed | 6 passed (10)`, exit 1 — `TDD-0015`, `TDD-0017`, `TDD-0020` and
  `TDD-0023`, each failing on an assertion inside its own `describe`, with no load error. The six
  passing are change 2's five plus `TDD-0018`.
- **`TDD-0018` passed at RED, structurally.** It asserts the ACCEPTING direction — a compliant tree
  exits 0 — and a no-behaviour seam exits 0. No seam can redden an accepting-direction row; only a
  mutation that makes the lane reject something can. `RED failure mode: falsifiability`, with `Q1`.

### The lane

`scripts/check-workflow-hygiene.mjs`, three rules over the own tree:

```text
permissions-reachable   every job has a permission block reachable from it (job or workflow)
checkout-credentials    every checkout step sets persist-credentials: false
action-pin              every `uses:` reference is a full 40-hex commit SHA
```

Four design points worth the reader's time, each forced by something measured rather than chosen:

- **On success the lane PRINTS its rule set, and names what it does not cover.** The contract requires
  that in those terms: `OQ-0017` deferred adopting an external workflow linter, and the deferral is
  "only honest while the coverage boundary is visible". So a green run reads as a list of checks
  rather than as a blanket assurance, and it says out loud that the shipped set, runner labels, secret
  references and the required-context declaration are elsewhere.
- **`yaml` is resolved through `createRequire` from the workspace, not imported by name.** Every other
  root script imports `node:*` built-ins only, and a bare `import ... from "yaml"` here fails with
  `ERR_MODULE_NOT_FOUND` — measured, not guessed. `scripts/check-review-profile-consistency.mjs`
  already solves this the same way and records the reason (pnpm hoists `yaml` under the qfai
  workspace), so this follows the repository's own precedent rather than adding a root dependency.
- **`process` is imported from `node:process`.** The root eslint config declares no Node globals for
  `scripts/*.mjs`, so a bare `process` is nine `no-undef` errors. Two existing root scripts import it
  explicitly; this uses the named form one of them already uses.
- **A local `uses: ./...` reference is exempt from the pin rule.** It resolves inside the repository at
  the same commit, which is the property pinning buys — so demanding a SHA there would reject the
  composite action change 4 introduces. Written now because the exemption is invisible until that
  change lands and would otherwise look like an oversight.

A malformed workflow is reported as a finding rather than crashing the lane: a parse error that
surfaces as a stack trace reads as a broken tool, and the operator is then not told which file to
look at.

### GREEN

- **GREEN command / result**: the same file-scoped command — `Tests 10 passed (10)`, exit 0.
- **The lane against the real tree**: exit 0, printing the three rules and the not-covered list.
- **`ci:lint`**: exit 0, and the lane is now its **eighth** member of **eleven**.

### `ci:lint` has eleven members now, and the count is maintained in one place

The lane is registered between `check-prompt-scanner-pair` and the package-scoped members, so the root
`check-*.mjs` scripts stay contiguous and a failure in the cheap own-tree scan surfaces before a
vitest run.

The member count appears in roughly seventeen statements across this repository. **One** of them is a
live operational rule — `.qfai/steering/2026-08-09-chg-007-implementation-standing-brief.md` §4 — and
that one is updated, with the date and the reason. The other sixteen are revision-stamped records in
`.qfai/evidence/**` of measurements that were true when taken; those are NOT corrected, because
rewriting a dated observation destroys an audit trail rather than fixing it. The brief now says so, so
a reader comparing an old evidence line against a fresh run knows the difference is this member and
not a regression.

The generalisation is the one this slice has already paid for twice: **a count is maintained at one
site or it is not maintained.** The member inventory in `workflowsIntegrity.ts` had its numeral deleted
for exactly this reason. Here the numeral survives because the list IS the rule — but it lives in one
place.

The existing `ci:lint` placement pin (`shippedWorkflowShapeGate.test.ts`, TDD-0050 of spec-0003) uses
`toContain` rather than equality, so adding a member does not redden it. Checked before editing, not
after.

### Oracle proof — one mutation per rule, plus the one the business rule forbids

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `Q1` | TDD-0018 | `e44736e7` | `:498:10` — the judging rule counts DECLARATION instead of reachability |
| `Q2` | TDD-0015 | `e3cf06bc` | `:444:90` and `:498:10` — the reachability counter drops its workflow half |
| `Q3` | TDD-0017 | `fef3e48b` | `:473-476` — the permissions rule dropped from the lane |
| `Q4` | TDD-0020 | `5f6f25c6` | `:537-540` — the checkout-credentials rule dropped |
| `Q5` | TDD-0023 | `ba560f82` | `:559-563` — the action-pin rule dropped |

**`Q1` is the one worth reading.** It substitutes the declaration-only counter for the reachability one
inside the rule that judges — the exact substitution `BR-0017-0014` forbids, "because it cannot
falsify a requirement written against reachability". The row it reddens is `TDD-0018`, the
accepting-direction row, and that is the only place it COULD be caught: a tree that satisfies
reachability but not declaration is compliant, and only a row asserting that compliant trees pass will
notice the counter that rejects it. The business rule and the row it needs are matched.

`Q2` reddens two rows rather than one, correctly: collapsing the reachability counter onto the
declaration counter breaks both the row that compares them and the row that depends on the difference.

### The full suite, and why it is reported per project

**It could not be taken as one clean run on this machine at this moment, and the figure is given as
measured rather than as remembered.** Two whole-suite runs failed six and then nine files; every
failure was a TIMEOUT (15s, 16s, 120s), and the failing SET differed between the two runs. Nine stray
`node` processes: zero, checked. `dist` was stale and was rebuilt between the runs, which changed the
figure but not the shape.

Per project, run sequentially so peak contention falls:

```text
core          1587 passed |  2 skipped (1589)
validators     351 passed             (351)
integration    861 passed | 19 skipped (881)   + 1 timeout, see below
e2e            889 passed | 16 skipped (905)
cli            321 passed             (321)
unit           266 passed             (266)
scripts         85 passed              (85)
```

The one failure is `tests/integration/shippedWorkflowDetection.test.ts` — `TC-0003-0039`'s "all three
degraded cases exit 0" — timing out at 15000ms. It builds shallow git clones, so it is I/O-heavy. Run
in isolation it is `Tests 10 passed (10)` **twice out of two**. It belongs to spec-0003 and change 3
touches nothing it reads.

So: a contention flake, disproved by isolation rather than filed as a defect — which is the response
the steering entry prescribes after a heavy parallel dispatch produced a false nondeterminism report
once before. What is NOT claimed here is a clean whole-suite pass, because I did not get one.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained for these five rows. `Status` is `refactor`. The
item-12 checkpoint is not attempted, and now for two reasons rather than one:

1. Step 4 cannot pass while clause 3 reads an unattributed total that spec-0017's own test files keep
   raising — `CR-20260818-0006`.
2. Step 2 of the command set is the FULL suite with no filter, and it has to exit 0. It does not on
   this machine under load. A per-project decomposition is a stronger measurement in one sense — it
   names which project holds the failure — but it is not the command the reference asks for, and
   substituting it silently would be the kind of near-miss this slice has been repeatedly corrected
   for. Recorded as unmet.
