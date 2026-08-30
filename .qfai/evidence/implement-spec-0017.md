# Implement evidence — spec-0017 (layered CI scaffold, own toolchain)

Per-item TDD evidence for spec-0017. One `### TDD-NNNN` section per ledger row; the ledger's
`Evidence` cell is a POINTER into this file and never carries the payload.

Recorded under `CR-20260817-0002` Option A: **revisions, not blob enumerations.** A blob is derived
state (`git rev-parse <rev>:<path>`), and a written blob diverges from its source whenever rows
share a file — which is the normal case here, because this spec's ledger points **all 82 rows at one
test file**. The one exception is a **mutant** blob, which no revision determines; those are recorded
as base revision + literal needle + literal replacement, with the mutant hash kept.

## Objective

Implement `spec-0017` — the layered CI scaffold for QFAI's own toolchain, and the same scaffold in
the workflow templates QFAI ships, so adopters receive it rather than rebuilding it. Eighty-two
ledger rows across nine sequenced changes fixed by `DR-0017-0005`.

Three things this record is answerable for, stated so a reader can check them rather than infer
them:

1. **Every promoted row carries falsifiable evidence.** Not "the test passes" — a RED that failed on
   an assertion, a GREEN that reproduces, and an oracle round showing the smallest production change
   that reddens it again. Where a row could not have a natural RED, the falsifiability trio in its
   place.
2. **Nothing is claimed that was not measured.** Counts, durations and gate outputs are quoted from
   runs recorded here. Where a number moved after it was written, both are kept and dated.
3. **Where the spec and the tree disagree, a change request is filed rather than resolved.** Seventeen
   are open. Six rows are `blocked`, on **three** of them — `CR-20260818-0007`,
   `CR-20260820-0001` and `CR-20260820-0007`. ("Four" stood here and was wrong; counted.)

## Items processed

Generated from `.qfai/specs/spec-0017/tdd/test-list.md` at `0066c29c`, not maintained by hand —
a second copy of 82 statuses would be a second thing to keep in sync, and this section
exists so a reader does not have to open the ledger to see the shape.

| Status     | Count | Rows |
| ---------- | ----- | ---- |
| `refactor` | 74 | 0001-0015, 0017-0029, 0031, 0036-0068, 0071-0082 |
| `blocked` | 6 | 0016, 0030, 0032-0035 |
| `todo` | 2 | 0069-0070 |

Total: **82** rows, one per test case in `06_Test-Cases.md`. Every row's `TC-Refs` is
its own `TC-0017-NNNN`; no row carries `US-Refs` or `CON-API-Refs`, because no row is
`Layer = E2E` or `Layer = API`.

**`blocked` rows and what each waits on:**

| Row | TC | Waiting on |
| --- | -- | ---------- |
| `TDD-0016` | `TC-0017-0016` | CR-20260818-0007 |
| `TDD-0030` | `TC-0017-0030` | CR-20260820-0001 |
| `TDD-0032` | `TC-0017-0032` | CR-20260820-0007 |
| `TDD-0033` | `TC-0017-0033` | CR-20260820-0007 |
| `TDD-0034` | `TC-0017-0034` | CR-20260820-0007 |
| `TDD-0035` | `TC-0017-0035` | CR-20260820-0007 |

**`todo` rows and what each waits on:**

| Row | TC | Waiting on |
| --- | -- | ---------- |
| `TDD-0069` | `TC-0017-0069` | data that does not exist yet — see the row's `Evidence` cell |
| `TDD-0070` | `TC-0017-0070` | data that does not exist yet — see the row's `Evidence` cell |
## The merge moved the contract past this record

**Added 2026-08-20, immediately after merging `origin/main`.** This is the largest single change to
what the work must satisfy, and it did not come from a review — it came from 202 commits of upstream
contract work landing on the branch. Measured rather than described.

### Seventy-one of eighty-two rows are now governed by a handover that never happened

Merged `SKILL.md`, Phase Red step 3b:

> **A `todo` `E2E` / `API` / `Integration` row consumes the provenance `/qfai-atdd` recorded; steps 4
> and 5 do not apply to it.** […] For a `todo` row, verify its entry in
> `.qfai/evidence/atdd-<spec-id>.md` **first**, then write the status the verified branch calls for,
> per `../qfai-atdd/references/red-provenance.md#handover-to-qfai-implement`.

```text
ledger rows by Layer      Integration 71    Unit 11
.qfai/evidence/atdd-spec-0017.md          does not exist
```

So on the merged contract, **71 rows should have had their RED produced by `/qfai-atdd` and recorded
in an evidence file that does not exist**, and this skill should have verified that entry rather than
observing a RED itself. Every RED in this record for those rows was taken here, by the skill the
merged text says does not take them.

The eleven `Unit` rows are unaffected: steps 4 and 5 still apply to them, and their evidence is in the
right place.

### Six field classes the merged contract names and this record does not carry

| field                        | named in merged `SKILL.md` | present here |
| ---------------------------- | -------------------------- | ------------ |
| `RED test hash` (+ manifest) | yes                        | **no**       |
| `RED revision`               | yes                        | **no**       |
| `Falsifiability revision`    | yes                        | **no**       |
| `Replacement proof revision` | yes                        | **no**       |
| `Round N:` prefixed fields   | yes                        | **no**       |
| `Audited evidence hash`      | yes                        | **no**       |

`Oracle proof` and `Revision` are present. The rest are not, and three of them —
`Falsifiability revision`, `RED test hash`, `Audited evidence hash` — address states that no longer
exist: a mutated tree that was reverted, a test file that has been rewritten twice since, a
phase-authored entry the gatekeeper would have hashed at the time. They cannot be back-filled
truthfully.

### And Phase Green gained an ordering this record does not meet

> 2. Run the test and **watch it pass**. Do not submit it yet: `qa-gatekeeper` requires an
>    `Oracle proof` on every item, so a GREEN submitted before step 2a has produced one is a REVISE by
>    construction.
>    2a. **Run the `Oracle proof` and record it here, before the submission in step 2.**

Every oracle in this record was run **after** its GREEN, and several were run rounds later — the
`TDD-0008` rounds were added in round 5 because a review found the row had none. On the merged
contract that ordering is "a REVISE by construction".

### What this does to the open change requests

Three were written against text the merge replaced, and I am not applying their recommended options
until each is re-read against the merged rules:

- **`CR-20260820-0009`** (35 rows cite an aggregate run). Step 4's sentence survives the merge, but
  step 3c reframes what "aggregate" means: "a `Selector` may legally hold a comma-separated list or a
  glob, and one aggregate run shows the first entry failing while the rest are unobserved". That
  reads as a rule about a Selector with SEVERAL ENTRIES, not about a file-scoped run covering several
  rows. Every Selector in this spec holds one entry. So the CR's premise may be the same class of
  mistake `CR-20260820-0008` made — a rule read wider than it is written — and it is flagged rather
  than defended. It also matters less: step 4 does not apply to 71 of the rows at all.
- **`CR-20260820-0010`** (spec completion requires a `Layer = E2E` row per `US-*`). That condition is
  **absent from merged `SKILL.md`**. The contradiction it files appears to be resolved upstream, and
  the CR should be closed as superseded once that is confirmed against the merged completion
  conditions rather than against its absence alone.
- **`CR-20260820-0008`** was already superseded by `CR-20260820-0009` before the merge.

### Why this is recorded here rather than repaired

Because the repair is not a record edit. Seventy-one rows would need their RED provenance produced by
a different skill, into a file that does not exist, with four field classes that address trees which
no longer exist. That is a re-run of the acceptance-test stage for this spec, not a correction to
this evidence file — and deciding whether to do that, or to close the spec against the contract as it
stood when the work was done, is not a decision an implementer takes on its own.

What is true and worth stating plainly: **the work is sound against the contract it was done under,
and the contract has moved.** Both halves matter. The tests pass, the oracles redden, the scaffold
now runs in GitHub Actions — and the evidence shape the merged skill requires is not the shape this
record has.

## The scaffold has never executed in GitHub Actions

**Added 2026-08-20.** Measured, because it is the largest thing this record does not say:

```text
gh pr list --head feature/chg-007-layered-ci-scaffold      ->  []
gh run list --branch feature/chg-007-layered-ci-scaffold   ->  (no runs)
```

No pull request, and **zero workflow runs**. Two hundred commits of layered CI scaffold have never
been dispatched by GitHub.

### What that means for everything above

Every verification in this record is local, and each one verifies something real but none of them
verifies the thing itself:

| verified                                                             | how                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------- |
| the workflow's job topology, `needs` closure and check-name set      | parsed as YAML and asserted                                |
| the change classifier's decisions                                    | extracted from its quoted heredoc and executed on this machine |
| the aggregate verdict's logic                                        | extracted and executed against synthetic `needs` maps      |
| the hygiene lane, the leakage guard, the shipped-tree scan            | run directly                                               |
| every test slice, and the whole suite                                | run                                                        |

What is **not** verified, because it cannot be locally:

- that GitHub accepts these files at all — a workflow that fails to parse on their side is reported
  as a failed run, not as a lint error here;
- that the `detect` job's `full` output actually reaches the `if:` conditions on four jobs. The
  classifier's decision is tested; the plumbing from `$GITHUB_OUTPUT` through
  `needs.detect.outputs.full` is not;
- that the matrix dispatches seven legs with the check names `TC-0017-0043` pins. Those names are
  asserted against the file, never against a run;
- that `actions/upload-artifact` accepts the retention and if-no-files-found settings, and that the
  build produced once is downloadable by the legs that would consume it;
- that `ci-pass` reports the verdict branch protection would read;
- the runtime cost the parallelism work exists to reduce. `TDD-0065`'s timing artifact measures THIS
  machine at fourteen logical CPUs. A GitHub runner has two, and every worker-count conclusion in
  that artifact is about hardware the scaffold will not run on.

### Two rows are blocked on precisely this

`TDD-0069` needs three consecutive green aggregate-verdict runs with their identifiers quoted;
`TDD-0070` needs post-merge default-branch history to measure a rerun-to-green rate. Both are `todo`
with the reason in their `Evidence` cells, and both become implementable the moment a pull request
exists and CI runs. They are not blocked by a Change Request — they are blocked by the absence of a
run.

### Why it is recorded rather than fixed

Opening a pull request is outward-facing: it makes this branch visible, starts CI on the user's
account, and can trigger notifications and review requests. It is the user's call, not the
implementer's, and it is put to them rather than assumed.

Stating it as a gap rather than a caveat because the distinction matters. A caveat would say "CI has
not run yet, which is normal for an unmerged branch". The stronger and truer statement is that the
central deliverable of this spec — a layered CI scaffold, and the same scaffold in the templates QFAI
ships — has never been observed doing its job, and no amount of local verification substitutes for
one run.

## What the `mutant` column holds, and what it does not

**CORRECTION (2026-08-20, after the gatekeeper's blocking finding.)** The sentence above says "with
the mutant hash kept", which reads as a hash you can look up. You cannot. Every value in the
`mutant` column of every oracle table below was produced by `git hash-object` **without `-w`**, so it
was computed and never written to the object database. Measured:

```text
git cat-file -t 9232ee34   -> fatal: Not a valid object name 9232ee34
git cat-file -t f9c12a13   -> fatal: Not a valid object name f9c12a13
git cat-file -t 34b1da53   -> fatal: Not a valid object name 34b1da53
git cat-file -t de01ef97   -> fatal: Not a valid object name de01ef97
```

So the column is a **fingerprint, not an address**. What it is still good for, verified rather than
asserted:

```text
printf 'x=1\n' > a; git hash-object a   -> bafc5d9a1a836cea09dadcec13e66fe498cd997a
git cat-file -t bafc5d9a...             -> fatal: could not get object info
printf 'x=1\n' > b; git hash-object b   -> bafc5d9a1a836cea09dadcec13e66fe498cd997a   (identical)
```

A reader who reconstructs the mutant from **base revision + literal needle + literal replacement**
and runs `git hash-object` on the result gets the recorded value back if and only if the
reconstruction is byte-identical. That makes the column a check on the reconstruction and on this
record's transcription — which is worth keeping — and it makes `git cat-file` on it fail, which is
worth saying rather than leaving a reader to discover.

The needle and the replacement are therefore the load-bearing record, exactly as
`references/oracle-strength.md` asks. The hashes are not retracted, because they are not wrong; the
claim that they can be retrieved is what was wrong.

> **Narrowed 2026-08-20 after round 5.** `qa-gatekeeper` observed that "the needle and the
> replacement are the load-bearing record" holds for **one** of the sixteen oracle tables below —
> change 1's, which quotes literal needle and replacement text. The other fifteen record a mutation
> DESCRIPTION plus the assertion locations it reddened, and no literal bytes. For those, the
> fingerprint has nothing to be recomputed from and is inert: a reader cannot reconstruct the mutant
> from "the required-context job is renamed" alone.
>
> So the honest statement is narrower than the one above. Where literal bytes are recorded, the
> hash checks a reconstruction. Where only a description is recorded, the load-bearing record is the
> **assertion locations** — which row reddened, at which line and column — and the hash is a
> provenance stamp on bytes that no longer exist anywhere.
>
> **Narrowed once more, 2026-08-20 after round 6.** `qa-gatekeeper` went a step further and it is
> right: the one table that records literal needle and replacement text records its mutant column
> as `(uncommitted tree)`, with **no hash at all**. So literals and hashes never co-occur anywhere
> in this record, and the fingerprint is inert in **all sixteen** tables rather than in fifteen.
> There is no table where a reader could recompute the hash from the bytes, because the only table
> with bytes has no hash to recompute.
>
> What survives, and it is less than the paragraph above implied: the assertion locations and the
> mutation descriptions are the whole record. The hashes are provenance and nothing more.

## Cross-spec obligations

**Added 2026-08-20, after review finding B3; put into the contract's field form after BL-9.**
This record described spec-0017 as though it were the only spec this branch touches. It is not, and
an auditor of the other spec cannot see the connection from their side.

`references/cross-spec-ownership.md` fixes seven fields per affected spec. The first version of this
section carried five of them in prose and named no row of THIS spec at all, so the link ran one way.
Stated as the contract asks:

| Field                | Value                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `TDD-ID`             | `TDD-0006` … `TDD-0012` — change 8, change detection and lane selection in the OWN workflow. The parallelism work these rows sit inside is what forced the edit |
| `Blocked spec`       | `spec-0003`                                                                              |
| `Blocked TDD-IDs`    | `TDD-0038`, `TDD-0039`, `TDD-0040` (`TC-0003-0038` … `TC-0003-0040`)                       |
| `File`               | `packages/qfai/tests/integration/shippedWorkflowDetection.test.ts`                        |
| `Change required`    | the degraded-case fixture set is built once per describe instead of once per `it()`, the shipped orchestrator is parsed once per worker, and commit identity is passed as `-c` flags rather than three `git config` spawns |
| `Obligation at risk` | `TC-0003-0039` asserts that a shallow clone and an unreachable base ref each fail open with a warning, judged over three fixtures the row previously built INDEPENDENTLY per case. They now share one run, so the three cases no longer demonstrate that fixture construction is repeatable, and a failure while building fails all three together |
| `Resolution`         | `re-reviewed` — round 5's `completion-reviewer` intersected the whole run range against all seventeen ledgers, found exactly this one file, and confirmed the obligation holds |

**This spec's side, in prose.** `TDD-0006` through `TDD-0012` are the rows a reader of the other spec
needs to be pointed at.

`spec-0003`'s `TDD-0038`, `TDD-0039` and `TDD-0040` — `TC-0003-0038` through `TC-0003-0040`, the
shipped orchestrator's change detection, fail-open selection and verdict job — live in
`packages/qfai/tests/integration/shippedWorkflowDetection.test.ts`, a file that exists only on this
branch. It was created by commit `56b34b94` in an earlier session, with all three blocking reviewers
returning PASS, and those three rows reached `done` there. Nothing in that is this spec's business.

What IS this spec's business is that **commit `dd894914`, made under spec-0017, edited that file
after those rows were `done`.** The edit was the structural half of the parallelism work — the
worker value stays ten and the contention was the problem — and it changed how those rows' tests
execute:

| change                    | what it does                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `orchestratorDocPromise`  | the shipped orchestrator is read and parsed once per worker rather than on every call |
| `COMMIT_IDENTITY`         | identity and signing passed as `-c` flags instead of three `git config` spawns per fixture repository |
| `degradedCases()`         | the degraded-case fixture set is built ONCE for its describe instead of once per `it()` |

None of the three touches an assertion. Verified rather than asserted: the diff of `dd894914`
against that file adds a memo, a constant and a getter, and rewrites three `git config` calls into
flags — no `expect` was added, removed or altered.

**The obligation, stated so the other spec's auditor does not have to find it.** The third change
means the three degraded cases now share one fixture run instead of each building their own. Two
consequences that were traded for the time:

1. The three cases are no longer independent. A failure while building the fixture set fails all
   three, and they no longer demonstrate that fixture construction is repeatable.
2. What they read is the run RESULT — status, streams, parsed outputs — which is why memoizing is
   safe where a `beforeAll` would not be: the temp-directory pool deletes its directories in
   `afterEach`, so a `beforeAll` fixture would build repositories that vanish after the first test.

That trade is recorded here because it is a change to another spec's evidence base made under this
one. `TC-0003-0039` is the row that owns the degraded cases, so it is the row the trade most
concerns. Measured effect, which is the reason it was taken: the file went from 22.90s to 5.49s and
the integration slice passes at the declared worker value of ten.

**Not affected, checked rather than assumed:** `spec-0003`'s `TDD-0050`
(`shippedWorkflowShapeGate.test.ts`) and its `shippedWorkflowPins` row are cited in this record as
precedent and constraint — the pins row scans every test file, which is why a fixture literal in
this spec's own tests had to move from `@v4` to `@main`. Citing a row is not editing it, and neither
file was touched here.
## Observation currency, and what the `:line:col` values address

**Added 2026-08-20 after round 5, where `qa-gatekeeper` reported gate item 10 failing for all 74
promoted rows.** It was right, the number is larger than it stated, and the reason is structural
rather than sloppy.

### The measurement

Every `:LINE` and `:LINE:COL` token in the oracle tables below, resolved against the files as they
stand at HEAD:

```text
locators recorded across all sixteen oracle tables   74
landing on an assertion at HEAD                      18
landing on a comment, a string literal, a helper,
  a describe header, or past the end of the file      56
```

Three examples, because "stale" understates what a reader would find:

```text
:1438   recorded for TDD-0038's continue-on-error claim
        now a string literal inside TDD-0043's describe
:1254   recorded for TDD-0041 CLAIM 1
        now a comment inside TDD-0012's describe
:1313   recorded for TDD-0043's pinned check-name set
        now a JSDoc line, 98 lines before the describe it named
```

### Why this happens by construction, and what it does not mean

`evidence-revision.md` is mechanical: "evidence is stale when the revision it names differs from the
revision the item's work finally landed at", and "a commit that changes any file the observation
covered invalidates it". This spec points **all 82 rows at six test files**. So every commit touching
one of those files stales every observation in it — and twenty-four commits on this branch touch
one of the six, and round 5's rework alone touched five of them.

That is not an argument for tolerating it. It is the reason the locators are the wrong thing to lean
on: a position in a file that thirty other rows also edit cannot stay correct, and re-deriving 74
positions after each commit would be work whose product is stale by the next one.

**What is durable is already in the same cell.** Each `reddens` entry names the claim in prose —
`TDD-0038 — no verification item may carry continue-on-error`, `TDD-0036 CLAIM 2 — the
required-context job must carry no condition`. That identification does not move when lines shift,
and it is what a reader greps. Fifty-one of the 74 locators were re-resolved mechanically to the
assertion MESSAGE at the revision each observation ran against, and every one matched the prose the
cell already carried — which is the evidence that the prose, not the number, is carrying the record.
Two of those messages are claimed by more than one locator, which is correct rather than a
collision: two oracle rounds reddening one claim is exactly what `R1` and `R2` do for
`TDD-0036` CLAIM 2. The remaining 23 could not be resolved under a rule tight enough to be
trusted — a window of two lines inside an expect chain — and are left unresolved rather than
guessed, because a wrong message is as misleading as a wrong line.

So the policy, stated rather than left implicit:

- the **prose claim identity** in each `reddens` cell is the durable record of what the mutation
  reddened;
- the `:LINE:COL` value addresses the file **at that block's landing revision**, named in the same
  block as `Base revision` plus the change, and is stale for any later revision by construction;
- neither substitutes for a re-run.

### When the re-run happens

At the revision the rows close at, not now. `evidence-revision.md` prescribes exactly this ordering:
"Measure at the tip, then commit the record and the `done` transition together" — the only ordering
under which several items sharing a file can all be current at once. Re-running the oracle set at
`76ade4dd` would produce 74 fresh positions and stale them at the next code commit, which is the
loop the rule exists to break.

No row is closing on this evidence. All three round-5 reviewers returned REVISE, every promoted row
is at `refactor`, and item 10 is a completion gate rather than a review gate. It is recorded here as
an open, measured obligation with a named discharge point, which is the honest state — not as
something the rework quietly fixed.
## Two corrections that apply across the per-change blocks

**Added 2026-08-20, after the review round.** Both concern statements that were TRUE when written and
are no longer, so neither is edited in place — a per-change block records what was measured at that
revision, and rewriting it would destroy the only evidence of when the situation changed.

### Item-12 step 2 now passes; step 4 is the sole remaining blocker

Blocks from change 4 onward record the checkpoint as unattempted for TWO reasons: step 2 needed an
unfiltered whole-suite run "this machine is not giving", and step 4's clause 3 reads a total that
`CR-20260818-0006` is about. The first of those stopped being true once the structural fix landed —
the fixture builder that was called once per `it()` for identical fixtures. Measured now, unfiltered,
from `packages/qfai`:

```text
pnpm test
  Test Files  431 passed | 8 skipped (439)
       Tests  4424 passed | 37 skipped (4461)
    Duration  193.08s
  exit 0
```

> **Re-measured 2026-08-20 after round 5.** `qa-gatekeeper` reported 4426 against this block's 4424
> and was right: three commits landed after the run above, each adding a claim. Confirmed by
> re-running the same command — `431 passed | 8 skipped (439)`, `4426 passed | 37 skipped (4463)`,
> exit 0. The measurement above is left as taken and dated rather than overwritten, because a count
> that moves with the tree is a fact about a revision and not about the suite. Step 2 passes at
> both.

So step 2 passes. **Step 4 remains, and it is the only one.** Its clause 3 reads an unattributed
aggregate — `QFAI-ATDD-112` still names TCs from `spec-0003`, `spec-0008` and `spec-0015`, and
`QFAI-ATDD-111` wants `US-0017-*` E2E annotations belonging to a different skill's scope — which is
exactly the defect `CR-20260818-0006` is open against, and that CR blocks four `spec-0006` rows for
the same reason.

Stated this way rather than "the checkpoint now passes", because it does not. What changed is that
one of the two reasons was mine to fix and is fixed, and the remaining one is a clause under review.

### The lane prints seven rules across three scopes, not five

The heading "Exactly five is now reproducible from the output" and the paragraphs under it are about
`BR-0017-0037`'s five obligations over `.github/workflows/**`, and that framing was correct at
revision `4e29a2a4`. Two rules from other criteria have joined the lane since — `shipped-third-party`
(`AC-0017-0024`) and `required-context` (`AC-0017-0025`) — so a reader who counts the output today
gets seven and finds the record saying five.

The output is grouped by scope precisely so the two numbers can both be read off it, which is why
this is an addition rather than a correction of arithmetic.

**What the lane actually prints** — verbatim, and the labelling matters because the block that first
stood here carried counts and a `total 7` line the lane prints nowhere. It was a paraphrase wearing a
command label, which `completion-reviewer` caught by running the command (BL-10). The counts below
the fence are mine, derived by reading it:

```text
workflow hygiene: PASS.
Rules run over both workflow trees:
  - job-guardrails: ...
  - checkout-credentials: ...
  - action-pin: ...
  - matrix-fail-fast: ...
  - secret-inheritance: ...
Rules run over the shipped workflow tree only:
  - shipped-third-party: ...
Rules run over the required-status-context declaration:
  - required-context: ...
Not covered here: runner-label rules, secret-reference rules, and the shipped set's own contract shape ...
```

Counted from that output: **5** rules in the workflow-tree scope — `BR-0017-0037`'s five — plus **1**
shipped-scope and **1** declaration-scope rule, so **7** across three scopes. The rule descriptions
are elided above with `...`; nothing else is.

`TC-0017-0045` pins the workflow-tree scope at five and reads it BY SCOPE rather than by filtering
names out, which is what keeps "exactly five" reproducible while the total grows. That design choice
is recorded under the rule-set block; this note exists so the count in the prose cannot be mistaken
for the count in the output.
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

<a id="tdd-0014"></a><a id="tdd-0019"></a><a id="tdd-0021"></a><a id="tdd-0022"></a><a id="tdd-0024"></a>

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

<a id="tdd-0015"></a><a id="tdd-0017"></a><a id="tdd-0018"></a><a id="tdd-0020"></a><a id="tdd-0023"></a>

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

## Change 4 — the shared setup definition (TDD-0027, TDD-0028, TDD-0029, TDD-0031)

<a id="tdd-0027"></a><a id="tdd-0028"></a><a id="tdd-0029"></a><a id="tdd-0031"></a>

`10_Plan.md` step 4: extract the preamble duplicated six times into
`.github/actions/setup/action.yml` and consume it from every toolchain job. Base revision `28b7a8e2`.
**TDD-0030 is NOT in this change** — it is blocked by `CR-20260820-0001`, filed from a conflict this
change surfaced. See below.

### The preamble was six byte-identical copies, measured

```text
identical 11-line preamble blocks in ci.yml   6
actions/setup-node references                 6
corepack enable                               6
pnpm install --frozen-lockfile                6
```

After: each is 0, and `uses: ./.github/actions/setup` appears 6 times. Verified inside the rewiring
script rather than afterwards, so a partial extraction could not have been committed.

### Composite action, and the two things the definition adds rather than carries over

A reusable workflow was rejected: it is dispatched per job and that overhead runs against the cost
objective the whole spec serves. `BR-0017-0024`'s obligation is single-definition, so the mechanism
may change later; a second definition may not.

- **`cache-dependency-path` is new.** `BR-0017-0026` names both the package-manager cache AND an
  explicit cache-dependency path; the inline preamble had only the first. Without it `setup-node`
  guesses from the working directory — right today, silently wrong the moment a second lockfile
  appears. `R4` is the mutation that proves the row sees it.
- **`node-version-file` replaces a literal.** The old `NODE_LTS: "20.19"` had a comment three lines
  above it listing which jobs used it — and that list was already one job out of date. A literal
  cannot make a stale version comment impossible however carefully it is commented, which is what
  `BR-0017-0027` asks for.

The step ORDER is asserted, not just the membership, and the reason is mechanical: `setup-node`
installs its own Node ahead of the one step 1's corepack was activated against, so a re-shim placed
BEFORE it would be a no-op and the install would run on whatever pnpm the runner image shipped.

### The Node version source, and the trade recorded rather than hidden

`node-version-file: package.json`, which resolves through `engines.node` (`>=20.19.0`). The plan chose
this and recorded why the alternative was not available: pinning exactly needs a root-level
`.node-version`, and no agent may create a root file on its own authority.

The consequence is real and is not glossed: the resolved version becomes **latest satisfying** rather
than the previously pinned `20.19`, which today means Node 24. The risk is bounded by measurement
rather than by argument — this repository's whole test suite passes on Node 24 locally, which is the
version this environment runs.

### The conflict this change surfaced, filed as `CR-20260820-0001`

`TDD-0030` cannot pass, and not because of anything change 4 did or left undone. Three statements
cannot all hold:

1. `BR-0017-0027` is **tree-wide**: "no workflow-level Node version literal may remain … in this
   tree", and `TC-0017-0030`'s oracle repeats the scope.
2. `10_Plan.md`'s file table scopes `release.yml` to "checkout flags and SHA pins only".
3. `release.yml` carries **two** workflow-level Node literals: `NODE_LTS: "20.19"` for the gate job
   and `NODE_PUBLISH: "24"` for the publish job.

And the publish job is the hard half rather than merely out of scope. Its literal encodes a **measured
npm constraint** that `engines.node` does not express and is not about: trusted publishing needs
npm >= 11.5.1, and the documented Node minimum is not enough because `npm@latest` carries its own
engine range, so the install fails `EBADENGINE` before the version check runs. Pointing that job at
`engines.node` would launder an npm requirement through a field that means something else — on the one
workflow whose failure mode is an irreversible publish.

There is a coincidence worth naming and not relying on: `>=20.19.0` as latest-satisfying is Node 24
today, which is what `NODE_PUBLISH` asks for. That is today's arithmetic, not a guarantee — the
comment says "track the current LTS major" and the range says "anything at or above 20.19", and those
diverge silently the moment a newer major ships.

`TDD-0030` stays `todo`, and **its test is withheld rather than committed red.** Making it pass would
have meant choosing one of the CR's three options on my own authority, and the option that looks
cheapest — point the publish job at the file — is the one that discards a measured constraint.

Withheld and not merely failing, for two reasons that are both mechanical. `ci:gate` runs the whole
package suite, so a committed red test reds every pull request. And `it.todo` is not the escape:
`QFAI-TEST-001` gates on `.todo` stubs under the full validate profile, so that route trades a red
test for a red validate. A `todo` row with no test is also simply the consistent state.

The oracle is not lost. It is written down here and in the CR, ready to paste back: read each own
workflow's top-level `env` block from the PARSED document — so "workflow-level" is decided by YAML
structure rather than by indentation that looks right — and assert that no key matching `/node/i`
holds a value starting with a digit. The trace marker for `TC-0017-0030` is withheld with it, because
registering a TC whose test does not exist would claim coverage `QFAI-ATDD-112` reads as present.

### RED

- **RED command**, from `packages/qfai`:
  `./node_modules/.bin/vitest run tests/scripts/ownWorkflowTopology.test.ts`
- **RED result**: `Tests 4 failed | 6 passed (10)`, exit 1 — `TDD-0027`, `TDD-0028`, `TDD-0029` and
  `TDD-0030`, each on an assertion inside its own `describe`, no load error. The seam was a composite
  action with `steps: []`, which is present enough to parse and empty enough to fail every shape
  claim.
- **`TDD-0031` passed at RED**, structurally: the definition was already absent from the shipped tree
  before change 4 put it anywhere. The row is a regression guard, so `RED failure mode:
  falsifiability` with `R5`.

### GREEN

- **GREEN command / result**: the same command — `Tests 9 passed | 1 failed (10)`, the one failure
  being `TDD-0030` on `release.yml` alone. Stated that way rather than as a clean pass, because it is
  not one: change 4's four rows are green and the fifth is blocked.
- **The whole `scripts` project**: `Test Files 1 failed | 7 passed (8)` — same single failure.

### Two test corrections change 4 forced, both measured before applying

- **`TDD-0022` (change 2's row) rejected the first LOCAL reference.** `uses: ./.github/actions/setup`
  is not a 40-hex SHA, and the row demanded one of every reference. The hygiene LANE already exempts
  `./…` and records why — a local path resolves inside the repository at the same commit, which is the
  property pinning buys — and the row did not. A co-change, not a weakening: the same exemption, for
  the same reason, added where it was missing. The gap surfaced only because change 4 introduced the
  first such reference, which is worth noting: the lane and its row had disagreed since change 3 and
  nothing could see it.
- **`TDD-0030` over-asserted, and I narrowed it to its own oracle.** The first draft grepped the text
  for any `node-version:` literal and so blamed `qfai-validate.yml`'s STEP-level `node-version: "20"`.
  The rule and the oracle both say **workflow-level**. It now reads the parsed document's top-level
  `env` block, so "workflow-level" is decided by YAML structure rather than by indentation that looks
  right. Over-asserting would have been the reviewer-originated-obligation move the drift protocol
  forbids — demanding more than the rule asks and blaming a file it does not govern.

### Oracle proof

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | TDD-0027 | `02d177cb` | `:407:8` — a second frozen-lockfile literal returns to ci.yml |
| `R2` | TDD-0028 | `39044dd2` | `:435:8` `:445:14` — one job restates the preamble inline (and `:407:8`, because restoring the preamble restores its install line) |
| `R3` | TDD-0029 | `c7a49d84` | **nothing new** — a comment-only edit to the re-shim step, the control |
| `R4` | TDD-0029 | `8c95ae3a` | `:482:8` — the explicit cache-dependency path is dropped |
| `R5` | TDD-0031 | (a planted directory, not a file mutation) | `:554:8` — a composite action appears under the shipped asset tree |

Every run also shows `TDD-0030` red at `:526:8`. That is the standing `release.yml` failure and not an
effect of any mutation — which is exactly why `R3` matters: a control that reddens nothing NEW is what
distinguishes "the row sees this" from "the suite was already red". Without it, four mutations against
an already-red suite would prove less than they appear to.

`R5` creates a directory under `packages/qfai/assets/init/root/.github/` and removes it. The removal is
verified by `git status` over `packages/qfai/assets`, not by a `finally` alone — a crash defeats a
`finally`, which this repository has recorded happening.

### `TC-0017-0031`'s second half is cited, not duplicated

The oracle also asks that "pack verification still throws on a non-workflows child".
`scripts/verify-pack.mjs` resolves the repository root from its own location and packs THIS repo, so
it cannot be pointed at a fixture. The repository already answered that: spec-0003's
`shippedWorkflowTopology.test.ts` carries a static backstop pinning the `allowedRootGithubEntries`
allow-list and its throw path — and its own comment names this exact case, "an `actions/` directory
stays a hard pack failure". That sibling row anticipated this change.

So this row asserts the new half (absence from the shipped tree, by walking it rather than probing one
expected path) and asserts that the backstop is still there to be relied on. Duplicating the pack-time
claim would have created a second site for one obligation, which is the class this slice has spent
several rounds correcting.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained. `Status` is `refactor` for the four rows that
landed. The item-12 checkpoint is not attempted: step 2 needs a clean whole-suite run this machine is
not currently giving, and step 4's clause 3 reads a total `CR-20260818-0006` is about.

## Change 5 — slice-surface alignment (TDD-0062, TDD-0063, TDD-0064)

<a id="tdd-0062"></a><a id="tdd-0063"></a><a id="tdd-0064"></a>

`10_Plan.md` step 5: delete the runner project that matches zero files, add the two missing per-slice
scripts, and make the three slice surfaces name one set. Base revision `9b5b174b`.

### The three surfaces held three different sets, measured

| surface | site | at `9b5b174b` |
| --- | --- | --- |
| 1 — runner projects | `packages/qfai/vitest.workspace.ts` | 8, one of them matching zero files |
| 2 — CI matrix slices | `.github/workflows/ci.yml` `strategy.matrix.slice` | 7 |
| 3 — per-slice scripts | `packages/qfai/package.json` | 5 |

Each divergence is silent in its own way. A project matching zero files reports nothing. A matrix entry
with no script still ran, because the matrix handed the project name to a generic script — which is why
surface 3 could be two names short for months without anyone noticing.

### Surface 3 is defined by BEHAVIOUR, because the RED rejected the definition by name

The first draft derived surface 3 from the `test:` key prefix, minus a hand-kept exclusion for
`test:coverage`. The RED rejected it: `test:assets` also carries the prefix, and the claim demanded it
select an `assets` project that does not exist. Redefining a per-slice script as *one whose command
selects a project* excludes both convenience scripts by construction and deletes the exclusion list,
which was a second thing to maintain and would have gone stale at the next `test:something`.

Then a near-miss inside that definition. `PROJECT_SELECTOR` first read `--project ([a-z]+)`, and one
project is named `e2e`: surface 3 silently lost `test:e2e`, so the equality claim would have failed for
a reason with nothing to do with alignment. What caught it was not the test — it was a count assertion
inside the implementation script, which printed `project-selecting scripts now (6)` and refused because
it expected 7. The character class is now `[a-z0-9]+` and the reason is recorded at the constant.

### `TC-0017-0063` asks for a runner behaviour that does not exist, and the ORACLE is what proved it

The row was first written exactly as specified — "selecting the deleted project name fails to resolve
instead of matching zero files" — as `expect(status).not.toBe(0)` over a spawned runner. It passed. The
oracle contradicted it: round `R1` restores the deleted project, recreating precisely the defect the row
exists to detect, and the spawn assertion stayed green.

Measured afterwards, same command, two tree states:

```text
A  project ABSENT              exit 1  | projects: compatibility
                                       | No test files found, exiting with code 1
B  project PRESENT, dir gone   exit 1  | projects: compatibility
                                       | [compatibility] Config
                                       |   include: tests/compatibility/**/*.test.ts
                                       | No test files found, exiting with code 1
```

`--project <name>` does not reject an unknown name; it filters the project set to nothing. Exit status
is 1 in both states for the same reason. The only difference in the entire output is a reporter echo.

Filed as `CR-20260820-0002` rather than resolved here: rewriting a boundary TC's meaning to match what
I could implement is the move the drift protocol exists to prevent. The row ships against the intent.

### Three prose claims in this row were wrong before measurement

Recorded because the pattern matters more than any one of them:

1. the docblock stated a zero-file project "resolves, matches nothing, and **exits 0**" — false, and
   never measured;
2. a comment stated `tests/compatibility/` "never existed" — it held **four** tests, all removed by
   `c47d3db5` when the canonical contracts replaced the compatibility surfaces. The old comment told a
   future reader not to restore tests that were deliberately deleted, which is worse than saying
   nothing;
3. the row implied the deleted project was the only instance of the defect. It was not.

### A second, live instance — and why the invariant is per-GLOB

`integration` declared a glob under `tests/review`. That directory has not existed since `017fe9fd`
deleted the last file under it; the glob was correct when `48f4f3a6` wrote it, and outlived the
directory by a month. Because `integration` has four other globs with files behind them, a per-PROJECT
population check passes straight over it — as does every formulation scoped to the one deleted name.

So `TDD-0063` asserts a per-glob floor, and it reddened on this immediately:

```text
AssertionError: an include glob with no test files advertises coverage that cannot exist:
  expected [ Array(1) ] to deeply equal []
+   "integration: tests/review/**/*.test.ts"
 ❯ tests/scripts/sliceSurfaceAlignment.test.ts:306:8
```

Change 5 removes the dead glob. `vitest list --project integration --filesOnly` collects **128** files
before and after, so nothing that ran stopped running.

### CLAIM 3 of `TDD-0064` is asserted over parsed `run:` values, not raw text

The first draft asserted `.not.toContain("test -- --project")` over the whole workflow file, and
reddened on the comment that explains why the matrix stopped using that form — the comment quotes it.
Narrowed to the parsed `run:` values of the `test` job's steps. That is the actual obligation: what the
matrix RUNS, not what a comment says about what it used to run. This slice has now hit
prose-trips-a-text-assertion three times, and asserting over structure is the fix that generalises.

### The production change

- `packages/qfai/vitest.workspace.ts` — the `compatibility` project block deleted; the dead
  `tests/review` glob deleted from `integration`. 7 projects, 11 globs, every one populated.
- `packages/qfai/package.json` — `test:unit` and `test:scripts` added next to their siblings.
- `.github/workflows/ci.yml` — the matrix step now runs `pnpm -C packages/qfai test:${ matrix.slice }`.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/sliceSurfaceAlignment.test.ts`
- **RED result**: `Tests 3 failed (3)`, exit 1 — every failure an assertion, no load error. Then a
  second admissible RED after the row was rewritten: `Tests 1 failed | 2 passed (3)`, the one failure
  being the dead glob at `:306:8`, which is the extension RED that drove the second production edit.
- **GREEN result**: same command, `Test Files 1 passed (1)` / `Tests 3 passed (3)`.

### Oracle proof — eight rounds, and the two new claims discriminate

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | TDD-0062, TDD-0063 | `f9c12a13` | `:249:78` — the CI matrix names exactly the runner's projects; `:252:8` — the per-slice scripts name exactly the runner's projects; `:257:71` — the aligned set has seven members; `:267:12` — `compatibility` must not be declared in the runner workspace; `:306:8` — an include glob with no test files advertises coverage that cannot exist |
| `R2` | TDD-0062 | `168919f2` | `:249:78` — the CI matrix names exactly the runner's projects |
| `R3` | TDD-0062, TDD-0064 | `6f3eed67` | `:252:8` — the per-slice scripts name exactly the runner's projects; `:319:10` — slice `<name>` had no per-slice script and must now have one |
| `R4` | TDD-0062, TDD-0064 | `718f1ab2` | `:252:8` — the per-slice scripts name exactly the runner's projects; `:319:10` — slice `<name>` had no per-slice script and must now have one; `:330:10` — a per-slice script selecting `<name>` must be named `test:<name>` |
| `R5` | TDD-0064 | `a849d8b7` | `:351:8` — no matrix step may pass a project name to the generic test script; `:358:12` — the matrix must invoke the per-slice script for its slice |
| `R6` | TDD-0063 | `b3192278` | `:306:8` — an include glob with no test files advertises coverage that cannot exist |
| `R7` | TDD-0063 | `8c2b7597` | `:295:8` — every include glob must be countable by walking its literal directory prefix |
| `R8-control` | (control) | `8ef1def1` | **nothing new** |

`R6` and `R7` are the pair that matters for the rewritten row: a planted dead glob reddens **only** the
population claim, and a glob whose shape the counter cannot handle reddens **only** the shape claim.
Without that separation, an uncountable glob would have been reported as an empty directory. `R8` is the
comment-only control, and it is what makes the other seven mean anything — the baseline is green, so a
control that reddens nothing NEW distinguishes "the row sees this" from "the suite was already red".

### The full suite, run through the scripts CI now calls

The matrix invokes `test:<slice>` after this change, so running the seven scripts sequentially is both
gate item 2 and proof that the scripts work. It also sidesteps the whole-suite contention recorded under
change 3 — a single unfiltered run fails a differing set of files each time on this machine, with no
stray processes, and per-project runs pass.

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 102.6s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 10.4s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 16.3s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 56.2s |
| `test:e2e` | 73 passed | 4 skipped (77) | 889 passed | 16 skipped (905) | 33.1s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 73.3s |
| `test:scripts` | 9 passed (9) | 92 passed (92) | 9.7s |

Total 301.6s across 7 slices, every one green. Stated as seven sequential green slices, not as a
clean whole-suite run — those are different measurements and only the first was taken.

### The validate delta, including the aggregate this change made worse

`validate --profile tdd --fail-on error --root .` reports `info=4 warning=377 error=2`, exit 1.

- **`warning` is unchanged at 377.** `TDDLIST_STALE_STATUS` fires on a `todo` row whose selector
  resolves, and all three rows landed at `refactor`, so the new test file adds none. This is the
  opposite of what change 4 did, where a new file took the count from 16 to 36.
- **`error` is unchanged at 2**, and both are the same pre-existing aggregates change 4 recorded.
- **But `QFAI-ATDD-112`'s list grew by three items** — `TC-0017-0062`, `TC-0017-0063`,
  `TC-0017-0064`. The count did not move because the check emits one aggregated error; the aggregate
  did. Recorded rather than passed over: an unchanged error count is not the same as an unchanged
  finding.

> **CORRECTION (2026-08-20, after review finding B4).** The two paragraphs that stood here were
> wrong, and they were wrong in the direction that excused the finding. They read: "`QFAI-ATDD-112`
> routes a TC by its declared `Level`, and `.qfai/assistant/catalog/test-layers.md` fixes
> Integration's location rule at `tests/integration/**`. Every spec-0017 row [...] lives in
> `packages/qfai/tests/scripts/` [...] So all 60-odd of this spec's TCs are already in that list
> [...] Change 5 is consistent with its siblings, not newly wrong." They then routed the finding to
> `CR-20260814-0001` and `CR-20260807-0001` and declined to act.
>
> Neither half survives contact with the tree. The check does not read the test module's directory
> at all — it reads an annotation ledger, `tests/integration/qfai-traceability.md`, and asks whether
> each promoted TC is named there. That file already held nineteen `QFAI:SPEC-0017` lines when the
> paragraph above was written: exactly the TCs of changes 1 through 4, appended by this run's own
> commits. So the mechanism that clears the finding existed, this run used it four times, and then
> stopped using it — for eleven consecutive changes — while the record above explained the growing
> list as someone else's structural problem.
>
> Two consequences, both now fixed:
>
> 1. Fifty-four of the seventy-three promoted rows carried an **unmet coverage obligation**, each one
>    attributable to the change that promoted it. Appended the fifty-four missing annotations.
>    Measured after: the TCs `QFAI-ATDD-112` names from this spec went **63 to 9**, and the nine are
>    exactly the nine rows still `todo` — which have no test and therefore should have no annotation.
> 2. Every "error=2 unchanged, covered by `CR-20260807-0001`" attribution in the blocks from change 5
>    onward was **invalid for those rows**. That CR's clause 5 requires the baseline finding to be
>    unattributable to the row being closed; for these rows it was attributable. The count of 2 was
>    reported honestly and the growth of the aggregate was recorded rather than passed over — but the
>    routing to that CR was not available, and claiming it was is the defect. The measurements below
>    stand as taken; the attribution attached to them does not.
>
> What remains after the fix genuinely is pre-existing and cross-spec: `QFAI-ATDD-112` still names
> TCs from `spec-0003`, `spec-0008` and `spec-0015`, and `QFAI-ATDD-111` still wants `US-0017-*` E2E
> annotations that belong to a different skill's scope. `CR-20260814-0001` (the ledger is
> hand-maintained and coupled to nothing, so it certifies coverage in both false directions) is
> unaffected and still open — appending a line is exactly the unverified hand-maintenance it
> describes. The difference is that the ledger's weakness is now an argument about the mechanism's
> value, not a reason this slice may skip it.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all three rows. The
item-12 checkpoint is not attempted: step 2 asks for an unfiltered whole-suite run this machine is not
giving, and step 4's clause 3 reads a total that `CR-20260818-0006` is about. `CR-20260820-0002` is open
against `TC-0017-0063`'s wording; the row is implemented against the intent, not the literal text.

## Change 6 — the parallelism knob set (TDD-0060, TDD-0061, TDD-0068)

<a id="tdd-0060"></a><a id="tdd-0061"></a><a id="tdd-0068"></a>

`10_Plan.md` step 6: the knob set per project with the declared starting value of ten. Structure only;
the final value is a later change per project. Base revision `01c9f6ff`.

### The specified shape was implemented first, and it was inert

`BR-0017-0047` says "**every project in the runner workspace** MUST declare a pool and its pool
options, a worker setting, a within-file concurrency setting, a file-parallelism setting and a hook
timeout". That is what the first implementation did: six knobs on all seven projects. Every gate
passed. Nothing warned.

It also did nothing. The runner scopes three of those options to the root — its own
`NonProjectOptions` names `maxWorkers`, `minWorkers` and `fileParallelism`, and its
`poolOptions.forks` is narrowed to `singleFork | isolate`, so `maxForks` is not a project-level escape
hatch either. Measured on the `validators` project, same command, one variable changed:

```text
validators, worker override = 1        11.4s   46 passed (46)
validators, declared default (ten)     12.3s   46 passed (46)
ratio 0.93x
```

Constraining the worker count to one did not slow the project down. The runner's type and the
stopwatch agree that a project-level worker declaration is inert.

A declaration nothing reads is the same defect class as the test project that matched zero files —
`TC-0017-0063`, one change earlier. Satisfying this rule's literal wording is what would have shipped a
second instance of it. Filed as `CR-20260820-0003`.

### Why no gate caught it, and my first explanation was WRONG

The first explanation I reached for was that TypeScript's excess-property check does not fire through
an object spread. That was a hypothesis, so it was tested: a root-only key written **inline** on one
project, and the same key introduced through the shared spread object. Both left `tsc -b` at exit 0.

The real reason is simpler and is measured. `packages/qfai/tsconfig.json` includes
`["src/**/*.ts", "src/**/*.d.ts"]`, and `tsc --listFiles` shows none of the three runner config files.
The arrangement is deliberate and already written down: `eslint.config.js:51` heads that exact file
list with "Test files & config files outside tsconfig – disable type-checked rules". So no compiler was
ever going to look, and the runner drops unknown project options in silence.

Which leaves a test as the only mechanism that can catch this class. That is what `TDD-0060`'s new
root-only guard is, and oracle round `R6` is the proof it works: re-declaring a root-only option on
every project reddens `:219:8` and **nothing else**.

### The split, and what stayed the same

The knob set is defined once in `packages/qfai/vitest.knobs.ts` and consumed by both configs:

| knob | site | why |
| --- | --- | --- |
| `pool`, `poolOptions.forks` | each project | project-scoped; the narrowed `singleFork \| isolate` pair is what the runner accepts |
| `maxConcurrency` | each project | project-scoped, and the within-file axis |
| `hookTimeout`, `testTimeout` | each project | project-scoped |
| `maxWorkers`, `minWorkers` | `vitest.config.ts` | root-only by the runner's own type |
| `fileParallelism` | `vitest.config.ts` | root-only by the runner's own type |

Both halves are still declared rather than inherited, which is what the rule protects. Only the
declaration site follows the runner. `forks` over `threads` on purpose: much of this suite spawns the
built binary and writes temporary trees, and process isolation is what keeps those from colliding.

Nothing here adopts a value. Both axes stay at ten, the override exists so a timing run never has to
edit a declaration, and `BR-0017-0049`/`BR-0017-0051` keep the final value and any revision of the
declared starting value out of this change.

### Two co-changes, both the same treatment as an existing sibling

- **`eslint.config.js`** — `vitest.knobs.ts` added to the list that disables type-checked rules for
  files outside tsconfig. Without it eslint fails outright with "was not found by the project service".
  The list already names `vitest.config.ts` and `vitest.workspace.ts`; this is the same category, not a
  weakening.
- **`vitest.config.ts`** — gains the root-scoped axes next to the coverage block it already carried.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/vitestWorkspaceKnobs.test.ts`
- **RED result**: `Tests 4 failed | 1 passed (5)`, exit 1 — every failure an assertion, no load error.
- **`TDD-0068` passed at RED**, structurally: no retry setting existed to begin with. The row is a
  regression guard, so `RED failure mode: falsifiability` with `R8`/`R9` and the prose control `R10`.
- **GREEN result**: same command, `Tests 5 passed (5)`. Reached twice — once against the inert
  implementation, and once against the split. Only the second GREEN means anything, which is the whole
  lesson of this change.

### One correction the GREEN forced

`TDD-0068`'s textual claim first matched the bare word `retry`, and it reddened on the configuration's
own comment saying no retry may be added — the very comment that stops someone adding one. Weakening
the documentation to satisfy the scan would have been backwards, so the scan was made precise instead:
`retry` or `retries` immediately followed by an assignment. `R10` is the control that proves this was a
narrowing and not a loosening — a comment discussing retries reddens nothing, while `R9`'s
commented-out `retry: 2` still reddens. Fourth time this slice has had prose trip a text assertion.

### Oracle proof — eleven rounds against the one file that defines the set

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | TDD-0060 | `c67579fb` | `:192:8` — every knob must be declared, not inherited from the runner's defaults |
| `R2` | TDD-0060 | `c797ed07` | `:192:8` — every knob must be declared, not inherited from the runner's defaults |
| `R3` | TDD-0060 | `603658fa` | `:207:8` — pool options that do not name the declared pool are read by nothing |
| `R4` | TDD-0061 | `e266664d` | `:260:8` — each axis must resolve through its own override, not a fixed literal |
| `R5` | TDD-0061 | `be0bb61f` | `:238:8` — both tunable axes start at ten — the user's declared value; `:282:10` — an override of <malformed> must fall back to ten |
| `R6` | TDD-0060 | `4c81a1e2` | `:219:8` — a root-only option declared on a project is a declaration nothing reads |
| `R7` | TDD-0060 | `d53872db` | `:192:8` — every knob must be declared, not inherited from the runner's defaults |
| `R8` | TDD-0068 | `9772f224` | `:301:8` — a retry would mask the concurrent-writer races more workers surface; `:323:8` — a search of the runner configuration for a retry must return zero results |
| `R9` | TDD-0068 | `3865d471` | `:323:8` — a search of the runner configuration for a retry must return zero results |
| `R10-control` | (control) | `d6409baf` | **nothing new** |
| `R11-control` | (control) | `47121589` | **nothing new** |

Baseline is green, so a control that reddens nothing NEW is what separates "the row sees this" from
"the suite was already red". Two controls rather than one, because `R10` has a second job: without it,
the narrowed retry scan is indistinguishable from a weakened one.

### The suite at the declared value

Seven sequential slices through the scripts the CI matrix calls:

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 98.4s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 13.9s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 17.7s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 72.9s |
| `test:e2e` | 73 passed | 4 skipped (77) | 889 passed | 16 skipped (905) | 38.9s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 122.9s |
| `test:scripts` | 10 passed (10) | 97 passed (97) | 9.2s |

Total 373.9s, every one green.

**No timing claim is made from this table.** Slice by slice it runs both faster and slower than change
5's sweep — `core` down, `integration` up — and the runs were taken on a machine that was doing other
work, including mine. That spread is the same noise change 3 recorded when a whole-suite run failed a
differing set of files each time. Reading a knob effect out of it would be exactly the move
`BR-0017-0049` forbids: a value is adopted only against a timing artifact comparing at least two
settings on the largest project, and this is not one. The table's claim is narrow and it is the one that
matters here — the declared configuration does not break anything.

An earlier sweep is discarded rather than reported: it was still running when these config files were
edited, so its later slices measured a different tree than its earlier ones.

### The validate delta, and one warning this change declined to join

`validate --profile tdd --fail-on error --root .` reports `info=4 warning=377 error=2`, exit 1 — every
count identical to change 5, and `QFAI-ATDD-112`'s aggregate list unchanged as well, since no new
`TC-*` annotation directory is involved.

Getting there took a correction. The first version of these three Evidence cells stated a verdict —
`Tests 4 failed | 1 passed (5)` — with no command, which is exactly what
`TDDLIST_EVIDENCE_STATUS_ONLY` fires on: the count went 377 to **378**, and the 97th instance of that
warning class was mine. The validator accepts a cell naming a known runner, so the cells now lead with
the command that produced the verdict. Count back to 377, `TDDLIST_EVIDENCE_STATUS_ONLY` back to 96.

Worth recording rather than quietly fixing, for two reasons. It is the second time in this slice that a
count moving by one turned out to be attributable and cheap to fix, against a background of 377 where
"unchanged" is the easy thing to report. And the 96 that remain are real: they include every spec-0017
row from changes 1 through 5, all authored in this session and all missing their command. Repairing
those is a mechanical pass over Evidence cells — an unconditional carve-out cell, so the drift protocol
permits it — and it is deliberately NOT folded into change 6, whose diff should stay the knob set.

### A raw pipe inside a table cell silently adds a column

Worth its own note because the failure was structural and the report pointed elsewhere. The first
repaired Evidence cells quoted the runner verbatim, and the runner writes
`Tests 4 failed | 1 passed (5)`. A Markdown table splits on `|` with no regard for code spans, so
those two rows carried ELEVEN and TEN fields instead of nine. Prettier then aligned the whole table
to eleven columns, which pushed the separator row two characters past the 1200-character limit and
produced five `MD038` hits on rows I had not touched — three of them from change 5.

So a stray pipe in one cell reported as a formatting problem in four other rows. The verdict is now
written with `/`: same information, no hazard. Escaping as a backslash-pipe also renders, but a cell
whose correctness depends on an escape is a trap for whoever edits it by hand next.

The repair script rebuilds each row from its first nine fields rather than editing cell 8 in place,
because a row already split by a stray pipe has its Evidence at the wrong index — editing in place
would have written the fix into the wrong cell. It then asserts every data row holds nine cells: 82
rows, one distinct field count.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all three rows. The
item-12 checkpoint is not attempted: step 2 asks for an unfiltered whole-suite run this machine is not
giving, and step 4's clause 3 reads a total that `CR-20260818-0006` is about. `CR-20260820-0003` is
open against `BR-0017-0047`'s and `TC-0017-0060`'s scope; the row is implemented against the intent,
not the literal text.

## Change 7 — retiring the duplicate validate workflow (TDD-0071, TDD-0072, TDD-0073)

<a id="tdd-0071"></a><a id="tdd-0072"></a><a id="tdd-0073"></a>

`10_Plan.md` step 7: delete `.github/workflows/qfai-validate.yml` and fold its full-profile run into
`build` as a named item of that job's verification set. Base revision `d8e58fe0`.

**Precondition checked before starting.** `BR-0017-0061` and `DR-0017-0005` edge 4 require the
structural contract gate over the shipped set to exist at or before this change.
`packages/qfai/tests/integration/shippedWorkflowShapeGate.test.ts` is present and wired into `ci:lint`
as `lint:workflow-shape`, and its own run reports that the declared shape "pins all nine contract
dimensions, and every one of them is actually diffed". The gate is in an ancestor change, so the edge
holds.

### The copy was never a mirror, which is why deleting it needed the fold first

The repository shipped a validate workflow to adopters and kept its own copy. The copy ran
`--profile full`; the `build` job ran `tdd` and `sdd`. Deleting the copy on its own would therefore
have dropped the full profile rather than removed a duplicate — a coverage loss disguised as cleanup.

`BR-0017-0059` also rules out the cheaper alternative. Repointing at the shipped workflow file would
resolve the CLI through the package name, and the root manifest declares no dependency on
`packages/qfai` and provides no local binary — so it would reach the **published** release. CI would
validate a version nobody is reviewing. `TDD-0072` asserts both halves: the folded step uses
`node packages/qfai/dist/cli/index.mjs`, and no own workflow reaches the package through `npx` /
`pnpm dlx` / `yarn dlx` / `bunx`. It also asserts the WARRANT — that the root manifest really declares
no such dependency — so if that ever changes, the row fails rather than keeping a stale reason.

### The folded run already exits 1, and that is not this change's doing

Measured before writing the step, so the fold could not be claimed green when it is not:

```text
node packages/qfai/dist/cli/index.mjs validate --profile full --fail-on error --root .
  -> exit 1, counts: info=3 warning=404 error=2
```

The two errors are `QFAI-ATDD-111` and `QFAI-ATDD-112`, **the same two ids** the `--profile tdd` step
immediately above it already reports. So the folded step adds no new failure mode: the job it joins
was already failing at an earlier step for the same reason.

> **CORRECTION (2026-08-20, after review finding B4).** The sentence that continued here — "and those
> two aggregates are what `CR-20260807-0001` (pre-existing cross-spec errors) is about" — was not
> available when it was written. `QFAI-ATDD-112`'s list at that moment included fifty-four of this
> spec's own promoted rows, whose missing annotations were attributable to the changes that promoted
> them, and that CR's clause 5 covers only findings *unattributable* to the row being closed. See the
> correction under change 5 for the mechanism and the fix. The claim this step actually needs is
> narrower and survives: `--profile full` introduces **no third error id** beyond what the `tdd` step
> already reports, so the fold cannot be the reason the job fails. `--profile full` introduces no third
error id — the `full`-only gates, `QFAI-TEST-001` among them, pass.

Stating it that way rather than "the fold is green" is the point. It is not green. It is *no worse*,
which is a different and weaker claim, and the only one the measurement supports.

### `on:` is read under two keys, deliberately

`on` is a boolean in YAML 1.1, so a parser following that schema yields the key `true` rather than the
string `"on"`. The parser this repository uses follows YAML 1.2 and yields `"on"`. The row reads both,
because a claim whose correctness depends on which schema a dependency chose is a claim that breaks
silently on a version bump — and silently is the failure mode this whole spec is written against.

### The enumeration lives in the test, and that is what makes removal a blocker

`BR-0017-0060` asks that the folded run "become an item of the `build` job's enumerated verification
set, so removing it later is a release blocker rather than a cleanup". A set derived from the workflow
would agree with the workflow by construction and assert nothing, so `TDD-0073` holds the six
verification step names as **literals**:

```text
Run build & pack verification
Sanity grep — no internal spec IDs or version markers leak (post-build)
QFAI self-validate this repo (dogfooding — TDD gates)
QFAI self-validate this repo (dogfooding — SDD gates)
QFAI self-validate this repo (dogfooding — full profile)      <- folded in by this change
Run qfai validate gate (fail on error)
```

And each of them must be able to FAIL. The job already carries a step that cannot — the optional
report, which ends in `|| true` — and the difference between the two kinds is the entire reason for
enumerating them. Oracle `R7` and `R8` are the pair that separates the two halves: a step made
toothless reddens only the can-fail claim, a step renamed out of the set reddens only the membership
claim.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/ownWorkflowTopology.test.ts`
- **RED result**: `Tests 3 failed | 9 passed (12)`, exit 1 — each of the three new rows on an
  assertion inside its own `describe`, no load error. The nine that pass are changes 1 and 4's rows;
  `TDD-0030`'s test is still withheld under `CR-20260820-0001`, which is why the file holds twelve
  tests rather than thirteen.
- **GREEN result**: same command, `Tests 12 passed (12)`.

### What was deleted, and what was not

```text
.github/workflows/qfai-validate.yml                             deleted (the own copy)
packages/qfai/assets/init/root/.github/workflows/qfai-validate.yml   untouched (what adopters get)
```

Two workflows remain in the own tree: `ci.yml` and `release.yml`. `ci:lint` is 0 across all eleven
members after the deletion, which includes the hygiene lane over the own tree and the shipped-set
shape gate over the packaged one.

### Oracle proof — ten rounds

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | TDD-0071 | `c547fea4` | `:636:12` — the duplicate workflow must be absent; `:644:8` — exactly one workflow may run on a pull request |
| `R2` | TDD-0071 | `59a36a19` | `:644:8` — exactly one workflow may run on a pull request |
| `R3` | TDD-0072, TDD-0073 | `c99370d0` | `:659:8` — the build job must carry exactly one full-profile validate run |
| `R4` | TDD-0072 | `4aa32f13` | `:672:58` — the folded run must fail the job, target the repo root, and use the local binary |
| `R5` | TDD-0072 | `f4528e2d` | `:672:58` — the folded run must fail the job, target the repo root, and use the local binary; `:689:8` — a resolver-based invocation would reach the published package |
| `R6` | TDD-0072 | `eeb6bb7b` | `:672:58` — the folded run must fail the job, target the repo root, and use the local binary |
| `R7` | TDD-0073 | `4bf5e3d6` | `:749:8` — an enumerated verification that cannot fail is not a verification |
| `R8` | TDD-0073 | `62191dd0` | `:732:8` — every enumerated verification must be present in the build job |
| `R9` | TDD-0072 | `85cc47c1` | `:708:8` — the root manifest declaring a dependency on qfai would change why a repoint is unsafe |
| `R10-control` | (control) | `fb6ccd00` | **nothing new** |

`R9` is the round that mutates the ROOT manifest rather than a workflow. `TDD-0072`'s rejection of a
resolver-based invocation rests on the root declaring no dependency on the package; `R9` adds one, and
the warrant claim reddens while nothing else does.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 94.2s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 9.8s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 15.8s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 64.3s |
| `test:e2e` | 73 passed | 4 skipped (77) | 889 passed | 16 skipped (905) | 32.1s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 169.5s |
| `test:scripts` | 10 passed (10) | 100 passed (100) | 9.3s |

Total 395.0s, every one green. No timing claim is made from this table, for the reasons recorded
under change 6.

### The validate delta, and what the NEXT commit will cost

`validate --profile tdd --fail-on error --root .` reports `info=4 warning=374 error=2`, exit 1.
Warning is DOWN three from change 6, because `TDDLIST_STALE_STATUS` fires on a `todo` row whose
selector resolves and three such rows became `refactor`. `TDDLIST_EVIDENCE_STATUS_ONLY` stays at 96:
these Evidence cells lead with their command, per change 6.

That number was measured with the next commit’s test file moved OUT of the tree, and the reason is
worth recording. With `tests/assets/actionPinBumpOwner.test.ts` present, warning reads 381 — seven
added, and only TWO of them are its own rows:

```text
TDD-0074, TDD-0075   its own rows, correctly reported as todo with a resolving selector
TDD-0025, TDD-0033   FALSE: their selectors name describes that file does not contain
TDD-0034, TDD-0035   FALSE
TDD-0066             FALSE
```

Five of seven are false positives, and the mechanism is the one `CR-20260818-0001` is open against:
the resolution check is satisfied by the test FILE existing, so every row pointing at a shared file
inherits a resolving selector it does not have. Thirteen `spec-0017` rows point at that one file, so
the same file will keep manufacturing false positives as its rows land one change at a time.

This is the second time this slice has measured that mechanism — change 4 recorded a new file taking
the count from 16 to 36 with 23 false. Recorded here rather than absorbed, because a count that moves
for a reason nobody attributes is how a 374-warning baseline becomes unreadable.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all three rows.
`TDD-0074` and `TDD-0075` are NOT in this commit: `BR-0017-0061` also requires a recorded
justification for the deletion, whose satisfying artifact the ledger places in `07_Decisions.md`, and
that is a separate piece of authoring rather than a line in this diff. The item-12 checkpoint is not
attempted for the reasons recorded under changes 3 through 6.

## Change 7 part 2 — the recorded justification (TDD-0074, TDD-0075)

<a id="tdd-0074"></a><a id="tdd-0075"></a>

`BR-0017-0061` allows the deletion in part 1 only with a structural contract gate present at or before
it, and requires a recorded justification whose content it specifies. The ledger routes both rows to
`packages/qfai/tests/assets/actionPinBumpOwner.test.ts`, the file this spec designates for rows whose
satisfying artifact is a durable repository record. Base revision `e0396c62`.

### Thirteen rows share that file, and it did not exist

`spec-0017` routes thirteen rows there — obligations of the shape "a decision was taken and written
down": an owner named, a cost recorded, a rejected alternative kept with its reason. This change
creates the file with the first two.

Those rows are worth testing rather than waiving. A rule satisfied by "somebody decided this" degrades
to nothing the moment that person stops reading pull requests; a rule satisfied by a paragraph, read by
a test, fails when the paragraph is deleted or reworded past the point where it still carries the
reason.

What the file must NOT do is pin prose verbatim, which would make every editorial pass a red build. So
each claim names the specific thing its rule names — a path that must be cited, a reason that must be
present, a rejected reason that must be marked rejected — and the oracle below is what shows the
difference between reading content and merely finding a paragraph.

### `DR-0017-0007`, and the one distinction `BR-0017-0061` insists on

The rule does not merely ask for a justification; it fixes which one is correct. The recorded cost must
be **the loss of the manual cross-check**, and explicitly **not** the absence of a mirror — "which was
already absent". That is not a stylistic preference. The two files had already diverged on the only
thing that mattered, the profile they ran, so there was no mirror to lose; recording the absent mirror
would overstate what the deletion takes away and understate what replaces it.

So `TDD-0074` asserts both halves separately: the cross-check is named, AND the mirror is marked as not
the reason. A record naming the cross-check while leaving the mirror unaddressed satisfies the first and
still misstates the trade, which is why `R3` and `R4` are distinct rounds.

### `TDD-0075` reads the tree, and deliberately not history

"At or before the deletion" is satisfied structurally by co-presence at this revision: the duplicate is
absent here and the gate is present here, so no revision of this branch carries the deletion without the
gate. That is checkable without reading git history — which matters, because a history-dependent
assertion inside the main suite breaks under a shallow clone, and this repository already keeps its one
history-dependent check (`check-prompt-scanner-pair.mjs`) out of `ci:gate` for exactly that reason.

The row also asserts the gate is INVOKED by a package script, not merely present. A gate present but
unwired is a file, and this slice has now caught that decoration defect three times — a project
matching zero files, a knob the runner ignores, and here.

And it asserts both directions of the deletion: the own copy gone, the shipped copy surviving. Deleting
the copy adopters receive would be a different and much worse change, and a row that only checked
"absent" would pass for it.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/assets/actionPinBumpOwner.test.ts`
- **RED result**: `Tests 1 failed | 1 passed (2)`, exit 1. `TDD-0074` fails on CLAIM 1, which is a HARD
  `expect` rather than a soft one: everything below it reads the record, so a missing record would
  otherwise produce four confusing empty-string failures instead of one clear one.
- **`TDD-0075` passed at RED**, structurally — part 1 had already removed the duplicate and the gate
  predates both. The row is a regression guard, so `RED failure mode: falsifiability` with `R6`..`R9`.
- **GREEN result**: same command, `Tests 2 passed (2)`.

### Oracle proof — nine mutations, nine distinct claims, and a control

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the decision record is deleted outright | `a5318669` | `:90:11` — TDD-0074 CLAIM 1 — the decision record must exist |
| `R2` | the record stops naming the gate it relies on | `5849b3f3` | `:97:8` — TDD-0074 CLAIM 2 — it must name the structural contract gate |
| `R3` | the recorded cost stops being the manual cross-check | `0c6962bf` | `:102:8` — TDD-0074 CLAIM 3 — the recorded cost must be the manual cross-check |
| `R4` | the record stops saying the absent mirror is NOT the reason | `4a05014b` | `:110:8` — TDD-0074 CLAIM 4 — the absent mirror must be recorded as NOT the reason |
| `R5` | the rejected repoint alternative loses the reason it was rejected for | `4d06e32f` | `:117:8` — TDD-0074 CLAIM 5 — the rejected repoint must keep its reason |
| `R6` | the deleted own-tree duplicate comes back | `c547fea4` | `:161:8` — TDD-0075 CLAIM 3 — the own duplicate must be gone |
| `R7` | the SHIPPED copy is deleted too — the mistake the row exists to catch | (file removed) | `:167:8` — TDD-0075 CLAIM 3 — the shipped copy must survive |
| `R8` | the gate stops being invoked by any package script | `b3ef3a68` | `:151:12` — TDD-0075 CLAIM 2 — a package script must invoke it |
| `R9` | the gate file is gone while the script still names it | (file removed) | `:134:8` — TDD-0075 CLAIM 1 — the gate file must exist |
| `R10-control` | a sentence added to the record that touches no required content | `0fcd388e` | **nothing new** |

Every mutation reddens exactly ONE assertion, and each of the nine claims has its own. For a row whose
artifact is prose that is the whole proof: it is easy to write a record-reading test that any paragraph
satisfies, and the only way to know it reads the specific content its rule names is to remove each piece
separately and watch one claim fail. `R10` adds a sentence to the record that touches no required
content and reddens nothing, which is what separates "the row reads this" from "the row reads anything".

`R7` is the round worth naming: it deletes the SHIPPED copy, the mistake this pair exists to catch, and
only the survival claim reddens.

### The validate cost this commit pays, measured

`validate --profile tdd --fail-on error --root .` reports `info=4 warning=379 error=2`, exit 1 — five
above part 1's 374, and **all five are false**.

The arithmetic, because it is easy to state loosely. Creating the file added seven
`TDDLIST_STALE_STATUS` warnings while all seven rows naming it were `todo`. Two of those — `TDD-0074`
and `TDD-0075` — are this commit's own and were promoted to `refactor`, so they emit nothing. What
remains is five: `TDD-0025`, `TDD-0033`, `TDD-0034`, `TDD-0035` and `TDD-0066`, none of which this
commit touches and none of whose selectors appear in the file. They are reported stale because the
resolution check is satisfied by the test FILE existing rather than by the selector being present in
it. Confirmed by reading the warning list, not inferred: those five ids are exactly the ones the run
names.

That mechanism is `CR-20260818-0001`, and this is the third time this slice has measured it. It will
recur for each of the remaining eleven rows routed to this file, which is worth stating plainly: the
warning count will keep climbing for a reason that has nothing to do with the rows landing.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for both rows. The
item-12 checkpoint is not attempted, for the reasons recorded under changes 3 through 7.

## Change 8 — change detection and lane selection (TDD-0006 … TDD-0012)

<a id="tdd-0006"></a><a id="tdd-0007"></a><a id="tdd-0008"></a><a id="tdd-0009"></a><a id="tdd-0010"></a><a id="tdd-0011"></a><a id="tdd-0012"></a>

`10_Plan.md` step 8: the detection job, plus a derived condition on every declared leg; the lint lane
and the required-context job stay unconditional. Base revision `9aced5bb`.

### The seam went in first, because the first RED was not admissible

The first RED reported `Tests 6 failed | 13 passed (19)`, and four of those six failed with a THROWN
`ci.yml declares no \`detect\` job` rather than with an assertion. A lookup error says the row could not
run; it does not say the behaviour is absent, and treating it as a RED would have made the GREEN mean
less than it appears to.

So a minimal seam went in first: the `detect` job, its two outputs, the checkout, and a step whose
quoted heredoc contains one comment and no code. Present enough to parse and to be found by the
extractor, empty enough to fail every behavioural claim. The second RED is the admissible one —
`Tests 6 failed | 13 passed (19)` with zero thrown errors, every failure an assertion.

### The whole decision lives in the program, failure included

`BR-0017-0008` requires a failed diff to emit an annotation naming the reason AND to select the full
lane set. If that branch lived in the shell around the classifier it would be the one part of the rule
no test could execute — and it is the branch that matters most, because getting it wrong means a
narrowed run that looks deliberate.

So the workflow only ATTEMPTS the diff:

```text
git diff --name-only "$BASE_SHA" "$HEAD_SHA" > changed.txt 2> diff-err.txt || true
node detect.mjs changed.txt diff-err.txt
```

`|| true` is load-bearing. A shallow clone or an unreachable base ref reaches the classifier as "no
path list was produced", and the classifier decides. An EMPTY list is a failure to compute, never
"nothing changed" — a pull request always changes something, so an empty diff means the diff did not
run. `R7` is the mutation that proves the row sees that distinction: making the empty case fall through
reddens the fail-open claim and nothing else.

The heredoc is quoted, so the bytes GitHub executes are the bytes the tests extract and execute. That
is change 1's technique for the verdict, used here for the same reason: a rule that is only read is a
rule nobody has tested.

### The exclusion set is small, and it is small because it was measured

`BR-0017-0009` and `BR-0017-0010` require both lists to be enumerated. The recognized list is the
tracked top level. The documentation-only list was derived by asking, for each candidate, whether any
test file reads it — because classifying a path as documentation skips the lane that would catch a
break there.

Almost everything has a reader. `.qfai/specs/**` is read by dozens of test files (this slice's own rows
read it); `.qfai/decisions/**` is read by five, including the row committed one change ago;
`CHANGELOG.md`, `RELEASE.md`, `CLAUDE.md` and `AGENTS.md` each have at least one. What survived is
`packages/qfai/docs/**` (zero readers), `LICENSE` and `REVIEW.md`.

That makes the practical saving narrow, and saying so is better than implying otherwise: most pull
requests in this repository will select the full set, because most of them touch something a test
reads. The measurement is what makes the list defensible rather than optimistic.

### The one member the measurement contradicts, filed as `CR-20260820-0004`

`BR-0017-0010` also requires the agent-integration mirrors, and two test files read the ROOT copies of
them: `tests/codex/agents.test.ts` reads `REPO_ROOT/.codex`, and `tests/core/prFixMonitor.test.ts`
reads `repoRoot/.claude` and `repoRoot/.agents`. Both live in slices a documentation-only classification
skips. So a pull request editing only an agent mirror skips exactly the two files whose subject is
agent mirrors.

Implemented as written, hazard recorded. The recommendation in the CR is to move those two guards into
the lint lane, which is structurally exempt from selection and already carries one `vitest` invocation
of a single integration file for precisely this reason.

### `NEVER_DOCUMENTATION` was inert, and the oracle is what said so

`R9` removes the assistant tree from the classifier's never-documentation list. On the first oracle run
it reddened **nothing**: `.qfai/` is not in the documentation set either, so an assistant-tree path
still selected everything — as a plain source path. The list was decoration.

That is the third instance of this defect class in this slice, after a project matching zero files and
a knob the runner ignores, and this time it was in my own implementation. `BR-0017-0010` requires the
exclusion to be explicit — "MUST exclude the assistant catalog tree BECAUSE changes there alter
validate output" — so `TDD-0010` now asserts the REASON as well as the selection. `R9` reddens that
claim and nothing else, and the list is load-bearing.

### A hole found by reading the shape, and closed

`detect` was not in the verdict's `needs`. Every selected lane needs `detect`, so a CRASHED detection
skips all of them; the verdict reads `skipped`, and `skipped` is accepting because a documentation-only
run legitimately produces one. The result would be a green run in which nothing was verified — the
exact case the verdict's accepting set was written to exclude.

Failing OPEN is a decision the classifier makes and annotates. Failing HARD has to reach the gate. So
`detect` joined the verdict's needs and `TDD-0006` gained a fourth claim; `R12` is the mutation that
holds it.

### Two corrections change 8 forced, both measured before applying

- **`toolchainJobs()` matched a job that only NAMES pnpm.** The helper asked whether any step's `run`
  contained the substring, and the classifier's recognized-file list names `pnpm-lock.yaml` and
  `pnpm-workspace.yaml` — so the detection job read as a toolchain job and `TDD-0028` reported it for
  not consuming the shared setup definition. It needs no dependencies at all: it runs the image's node
  against a git diff, and installing the workspace would add the slowest step in the file to its
  cheapest job. Narrowed to a command-word match, which is what invoking pnpm looks like in every form
  a `run:` block can take. A narrowing, not a weakening.
- **`always()` is a condition that cannot prevent execution.** `TDD-0006`'s ceiling counts job
  instances, and the verdict carries `if: always()` on purpose — it must run when its needs are
  SKIPPED, which is the documentation-only case. Counting it as conditional made the ceiling unmeetable
  for the one job the ceiling exists to protect. The claim now treats `always()` as
  unconditional-in-effect AND pins it to the verdict alone, so a lane cannot reach the ceiling the same
  way. `R11` holds both halves.

### The file-scoped GREEN was not enough, and a sibling row is what said so

`tests/scripts/ownWorkflowTopology.test.ts` was green, `ci:lint` was 0 across all eleven members, and
the change looked finished. The `scripts` slice then failed on a row from change 2:

```text
AssertionError: full history belongs to the lint lane's pair-changed diff and the release
verification job, and to no other job: expected [ 'ci.yml::detect', …(2) ] to deeply equal
[ 'ci.yml::lint', …(1) ]
```

`TDD-0021` holds a literal allow-list of the jobs that may request `fetch-depth: 0`, and the detection
job is a third. Worth recording as a process fact and not only a fix: a file-scoped run cannot see a
sibling row that governs the same file, which is exactly why the item-12 checkpoint asks for the whole
suite rather than the row's own test.

### Two co-changes, both with the authorization cited

- **`TDD-0021`'s full-history allow-list gains `ci.yml::detect`.** An extension, not a relaxation, and
  the distinction rests on which half of the rule is normative. `BR-0017-0019` says "the jobs that
  legitimately need full history MUST request it on the job, and full-history checkout MUST NOT become
  a workflow-level default"; its Notes then observe "Two jobs need it **today**", which is a
  measurement of the tree at authoring time. `AC-0017-0004` names the third outright — "the
  change-detection job requests full history and diffs against the base commit" — and the diff cannot
  resolve the base commit in a shallow clone, which is one of the two failures that same rule requires
  to fail open. CLAIM 2, the prohibition on a workflow-level default, is what the rule actually guards
  and is untouched. Same shape as change 4's `TDD-0022` co-change: the row and the tree disagreed only
  once something new appeared.
- **The base ref resolves for `push` as well as `pull_request`.** `github.event.pull_request.base.sha`
  is empty on a push, so `git diff "" HEAD` fails, the classifier fails open, and **every** push to the
  default branch would carry a warning annotation saying the diff could not be computed. Correct
  behaviour, useless signal: an annotation that is always present is one nobody reads. The base is now
  `github.event.pull_request.base.sha || github.event.before`. On branch creation `before` is all
  zeroes, the diff fails, and the classifier fails open naming git's reason — the right outcome for a
  run with no predecessor.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/ownWorkflowTopology.test.ts`
- **RED result** (post-seam): `Tests 6 failed | 13 passed (19)`, exit 1, every failure an assertion.
- **`TDD-0012` was among the 13 that PASSED**, and no record said so until round 5. Added
  2026-08-20 after `completion-reviewer` closed the arithmetic this record left open:

  ```text
  9aced5bb (this change's base)  12 describes, 12 it()s;  change 7's GREEN was `12 passed (12)`
  2a3ef61c (this change)         19 describes, 19 it()s;  +7, exactly TC-0017-0006..0012
  recorded RED                   6 failed | 13 passed (19)
  => 13 passed = 12 pre-existing + EXACTLY ONE of the seven new rows
  ```

  And the one is `TDD-0012`, established from the workflow at the seam revision rather than
  inferred: at `9aced5bb` the `lint` and `build` jobs carry neither `if` nor `needs`, which is
  precisely what this row asserts, so every claim held against the seam. `TDD-0008` runs the
  EXTRACTED classifier and requires `full === false`; the seam's heredoc was comment-only, emitted
  no `full=`, and the value was null — so it failed, along with 0006, 0007, 0009, 0010 and 0011.

  **The B7 repair missed this because I dismissed the test that finds it.** `e4a7295c` said
  comparing a failure count to a row count is invalid "because a row is a `describe` and may hold
  several `it()`s". That refutes only the converse: six failures redden AT MOST six describes, so
  with seven rows at least one passed — and in this file no describe held more than one `it()`, which
  makes the bound exact. The general caution was correct; applying it without checking whether it
  bound this case was not.

  `TDD-0012`'s cell now records that it was among the passing and carries the falsifiability trio
  over rounds `R3`, `R4` and `R5`, which already existed and already named it.

  **Closed generally rather than case by case.** Every group of rows sharing one recorded RED is now
  checked mechanically: rows still claiming that RED must not outnumber its failures. Twelve groups,
  and none does. The per-file proviso that makes the bound exact — one `it()` per describe — is
  checked rather than assumed, which is the step whose omission let this survive a round.
- **GREEN result**: same command, `Tests 19 passed (19)`.
- **End-to-end sanity**: the classifier extracted from the committed workflow, run against this
  branch's own working set, reported `full=true` with
  `reason=source path: .github/workflows/ci.yml`.

### Oracle proof — thirteen rounds across the shape AND the rule

| id | row | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | TDD-0006, TDD-0007 | `e291325b` | `:944:8` — a documentation-only run may execute only detection, lint, build and the verdict; `:958:8` — every selected job's condition must be derived from the detection output; `:1010:8` — the selection condition belongs on the job |
| `R2` | TDD-0006 | `e817983b` | `:966:88` — a job reading `needs.detect` must declare it in `needs` |
| `R3` | TDD-0006, TDD-0012 | `05692779` | `:944:8` — a documentation-only run may execute only detection, lint, build and the verdict; `:1122:80` — the lint lane must carry no selection condition; `:1125:12` — the lint lane must not depend on detection |
| `R4` | TDD-0006, TDD-0012 | `34d3501d` | `:944:8` — a documentation-only run may execute only detection, lint, build and the verdict; `:1136:8` — the required-context job must carry no condition; `:1142:8` — the required-context job must depend on nothing that can be skipped |
| `R5` | TDD-0012 | `26aa223b` | `:1142:8` — the required-context job must depend on nothing that can be skipped |
| `R6` | TDD-0007 | `0f61da39` | `:1004:8` — every declared slice must stay in the matrix so its check name persists |
| `R7` | TDD-0009 | `e0037e08` | `:1043:89` — a failed diff must select the full lane set; `:1046:10` — a failed diff must emit a warning annotation; `:1049:10` — the annotation must name git's reason |
| `R8` | TDD-0009 | `0c2f5915` | `:1046:10` — a failed diff must emit a warning annotation; `:1049:10` — the annotation must name git's reason |
| `R9` | TDD-0010 | `fa3e3867` | `:1084:8` — the assistant tree must be excluded as validate-affecting, not as an incidental source path |
| `R10` | TDD-0011 | `66ef9d35` | `:1107:8` — the reason must identify the path as outside every recognized directory |
| `R11` | TDD-0006 | `85e54e21` | `:938:8` — only the verdict may use `always()` to stay unconditional; `:944:8` — a documentation-only run may execute only detection, lint, build and the verdict |
| `R12` | TDD-0006 | `e9dfecd1` | `:983:8` — a crashed detection must reach the verdict rather than skipping every lane into a green run |

#### `TDD-0008`'s rounds, added 2026-08-20 after review finding B6

The twelve rounds above cover `TDD-0006`, `0007`, `0009`, `0010`, `0011` and `0012`. `TDD-0008` is
absent from every one of them, and its `Evidence` cell cited `R7` — which is `TDD-0009`'s round, on
the failed-diff annotation. The omission is not random: `TC-0017-0008` asserts the **accepting**
direction (a documentation-only list narrows, and annotates nothing), and an accepting-direction
claim is the kind a mutation set aimed at rejecting behaviour will skip.

Three rounds, each planted alone into `.github/workflows/ci.yml` and reverted with a byte comparison
against the pre-mutation text:

| id           | mutation                                                              | reddens                                                                                                            |
| ------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `S1`         | the documentation set loses a member, so a documentation-only list stops narrowing | `a documentation-only change must not select the full set: expected true to be false`                  |
| `S2`         | `--no-renames` is dropped from the `git diff` command                 | `every git diff the detect job runs must pass --no-renames on the command itself: expected [ Array(1) ] to deeply equal []` |
| `S3-control` | a comment-only edit above the command                                 | **nothing**                                                                                                        |

### `S2` caught a vacuous assertion in the claim added two commits earlier

Worth recording in full, because it is the third time in this run that a well-formed assertion
turned out to measure nothing, and the first time one of mine survived a commit.

The `--no-renames` claim added for review finding H1 searched the step's whole `run` string:

```text
.filter((run) => run.includes("git diff"))
.filter((run) => !run.includes("--no-renames"))
```

The comment three lines above the command explains the flag **by naming it**. So the string
`--no-renames` was present in the block whether or not it was present on the command, and `S2`
deleted the flag from the invocation while the claim stayed green. The claim now splits the block
into lines, drops comment lines, and asserts over the `git diff` lines themselves.

This is the same failure shape as change 6's inert per-project knobs and change 5's first draft: the
assertion was true of the text and said nothing about the behaviour. In all three cases the oracle
round is what separated them — and here the round only existed because a review pointed out that the
row had none.

| `R13-control` | (control) | `82a27e3f` | **nothing new** |

Six rounds mutate the workflow's SHAPE and six mutate the classifier's RULES, in one oracle on purpose:
change 8's obligation spans a structure branch protection reads and a rule that has to be executed, and
a mutation set covering only one of them would leave the other unmeasured.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 76.1s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.7s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 12.5s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 42.6s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 24.9s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 62.9s |
| `test:scripts` | 10 passed (10) | 107 passed (107) | 8.4s |

Total 235.1s, every one green. No timing claim, per change 6.

### The validate delta, diffed rather than reasoned about

`validate --profile tdd --fail-on error --root .` reports `info=4 warning=376 error=2`, exit 1 — three
below change 7 part 2's 379. `TDDLIST_EVIDENCE_STATUS_ONLY` stays at 96.

I expected seven fewer, since seven rows left `todo`. The diff says otherwise, and the diff is what
went into this record:

```text
removed (4)   TC-0017-0007  TC-0017-0009  TC-0017-0010  TC-0017-0011
added   (1)   TC-0017-0032
net           -3
```

Two things there are worth naming. Only FOUR of the seven promoted rows had been reported stale
beforehand, even though none of the seven `describe` blocks existed at that revision — so the
resolution check reported four absent selectors as resolving and three as not. And `TC-0017-0032` is
newly reported stale although its selector text ("the build is produced once and downloaded by the
rebuild legs") does not appear anywhere in the file its row names; grep returns zero.

Both are the same mechanism, and it is the one `CR-20260818-0001` is open against: resolution is
satisfied by something weaker than the selector being present, so the reported set shifts as a shared
file's content changes and has no stable relationship to which rows are actually stale. Fourth time
this slice has measured it, and the first time it moved in the *helpful* direction — which is worse
than unhelpful, because a count that falls for the wrong reason reads as progress.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all seven rows.

**`TDD-0013` is NOT in this change.** `TC-0017-0013` and `EX-0017-0012` are about the hygiene lane
rejecting a condition on a job the required-context job depends on, and the subject is "the job named in
the required-status-context DECLARATION" — `.github/required-status-contexts.json`, which does not exist
yet and whose own rows are `TDD-0057` … `TDD-0059`. Implementing `TDD-0013` against a hard-coded job
name would contradict `TC-0017-0057` ("the expected-context declaration is read from the tree"), so it
lands with the declaration. `TDD-0006` and `TDD-0012` already assert the structural half over this
tree: the required-context job carries no condition and an EMPTY needs set.

The item-12 checkpoint is not attempted, for the reasons recorded under changes 3 through 7.

## Change 9 — layer separation stays inside the file (TDD-0041, TDD-0042, TDD-0043)

<a id="tdd-0041"></a><a id="tdd-0042"></a><a id="tdd-0043"></a>

`10_Plan.md` step 9, the last: "jobs and matrix legs inside `ci.yml`, partitioned by the cost data step
6 produces. Last, because the partition is the only part of this spec that needs a measurement it does
not itself take." Base revision `2a3ef61c`.

### The separation already exists, and the rules forbid moving its surface

The layer split is the `test` job's seven matrix legs, one per runner project, and it predates this
spec. `BR-0017-0035` keeps it there — "expressed as jobs and matrix legs inside the existing own-CI
workflow file", file count and aggregate check name unchanged.

Reading `TC-0017-0041`'s oracle next to it settles what a cost-driven repartition may be, and the
answer is narrower than the plan sentence suggests: "layer separation adds **no workflow file and no
check name**". A matrix job reports one check per leg, so any repartition that changes the LEG SET adds
or removes check names — and a check name is a repository-settings surface no agent can configure. So
merging the three cheap legs into one, or splitting `core` in two, is not available.

What remains available is a repartition that keeps the seven names and changes what each one covers.
That needs duration data from the runner, and this branch has only local numbers taken on a machine
doing other work — the same data the change-6 record declines to draw a conclusion from. So the
partition is not attempted, and what lands is the invariant it will have to satisfy, landed BEFORE it
rather than after. A guard that arrives after the change it guards against has already failed.

### All three rows passed on their first run

They are accepting-direction regression guards over a state changes 1 through 8 already produce, and
an accepting-direction row cannot be reddened by a no-behaviour seam — that is structural, not
accidental. So `RED failure mode: falsifiability` applies to all three, the RED/GREEN pair is replaced
by the oracle below, and **no RED is claimed**: the first run of this file after the rows landed was
`Tests 22 passed (22)`.

There is no production change in this commit. That is the correct outcome for an invariant this tree
already holds, and stating it plainly is better than manufacturing a diff to make the change look like
the others.

### Literals rather than a before-and-after comparison

`EX-0017-0013` describes "the set of check names a run reports, derived before lane selection lands and
after it lands". A test cannot derive the earlier set without reading git history, and a
history-dependent assertion inside the main suite breaks under a shallow clone — this repository keeps
its one history-dependent check out of `ci:gate` for that reason.

Pinning the fourteen names as literals gets the same guarantee with a better failure: any creation,
removal or rename fails a test that names which one, rather than producing a diff someone has to
interpret. It is also what makes `EX-0017-0004`'s falsifying observation work — no job in this file
declares a `name:`, so each check name IS its job key, and `TDD-0042` asserts that too rather than
assuming it.

### Oracle proof — the falsifiability trio, eight rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | a per-layer workflow file appears — a check name nobody configured | `271306b3` | `:1254:8` — TDD-0041 CLAIM 1 — layer separation may not add a workflow file (plus 1 location(s) in earlier rows — see below) |
| `R2` | one layer is split into its own matrix job instead of staying a leg | `98716625` | `:1268:8` — TDD-0041 CLAIM 2 — the split is the matrix of a single job; `:1313:8` — TDD-0043 — the pinned check-name set (plus 3 location(s) in earlier rows — see below) |
| `R3` | the verdict job is renamed — the repository setting it backs stops resolving | `7ea65c6d` | `:1280:8` — TDD-0042 CLAIM 1 — the verdict job key must not move; `:1313:8` — TDD-0043 — the pinned check-name set (plus 13 location(s) in earlier rows — see below) |
| `R4` | the verdict keeps its key but gains a name, so the rename hides from the key diff | `b0fffae0` | `:1291:8` — TDD-0042 CLAIM 2 — the verdict takes its check name from its key; `:1313:8` — TDD-0043 — the pinned check-name set |
| `R5` | a sibling job claims the verdict's check name | `98cb1e5b` | `:1299:77` — TDD-0042 CLAIM 3 — no sibling may claim the verdict's name; `:1313:8` — TDD-0043 — the pinned check-name set |
| `R6` | a new job appears, adding a check name no repository setting knows | `31c20515` | `:1313:8` — TDD-0043 — the pinned check-name set (plus 3 location(s) in earlier rows — see below) |
| `R7` | a matrix leg is removed, taking one check name with it | `0f61da39` | `:1313:8` — TDD-0043 — the pinned check-name set (plus 1 location(s) in earlier rows — see below) |
| `R8-control` | a comment-only edit beside the verdict | `301c0444` | **nothing new** |

`R3` deserves reading rather than skimming. Renaming the verdict job reddens its own claim and then
eleven more locations, because five change-1 rows resolve the verdict by key and fail on a thrown
lookup. That collateral is not noise — it is the observation `BR-0017-0004` is written around. A rename
of a repository-settings surface is not a quiet change, and a tree in which it were quiet is the tree
the rule forbids.

`R6` and `R7` are the pair that shows `TDD-0043` works in both directions: a job added and a leg
removed each redden the set equality, so the row is not a one-sided "nothing was deleted" check.

### One stale claim corrected

This file's header said it "carries the first change only". That stopped being true four changes ago.
It now names the changes it carries instead of counting them — a count maintained in prose is a count
that goes stale, which is the same lesson the `ci:lint` member count taught under change 3.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 92.7s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 12.4s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 19.4s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 58.5s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 37.5s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 100.8s |
| `test:scripts` | 10 passed (10) | 110 passed (110) | 13.4s |

Total 334.7s, every one green. No timing claim, per change 6 — and note that the numbers in this
table are exactly the data a legal repartition would need, taken on the wrong machine.

### The validate delta

Two below change 8: `info=4 warning=374 error=2`, exit 1. Diffed rather than assumed — two removed
(`TC-0017-0041`, `TC-0017-0043`), none added. `TC-0017-0042` had not been reported stale beforehand
even though its describe did not exist, which is the same uneven resolution recorded under change 8 and
the fifth time this slice has measured it.

### Where the spec stands after the ninth change

The plan's nine sequenced changes have all landed. Forty of eighty-two ledger rows are `refactor`;
forty-two remain `todo`, and they are not leftovers from the nine:

```text
18  workflowHygiene.test.ts     the hygiene lane's remaining rules and its declaration reader
11  actionPinBumpOwner.test.ts  record-shaped rows whose changes have not run yet
 7  layerCiLaneMapping.test.ts  the layer-to-CI-lane mapping document, a separate deliverable
 6  ownWorkflowTopology.test.ts TDD-0030 (blocked, CR-20260820-0001), TDD-0032 (deferred as a
                                measurement), and TDD-0036/0038/0039/0040
```

Four of that last six are landable now and two are not: `TDD-0030` waits on `CR-20260820-0001`, and
`TDD-0032` is build-artifact reuse, which `10_Plan.md` deliberately excludes from the nine — "it is a
measurement, not a step, and its outcome may legitimately be to keep the rebuilds".

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all three rows. The
item-12 checkpoint is not attempted, for the reasons recorded under changes 3 through 8.

## After the nine — the required-context job's integrity and upload hygiene (TDD-0036, TDD-0038, TDD-0039, TDD-0040)

<a id="tdd-0036"></a><a id="tdd-0038"></a><a id="tdd-0039"></a><a id="tdd-0040"></a>

Not part of `10_Plan.md`'s nine sequenced changes. These are `AC-0017-0016` and `AC-0017-0017`, and they
became landable once changes 7 through 9 settled what the required-context job is and what it performs.
Base revision `4ec429e3`.

### `BR-0017-0032` is explicit about what it is NOT satisfied by

"Any split, fold or restructuring MUST leave a job of the exact name `build` that is unconditional and
that still performs — or depends on jobs that perform — every item of its enumerated verification set.
**Keeping the name alone is explicitly not sufficient.**"

That last sentence exists because the cheap way to satisfy a required status context is to keep a job
with the right name and move its work elsewhere: the check stays green, the repository setting stays
valid, and nothing is verified. So `TDD-0036` asserts all three properties in one row — name, absence
of a condition, and every item still reachable — and oracle `R1`/`R2`/`R3` take one each.

**The "or depends on" clause is modelled but not exercised, and that is worth saying.** `reachableSteps`
walks the transitive `needs` closure, so an item that migrated into a job `build` needs would still
count. No such job exists: `build` declares an empty `needs` set, and `BR-0017-0012` forbids giving it
one that can be skipped. So the clause is implemented against a case this tree cannot currently produce.
Leaving it out would have been simpler and wrong — the rule says the closure counts, and a row that
asserted only the job's own steps would reject a legal restructuring.

### What `TDD-0038` adds over `TC-0017-0073`, proven rather than argued

Change 7 already forbade a toothless verification item, and its claim tests
`continue-on-error === true`. That key accepts an **expression**, so
`${ github.event_name == 'push' }` is neither `true` nor `false` at parse time: it slips past an
equality check and does exactly what `BR-0017-0033` forbids on the runs where it evaluates true.

`TDD-0038` therefore rejects the key's PRESENCE on a verification item, not a particular value. A
verification item has no legitimate reason to carry it at all. Oracle `R4` and `R5` are the pair that
settles whether this is duplication:

```text
R4  continue-on-error: true                              -> reddens :1438 AND :782 (both rows)
R5  continue-on-error: ${ github.event_name == 'push' } -> reddens :1438 ONLY
```

The expression form is invisible to the older row. Without `R5` the two rows would look like the same
claim written twice.

### The two rows with a real RED, and the production change

`TDD-0039` and `TDD-0040` failed on assertions before the edit: the upload carried `if: always()`, no
`if-no-files-found`, and `retention-days: 14`.

- **`always()` to `!cancelled()`.** The difference is a cancelled run. The upload is most useful when
  the job FAILED and worth nothing when nobody waited for the result; `always()` pays for both.
- **`if-no-files-found: warn`.** The step that produces the report tolerates its own failure, so the
  files may legitimately be absent. Without this the upload fails the job for something that is not a
  verification failure — and the job it would fail is the one carrying the required status context.
- **Retention 14 to 7.** `BR-0017-0034` says at most seven. Asserted as a boundary in both directions,
  because an ABSENT value is not a pass either: the action's own default is ninety days, so removing
  the key is a regression that a "less than or equal to seven" check alone would accept as `undefined`.

The adjacent `Run qfai report (optional)` step keeps its `if: always()`. `BR-0017-0034` governs the
upload, no row asserts the report step, and changing production behaviour that no test covers is the
move this slice has spent nine changes not making.

### The pipe hazard recurred, in the same shape

A ledger Evidence cell quoted a shell fragment containing two pipe characters, and the row split into
twelve fields instead of ten — `markdownlint` then reported one error and the table realigned around
the malformed row. Second occurrence; change 6 recorded the first and built the repair that rebuilds a
row from its first nine fields rather than editing cell 8 in place, which is what fixed it here in one
pass. The cell now describes the behaviour instead of quoting the operator.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/ownWorkflowTopology.test.ts`
- **RED result**: `Tests 2 failed | 24 passed (26)`, exit 1 — `TDD-0039` on three assertions and
  `TDD-0040` on one, no load error. `TDD-0036` and `TDD-0038` passed, so
  `RED failure mode: falsifiability` applies to those two.
- **GREEN result**: same command, `Tests 26 passed (26)`.

### Oracle proof — ten rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the required-context job is renamed, so the repository setting stops resolving | `34b1da53` | `:1397:8` — TDD-0036 CLAIM 1 — a job of the exact name `build` must exist; `:1415:8` — TDD-0036 CLAIM 3 — every verification item must stay within reach (plus 10 location(s) in earlier rows) |
| `R2` | the required-context job gains a condition, and a skipped job reports success | `7c9201e5` | `:1403:8` — TDD-0036 CLAIM 2 — the required-context job must carry no condition (plus 2 location(s) in earlier rows) |
| `R3` | one verification item leaves the job entirely — the name kept, the work moved | `d89541c6` | `:1415:8` — TDD-0036 CLAIM 3 — every verification item must stay within reach (plus 1 location(s) in earlier rows) |
| `R4` | a verification item is weakened with a literal continue-on-error | `02762362` | `:1438:8` — TDD-0038 — no verification item may carry `continue-on-error` (plus 1 location(s) in earlier rows) |
| `R5` | a verification item is weakened with an EXPRESSION, which an equality check misses | `ce122dc8` | `:1438:8` — TDD-0038 — no verification item may carry `continue-on-error` |
| `R6` | the upload goes back to always(), so a cancelled run still uploads | `c80aa15d` | `:1460:12` — TDD-0039 CLAIM 1 — the upload must not run on a cancelled run; `:1463:8` — TDD-0039 CLAIM 1 — and must still run when the job failed |
| `R7` | the missing-file tolerance is dropped, so an absent report fails the required-context job | `a6d19538` | `:1473:8` — TDD-0039 CLAIM 2 — a missing report must not fail the job |
| `R8` | retention crosses the boundary by one day | `708e4d24` | `:1496:8` — TDD-0040 — retention must be declared and at most seven days |
| `R9` | retention is removed, which is not a pass — the action defaults to ninety days | `6544679c` | `:1496:8` — TDD-0040 — retention must be declared and at most seven days; `:1497:75` — TDD-0040 — and must be a positive number of days |
| `R10-control` | a comment-only edit inside the upload block | `e5b61bde` | **nothing new** |

`R1` renames the required-context job and reddens twelve locations, because several helpers resolve it
by name and throw. Same shape as change 9's `R3`, and the same point: a rename of a
repository-settings surface is not a quiet change.

### The suite, and the slice that failed

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 148.2s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 13.5s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 22.4s |
| `test:integration` | 1 failed | 123 passed | 4 skipped (128) | 1 failed | 861 passed | 19 skipped (881) | 78.0s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 45.1s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 99.7s |
| `test:scripts` | 10 passed (10) | 114 passed (114) | 13.3s |

Total 420.2s. **Six slices green and `integration` failed**, and the failure is not this change's.
It is recorded here rather than re-run away because what it turned up matters more than this commit.

### The declared worker value of ten makes the integration slice flaky, measured

The failing test is `tests/integration/shippedWorkflowDetection.test.ts`, `TC-0003-0039` — a
**`spec-0003`** row about the SHIPPED workflow's detection, and it does not read the file this change
touched (grep for the own `ci.yml` in it returns zero). All three of its cases failed with
`Test timed out in 15000ms`; none failed an assertion.

Isolation and then attribution, in that order:

```text
the file alone                                    10 passed          (so: not broken)
the integration slice, workers=10  conc=10         3 timeouts        (sweep, then again alone)
the integration slice, workers=10  conc=5          3 timeouts        (so: not the concurrency axis)
the integration slice, workers=4   conc=5        862 passed          (so: the WORKER axis)
```

This machine reports fourteen logical CPUs. The failing describe builds temporary git repositories and
runs several git commands per case against a fifteen-second timeout; ten forks oversubscribe enough that
it does not finish. The file uses no `.concurrent`, which is why the concurrency axis makes no
difference and the worker axis makes all of it.

So change 6's declared starting value of ten is the cause, it is load-dependent — the sweeps under
changes 6, 7, 8 and 9 were all green at ten — and load-dependent is what `BR-0017-0050` means by
"flakier".

**Nothing is changed here in response.** `BR-0017-0048` makes ten the user's declared starting value and
`BR-0017-0051` puts revising it behind the user's sign-off: "no agent may substitute a different
starting value on the strength of its own measurement." Setting a CI-side override instead would be
adopting a value by another name, which `BR-0017-0049` gates on a timing artifact over the LARGEST
project — `core`, not `integration` — with one project per pull request and three green runs recorded.
Raising the fifteen-second timeout would mask contention, which is the family `BR-0017-0052` rules out.

Worth adding for whoever decides: GitHub-hosted runners are commonly four-CPU, so ten forks there
oversubscribe considerably harder than they do on the fourteen measured above. This is not a
this-machine-only observation.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all four rows. The
item-12 checkpoint is not attempted, for the reasons recorded under changes 3 through 9.

## The worker value stays ten, and the structure was the problem

This section supersedes the previous one's closing paragraph. That paragraph said the flaky
`integration` slice "needs the user", framed the cause as ten forks oversubscribing a fourteen-CPU
machine, and changed nothing. The user rejected the framing:

> Ten is mandatory. Make a structural change so it does not go flaky. I do not accept the claim that it
> is flaky because of ten-way parallelism — just fix the structures and mechanisms that create
> dependencies or contention.

That is the correct instruction and my analysis had stopped one question short. "Oversubscribed" names
a symptom; it does not say what these tests share or repeat. They repeat almost everything.

### What the three timing-out cases actually did

`TC-0003-0039` has three `it()`s and each called `runDegradedCases()`. Process spawns for ONE call:

```text
3 x makeRepo()      init + 3 config + add + commit + rev-parse    21 git spawns
3 x commitChange()  add + commit                                   6 git spawns
1 x git clone --depth 1                                            1 git spawn
3 x runDetection()  read + parse the shipped YAML, then bash       3 shells
```

Three tests, so roughly **eighty-four git spawns and nine bash runs to build one fixture set three
times** — for fixtures the describe's own comment calls "the SAME three degraded fixtures". A process
spawn on this platform costs tens of milliseconds, which is the entire fifteen-second budget. The
timeout was not contention for a lock or a path; it was volume, and the volume was almost all repeat.

### Three structural fixes

- **The fixture set is memoized.** Not moved into `beforeAll`, and the reason is worth keeping: the
  temp-directory pool registers an `afterEach` that deletes every directory it handed out, so a
  `beforeAll` fixture would build repositories that vanish after the first test. What the tests read is
  the RUN RESULT — status, streams, parsed outputs — which outlives the directory it came from, so
  memoizing the result is safe where hoisting the setup is not.
- **The shipped orchestrator document is read and parsed once per worker process.** It was re-read on
  every detection run and by several other tests in the file, and it is a fixture in the repository
  that cannot change while the suite runs. The promise is cached rather than the value, so concurrent
  callers share one read instead of racing to fill a slot.
- **Identity and signing move to `-c` flags**, removing three `git config` spawns per fixture
  repository at identical effect.

None of the three changes what any test asserts.

### Measured at the declared value, not at a lowered one

```text
the file alone, before          22.90s   (tests 22.15s)
the file alone, after            5.49s   (tests  5.11s)
integration slice, workers=10   862 passed, 4 skipped, ZERO timeouts, 37.66s
```

A 4.2x reduction in the file, and the slice passes at ten. `DECLARED_START` is untouched, so
`BR-0017-0048`'s ten stands and `BR-0017-0051` never came into play — there was no value to sign off
on, because the value was not the defect.

### Scope checked rather than assumed

The anti-pattern is local. `shippedWorkflowPortability.test.ts` makes sixteen `runShell` calls and they
are sixteen distinct scenarios rather than one repeated — 11 tests in 5.23s. The only other
`git config` triplet is in `validators/upstreamSsotGuard.test.ts`, which is not on the failing path and
passes in 9.19s; left alone rather than swept up, and named here so the next person can find it.

### The suite at ten

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 85.7s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.9s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 13.1s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 42.4s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 23.7s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 58.7s |
| `test:scripts` | 10 passed (10) | 114 passed (114) | 7.5s |

Total 239.0s, every slice green at the declared worker value.

## The expected-required-context declaration (TDD-0057, TDD-0058, TDD-0013, TDD-0037, TDD-0059)

<a id="tdd-0013"></a><a id="tdd-0037"></a><a id="tdd-0057"></a><a id="tdd-0058"></a><a id="tdd-0059"></a>

`AC-0017-0025`, and the change that unblocks `TDD-0013`. Base revision `dd894914`.

### Why a checked-in file, and why these three properties

Which checks branch protection requires is a repository SETTING, and a pull request cannot read it.
`BR-0017-0042` resolves that by moving the expectation into the tree: `.github/required-status-contexts.json`
names the job expected to carry the context, and the hygiene lane checks the workflow against it. Reading
live settings is forbidden — not as a preference, but because a check that cannot run on a pull request
blocks nothing.

`BR-0017-0043` fixes what the lane asserts: the declared context resolves to an existing job, that job is
not skippable counting a condition on any job it depends on, and its enumerated verification set is
intact. One row each, because a single "the lane exits 1" row passes on any one of the three working.

### `build` and not `ci-pass`, and the declaration says why

The aggregate verdict carries `if: always()` on purpose — it has to run when its dependencies are
SKIPPED, which is exactly what a documentation-only pull request produces. A declaration naming it would
assert two things that cannot both hold: that the job carries no condition, and that it runs when
everything it needs was skipped.

`BR-0017-0007` settles it rather than leaving it to taste: "at most four job instances **while the job
named `build` carries the required status context**, and at most three once that context moves." So
`build` holds it today, the move is anticipated, and the declaration is where a move gets recorded. That
reasoning is in the file, not only here — a declaration a reader cannot audit is a constant with extra
steps.

### The oracle found a row that passed with the check it tests removed

`R1` deletes the existence property outright. On the first run it reddened **nothing**.

The reason is worth keeping: with the check gone, execution fell through to the verification-set
property, found no steps because the job was not there, and reported every declared item as missing. The
lane still exited 1 with the rule named — so `TDD-0058`, which asserted exit code and rule name, passed.
What had been lost was the DIAGNOSIS: six findings about moved steps in a job that does not exist, sending
the operator to look for relocated work rather than a rename.

So the row now asserts the report's SHAPE — an absent job is one fact and must be reported once. That is
the property the lane's `continue` provides and the property `R1` destroys. Second time in this session
that an oracle round reddening nothing exposed a vacuous assertion rather than a missing mutation; the
first was `R9` under change 8.

### A path separator produced a real-looking violation for a non-existent problem

The first run of the finished rule reported `job build: is named in the declaration but ci.yml declares
no such job (declared jobs: none)` against the real tree. Nothing was wrong with the tree.
`yamlFilesUnder` normalises every path it returns with `.replace(/\\/g, "/")`, and my lookup built the
comparison path with `path.join`, which on Windows yields backslashes. The filter matched nothing, so
every job read as absent.

Worth recording because of the failure mode rather than the bug: it did not crash and it did not pass
silently — it produced a confident, well-formatted, completely wrong finding. A lane that reports
precisely is a lane whose own path handling has to be right.

### The verification set now lives in two places, and a claim pins them together

Introducing the declaration put the six-item list in the declaration AND in the literals `TDD-0036` and
`TC-0017-0073` hold. Two copies of one list is the defect this spec has caught three times.

What makes it acceptable is that one is production data a lane reads and the other is this suite's
expectation of it — testing data against an expectation is ordinary. What makes it SAFE is `TDD-0036`'s
new fourth claim, which asserts the two agree. Without it the copies drift silently; with it a wrong
change has to be made consistently in three places — the workflow, the declaration and the row. `R7`
mutates the declaration alone and reddens that claim.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/workflowHygiene.test.ts`
- **The first RED was inadmissible** and is recorded as such: four of six failures were `ENOENT` on the
  declaration, which is a row that could not run rather than a behaviour that is absent. The seam is the
  declaration FILE — data the rows need in order to execute — with no lane rule behind it. The second
  RED is `Tests 6 failed | 10 passed (16)` with every failure an assertion.
- **GREEN result**: same command, `Tests 16 passed (16)`. The lane over the real tree exits 0 and now
  prints four rules rather than three, and its not-covered line no longer claims the declaration is
  unchecked.

### Oracle proof — eight rounds over the lane and the declaration

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | property 1 is dropped — a declared job that does not exist stops being reported | `754d3009` | `TC-0017-0058` |
| `R2` | the needs closure shrinks to the job itself, so a condition on a dependency is missed | `9cd70d35` | `TC-0017-0013`, `TC-0017-0037` |
| `R3` | property 3 is dropped — a shrunk verification set stops being reported | `de01ef97` | `TC-0017-0059` |
| `R4` | the declaration stops being read: the job name is compiled in instead | `a9e6f447` | `TC-0017-0057` |
| `R5` | the rule leaves the printed rule set, so a green run stops naming its own coverage | `9167b453` | `TC-0017-0057` |
| `R6` | the lane reaches for live settings, which cannot run on a pull request | `18dda3d8` | `TC-0017-0057` |
| `R7` | the declaration's verification set drifts from the topology row's literals | `65954c0a` | `TC-0017-0018`, `TC-0017-0036`, `TC-0017-0057` |
| `R8-control` | a comment-only edit in the lane | `e452ec38` | **nothing new** |

Rounds are reported by failing ROW rather than by line number, because two test files are involved and
two files mean two numbering spaces. `R7` also reddens `TC-0017-0018` and `TC-0017-0036`: mutating the
declaration makes the real tree violate it, so the lane's own green-run row objects too. That is correct
rather than noise.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 79.2s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.4s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 13.1s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 40.7s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 24.6s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 64.1s |
| `test:scripts` | 10 passed (10) | 120 passed (120) | 9.5s |

Total 238.6s, every one green at the declared worker value.

### The validate delta

Three below the previous change: info=4 warning=369 error=2, exit 1. Diffed, not assumed - four
removed (TC-0017-0037, TC-0017-0057, TC-0017-0058, TC-0017-0059) and one added, TC-0017-0046, whose
selector text appears nowhere in the file its row names; grep returns zero. The same uneven resolution
CR-20260818-0001 is open against, and the sixth time this slice has measured it: adding content to a
shared test file changes which absent selectors are reported as resolving.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all five rows. The
item-12 checkpoint is not attempted, for the reasons recorded under the earlier changes.

## The hygiene rule set, closed and legible (TDD-0044 … TDD-0049)

<a id="tdd-0044"></a><a id="tdd-0045"></a><a id="tdd-0046"></a><a id="tdd-0047"></a><a id="tdd-0048"></a><a id="tdd-0049"></a>

`AC-0017-0019`, `AC-0017-0020` and `AC-0017-0021`. Base revision `4e29a2a4`.

### The set was three rules, and one of those was half a rule

`BR-0017-0037` enumerates five obligations over `.github/workflows/**`: every job declares permissions
**and `timeout-minutes`**; every checkout refuses to persist credentials; every action reference is
SHA-pinned; every matrix disables fail-fast; secret inheritance appears nowhere.

Change 2 shipped three, and its first — `permissions-reachable` — covered only the permissions half of
obligation one. So this change adds `timeout-minutes` to it, adds the two missing rules, and renames it:
an id that says "permissions" while also failing on a missing timeout sends the operator to the wrong
line. Every job in the tree already declares a timeout, every matrix already disables fail-fast, and no
job declares `secrets:` — so all three additions are regression guards, which is what `AC-0017-0019`
("exits 0 over the hardened tree") asks for.

### "Exactly five" is now reproducible from the output

The declaration rule from the previous change is not one of the five: its subject is a JSON file checked
against the workflows and it comes from a different criterion. The lane therefore carries a SCOPE per
rule and prints two labelled groups.

That is what lets `TDD-0045` assert the closure without a hand-kept exclusion list. The first draft
filtered the declaration rule out by name while its own comment claimed it was excluded by scope; with
two groups the row asks for the workflow group and the claim matches the code. A name filter would also
have let a rule from a third scope join the count silently.

Two implementation details worth their comments:

- **`fail-fast !== false`, not falsy.** The key's ABSENCE means fail-fast is ON — that is the default the
  rule exists to override — so a missing key and an explicit `true` are the same failure. A truthiness
  test would pass the missing one, which is the more likely of the two.
- **`secrets !== undefined`, not `=== "inherit"`.** Any secret declaration on a job undoes the
  permission block above it; restricting a job to `contents: read` while handing it the caller's secret
  set is restriction in name only.

### `TDD-0047` compared two static lists, and the oracle is what showed it

`BR-0017-0038` says an unevaluated rule must be ABSENT from the printed list rather than implied by a
green result. The falsifying shape is a lane that PRINTS a rule it does not RUN.

The first draft compared the printed ids against the ids in this file's plant table — both static — so
that shape would have passed, and the row would have been a restatement of `TC-0017-0048`. It now DERIVES
the evaluated set by running each plant and recording which rule the lane actually reports, then asserts
printed equals evaluated.

Oracle `R1` and `R3` are the pair that proves the difference. Both break the matrix or timeout obligation,
in different places: `R1` removes a CHECK while the rule stays printed, `R3` removes the CALL while both
the check and the print survive. `R3` is the "advertised but unevaluated" shape, and only the rewritten
row sees it.

### Two couplings the oracle exposed, both fixed

- **`TDD-0049` took the first plant off the list**, so removing the timeout check made the namespace row
  fail for a reason with nothing to do with namespaces. It now selects the pin plant by RULE. The
  subject is the code emitted, so which rule it breaks is incidental and the most stable one is the right
  choice.
- **`R4` reddens three change-3 rows as well as `TDD-0049`.** Changing the emitted code breaks every row
  that names it, which is correct rather than noise — the code is a contract with the lint aggregate.

### A sibling row caught the fixture, for the second time in this slice

The action-pin plant originally wrote `uses: actions/checkout@` followed by a major tag, because that is
the obvious way to make a reference float. `spec-0003`'s `shippedWorkflowPins` row scans **every test file
in the suite** for a floating-major literal — the whole suite, not the shipped tree — and objected:

```text
FAIL tests/integration/shippedWorkflowPins.test.ts > TC-0003-0030 >
  DTC-26 co-change: no test in the suite expects a floating-major reference for the shipped workflows
```

The plant now uses a BRANCH reference instead. The pin rule forbids anything that is not forty hex
characters, so either form falsifies it, and a branch carries no floating-major literal. Not a reason to
weaken the scan: the sibling row is doing exactly its job, and the fixture had a cheaper shape available.

Second time this slice a sibling row has caught something in a file it does not own — change 4's was a
comment rather than a fixture. Both were found only by the whole suite, which is the argument for the
item-12 checkpoint asking for it rather than for the row's own test.

### A bad edit, and what made it safe

Removing the now-dead `checkPermissions` the first time also deleted `collectJobs`: the script walked
backwards from the function for a docblock and swallowed its neighbour. The lane then failed with
`collectJobs is not defined` — loud, immediate, and traceable, which is the only reason it cost minutes
instead of a wrong green.

The second attempt measured the span first (eleven lines, printed and read), refused unless the span
contained no second `function` declaration, and verified the lane still loaded before anything else was
written. Recorded because the lesson is about the method rather than the mistake: an edit that deletes
code should assert what it is about to delete, not infer it.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/workflowHygiene.test.ts`
- **RED result**: `Tests 6 failed | 16 passed (22)`, exit 1, every failure an assertion. `TDD-0047` named
  `permissions-reachable` as a printed rule with no falsifying fixture, which is what made the rename
  necessary rather than cosmetic.
- **GREEN result**: same command, `Tests 22 passed (22)`. The lane over the real tree exits 0 and prints
  five workflow-tree rules and one declaration rule.

### Oracle proof — eight rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the timeout half of the first obligation is dropped, while the rule stays printed | `b058fba4` | `TC-0017-0047`, `TC-0017-0048` |
| `R2` | the matrix rule leaves the printed set, while its check keeps running | `fc6ae825` | `TC-0017-0044`, `TC-0017-0045`, `TC-0017-0046`, `TC-0017-0047` |
| `R3` | the matrix rule stays printed while its check stops being called — advertised, unevaluated | `85cb6e40` | `TC-0017-0047`, `TC-0017-0048` |
| `R4` | findings leave the bare-R namespace | `b031cc88` | `TC-0017-0017`, `TC-0017-0020`, `TC-0017-0023`, `TC-0017-0049` |
| `R5` | the printed rules lose their descriptions | `56c9e599` | `TC-0017-0046` |
| `R6` | the coverage boundary stops being printed, so green reads as a blanket assurance | `2b766fb1` | `TC-0017-0046` |
| `R7` | a sixth workflow-scoped rule appears, which the rule text does not authorize | `e8556b34` | `TC-0017-0045`, `TC-0017-0047` |
| `R8-control` | a comment-only edit beside the rule registry | `4777f5ba` | **nothing new** |

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 76.1s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.5s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 12.6s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 39.0s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 25.4s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 67.8s |
| `test:scripts` | 10 passed (10) | 126 passed (126) | 15.3s |

Total 243.7s, every one green.

### The validate delta

Four below the previous change: info=4 warning=365 error=2, exit 1. Diffed - five removed
(TC-0017-0044, 0046, 0047, 0048, 0049) and one added, TC-0017-0053, which this change does not touch.
TC-0017-0045 was not among the five even though it moved out of todo, and TC-0017-0053 joined without
its selector appearing in any file. Seventh measurement of the same uneven resolution CR-20260818-0001
is open against.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all six rows. The
item-12 checkpoint is not attempted, for the reasons recorded under the earlier changes.

## The shipped tree joins the lane (TDD-0050, TDD-0051, TDD-0053, TDD-0054, TDD-0055, TDD-0056)

<a id="tdd-0050"></a><a id="tdd-0051"></a><a id="tdd-0053"></a><a id="tdd-0054"></a><a id="tdd-0055"></a><a id="tdd-0056"></a>

`AC-0017-0022`, `AC-0017-0023` and `AC-0017-0024`. Base revision `4a4c0954`.

### The ordering condition was checked before anything was written

`BR-0017-0045` forbids enabling the shipped scan over an unhardened tree: it "lands instantly red", and
a lane that arrives red is a lane someone disables. Measured first — every shipped job declares
permissions and a timeout, every reference is SHA-pinned, no job declares `secrets:`, and there is no
matrix to disable fail-fast on because `qfai-tests.yml` expresses its lanes as seven independent JOBS.
The condition holds, so the coverage lands here rather than waiting.

### Two roots, not a copy

`BR-0017-0044` allows either "copying it into the workflows directory inside the CI checkout or
pointing the script at both trees". Two roots is chosen, and `TDD-0051` is the row that makes the choice
matter: a copy-based implementation exits 1 on a shipped-only violation too, but names
`.github/workflows/qfai-tests.yml` — telling an adopter to look in a file they do not have. So the row
asserts not only that a shipped violation is reported, but that NOTHING is reported against the own tree.

`TDD-0050` plants in both trees in ONE run. Two separate runs would each prove one root is scanned and
neither would prove they are scanned together, which a lane scanning whichever tree it was pointed at
would satisfy.

### The one rule here that is not a count

`BR-0017-0046` rejects a formulation by name: "expressing it as a count of zero MUST be rejected,
because it would fail the lane on the one action the shipped pin policy legitimately keeps". That action
is `pnpm/action-setup`, and it is the only third-party reference in the shipped set — measured, not
assumed.

`TDD-0053` therefore has two halves, and the second is what keeps it honest: exiting 0 would also be
satisfied by a lane with no third-party rule at all, so the row asserts the fixture actually CONTAINS a
third-party reference. A row that passes over an empty premise proves nothing about the rule.

### The oracle found two holes, and neither was in the lane

- **`R4` removed the shipped rule from the printed registry and reddened NOTHING.** `TDD-0053` asserted
  the shipped HEADING appears, and the heading comes from the scope list rather than the rule list — so
  a heading standing over nothing satisfied it. The row now asserts the rule is LISTED under it.
- **`R7` removed the shipped rule's CALL while leaving it printed, and reddened only `TDD-0054`.**
  `TC-0017-0047` — printed equals evaluated — parsed the structural scope only, so the shipped scope had
  no such guard at all. `BR-0017-0038` is about the printed list, not one section of it; the row now
  reads every scope, and the plant table gained the shipped entry it needs to derive the evaluated set.

That second fix forced a third: the plant table now carries the FILE each finding must name. `TDD-0048`
had `ci.yml` hard-coded, which was fine while every plant was in the own tree and wrong the moment a
shipped plant joined — the shipped finding names a path under the asset tree.

### A stale claim in the lane's own output

The coverage boundary said "Not covered here: the shipped workflow set". After this change that is
false. It now names what is genuinely uncovered — runner-label rules, secret-reference rules, and the
shipped set's contract SHAPE, which `lint:workflow-shape` owns rather than this lane. A boundary
statement is only useful while it is true, and this one had one commit of accuracy left in it.

### Two stale plant needles, caught by the harness

`editShipped` refuses to write a file its edit did not change, and it fired twice: the first draft
planted a `fail-fast` violation into a tree with no matrix, and pointed the third-party plant at
`qfai-tests.yml` when the sanctioned action lives in `qfai-validate.yml`. Both would otherwise have been
plants that changed nothing — a passing row over an intact fixture, indistinguishable from a working
rule.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/scripts/workflowHygiene.test.ts`
- **RED result**: `Tests 4 failed | 24 passed (28)`, exit 1, every failure an assertion. `TDD-0055` and
  `TDD-0056` passed at RED — the lane was already in the right aggregate and absent from the wrong one —
  so `RED failure mode: falsifiability` applies to those two, with `R5` and `R6` carrying it.
- **GREEN result**: same command, `Tests 28 passed (28)`.

### Oracle proof — eight rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the shipped root leaves the scan entirely | `83a955bc` | `TC-0017-0047`, `TC-0017-0048`, `TC-0017-0050`, `TC-0017-0051`, `TC-0017-0054` |
| `R2` | the shipped tree is still scanned, but its jobs are tagged as own-tree ones | `c5daa25d` | `TC-0017-0047`, `TC-0017-0048`, `TC-0017-0054` |
| `R3` | the third-party rule becomes a count of zero, failing the entry the pin policy keeps | `124d2681` | `TC-0017-0018`, `TC-0017-0044`, `TC-0017-0045`, `TC-0017-0046`, `TC-0017-0047`, `TC-0017-0048`, `TC-0017-0053`, `TC-0017-0057` |
| `R4` | the shipped rule leaves the printed set, so its scope stops being announced | `371e9c72` | `TC-0017-0047`, `TC-0017-0053` |
| `R5` | the lane leaves the lint aggregate a pull request executes | `d0285ddc` | `TC-0017-0055` |
| `R6` | the lane is added to the release-only aggregate, where no pull request invokes it | `b5c3fb04` | `TC-0017-0056` |
| `R7` | the shipped rule stays printed while its check stops being called | `a13f33f8` | `TC-0017-0047`, `TC-0017-0048`, `TC-0017-0054` |
| `R8-control` | a comment-only edit beside the shipped roots | `f7674537` | **nothing new** |

`R2` is the round worth reading. It leaves the shipped tree SCANNED but tags its jobs as own-tree ones:
the structural rules still cover them and the paths are still reported correctly, so the two path rows
stay green and only the shipped-scoped rule goes blind. That separates "the shipped tree is scanned"
from "the shipped-only rule applies to it" — two claims a single coarser mutation would have conflated.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 94.4s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 9.4s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 15.6s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 44.3s |
| `test:e2e` | 74 passed | 4 skipped (78) | 891 passed | 16 skipped (907) | 30.2s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 73.3s |
| `test:scripts` | 10 passed (10) | 132 passed (132) | 17.0s |

Total 284.2s, every one green.

### The validate delta

Five below the previous change: info=4 warning=360 error=2, exit 1. Five removed
(TC-0017-0050, 0051, 0053, 0054, 0056) and none added - the first clean delta in this slice, with
every promoted row accounted for except TC-0017-0055, which had not been reported stale beforehand.
Same uneven resolution as the six previous measurements.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all six rows. The
item-12 checkpoint is not attempted, for the reasons recorded under the earlier changes.

## The record rows whose artifact exists (TDD-0025, TDD-0026, TDD-0052, TDD-0066, TDD-0067)

<a id="tdd-0025"></a><a id="tdd-0026"></a><a id="tdd-0052"></a><a id="tdd-0066"></a><a id="tdd-0067"></a>

Five of the eleven record-shaped rows, chosen because their artifact either already exists or can be
written from what actually happened. Base revision `8bd05615`.

The six left alone are gated on work that has not run: `TDD-0033`/`0034`/`0035` are cost claims about
build-artifact reuse, which `10_Plan.md` excludes from the nine as "a measurement, not a step";
`TDD-0065` needs an adopted worker value and no value has been adopted; `TDD-0069`/`0070` are process
constraints on tuning changes and no tuning change has landed.

### Two rows were already satisfied, and that is the honest reading

`DR-0017-0003` has named the pin bump owner since the spec was authored — as a ROLE, bound to release
preparation, with the reasoning for both choices written down. So `TDD-0025` and `TDD-0026` passed on
their first run: they are regression guards over a record that already says what its rule requires, and
`RED failure mode: falsifiability` applies with `R1` and `R2` carrying it.

`TDD-0026` is the more interesting of the two because it asserts a pair. Three candidate bump
configurations are asserted absent — `BR-0017-0023` forbids creating one without the user — AND the
owner is asserted recorded anyway. The absence is only acceptable BECAUSE the record exists, so a row
that checked only the prohibition would pass on a repository with neither.

### `DR-0017-0008`: the ordering check, recorded because it is not recoverable afterwards

`BR-0017-0045` allows shipped coverage to land with the hardening or later and forbids it landing
earlier. The distinction lives entirely in what was true at the moment the scan was switched on, and a
reviewer reading the commit that adds the scan cannot recover it: they see a lane that passes, and
cannot tell whether it passes because the tree was hardened first or because the rules were written to
fit whatever the tree happened to be.

So the record carries the check's RESULTS — permissions, timeouts, pins, no `secrets:`, and the absence
of `fail-fast` explained rather than asserted (there is no matrix to disable it on). `TDD-0052` asserts
those specifics, not that a check occurred.

### `DR-0017-0009`: the parallelism episode, including the outcome the rule does not name

The declared value of ten measured flakier. The measurement is in the record with its numbers, one
variable changed per row, because `BR-0017-0030` forbids a parallelism claim landing on argument.

Then the part worth reading: a revision was proposed, put to the user because `BR-0017-0051` reserves
it, and REFUSED — along with its framing. The instruction was to correct the structure that creates the
contention rather than the number that exposes it, and that turned out to be right: the cause was
volume, almost all of it repeated, and removing it took the file from 22.90s to 5.49s with the slice
passing at ten.

`BR-0017-0050` says a flakier higher value means the lower one is kept. That is not what happened — the
higher value was kept and the flakiness removed. Recording it as compliance would be false; recording it
as a violation would be worse, because the rule's purpose was served more completely than its letter
asks. The record says so in those terms, and `CR-20260820-0005` carries the question of whether the rule
should name this third outcome. The record also states what did NOT happen: no re-run loop, which
`BR-0017-0031` forbids and which was the nearest available temptation given that four earlier sweeps had
been green at ten.

### Four claims matched words that survive their own mutation

The first oracle run reported four rounds reddening nothing. One was the mutation's fault and three were
the claims':

```text
R1  /release preparation/  the register writes "Release preparation" at the start of a sentence,
                           and the round replaced only the lowercase form
R4  /already|preced|in place|before/  "before" and "first" appear elsewhere in the same section
R6  /kept|retained|unchanged/         "kept" appears in the QUOTED rule text the record cites
R7  /propos|asked|sign-off/           "sign-off" appears in the very next sentence
```

The three claim failures share one cause worth naming: a record that QUOTES its rule makes the rule's
own vocabulary the most likely thing an over-broad alternation will collide with. `BR-0017-0050` says
"the lower setting MUST be kept", so a claim matching `kept` passes over a record saying the opposite of
what it needs to say. Each claim now names the SENTENCE its rule requires — `enabled only after`,
`higher setting was **kept**`, `proposed lowering` — rather than a word the surrounding prose is likely
to contain.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/assets/actionPinBumpOwner.test.ts`
- **RED result**: `Tests 3 failed | 4 passed (7)`, exit 1 — the two missing decisions and one regex on
  an empty section, all assertions.
- **GREEN result**: same command, `Tests 7 passed (7)`.

### Oracle proof — nine rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the pin owner's recurring moment is removed, leaving an owner with no cadence | `ef1d087e` | `TC-0017-0025` |
| `R2` | a bump configuration appears at a root the user never approved | `e180032a` | `TC-0017-0026` |
| `R3` | the shipped-ordering record stops naming what was verified | `0a3e73a2` | `TC-0017-0052` |
| `R4` | the shipped-ordering record stops saying the hardening came first | `69804e17` | `TC-0017-0052` |
| `R5` | the parallelism record loses its numbers, leaving a claim on argument | `4ac1e8f7` | `TC-0017-0066` |
| `R6` | the parallelism record stops saying the declared value was kept | `f1c8f48a` | `TC-0017-0066` |
| `R7` | the parallelism record drops the refusal, so the sign-off question disappears | `a3c2d4e0` | `TC-0017-0067` |
| `R8` | the declared starting value moves without a sign-off | `5da48f36` | `TC-0017-0067` |
| `R9-control` | a sentence added to the register that touches no required content | `78ae34e3` | **nothing new** |

Every mutation reddens exactly one row. `R8` is the round that mutates the runner configuration rather
than the register: `TDD-0067` asserts the declared value against `vitest.knobs.ts` and not against the
record, so the two cannot agree with each other while both being wrong.

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 76.4s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.4s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 12.5s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 40.3s |
| `test:e2e` | 74 passed | 4 skipped (78) | 896 passed | 16 skipped (912) | 25.7s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 61.7s |
| `test:scripts` | 10 passed (10) | 132 passed (132) | 15.2s |

Total 239.2s, every one green.

### The validate delta

One below the previous change: info=4 warning=359 error=2, exit 1. Two removed (TC-0017-0025,
TC-0017-0066) and one added, TC-0017-0065, which this change deliberately did not touch - it needs an
adopted worker value and none has been adopted. Three of the five promoted rows were not among the
removed, and one row nothing touched joined. Eighth measurement of the resolution behaviour
CR-20260818-0001 is open against, and by now the count moves for reasons that have little to do with
the rows landing.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all five rows. The
item-12 checkpoint is not attempted, for the reasons recorded under the earlier changes.

## The layer-to-CI-lane mapping document (TDD-0076 … TDD-0082)

<a id="tdd-0076"></a><a id="tdd-0077"></a><a id="tdd-0078"></a><a id="tdd-0079"></a><a id="tdd-0080"></a><a id="tdd-0081"></a><a id="tdd-0082"></a>

`AC-0017-0032` through `AC-0017-0034`. Base revision `955eb2f1`.

### A sibling file, because the loader cannot see one

The layer-policy loader resolves `catalog/test-layers.md` by exact path and reads nothing else in that
directory. So a sibling catalog file is invisible to it, and a new SECTION inside the catalog would not
be — the loader parses that file, and prose there extracts as a token. That asymmetry is the whole
reason the mapping is a separate document rather than a heading, and `TDD-0079` asserts the mechanism
rather than trusting it.

### The hazard the spec warned about, hit on the first try

The cross-link added to the catalog originally read "the **layer-policy** loader reads this file and not
that one". The extractor is `/@?(layer-[a-z0-9-]+)/gi`, so that hyphenated phrase became a sixth token:

```text
before  layer-api, layer-component, layer-e2e, layer-integration, layer-unit
after   layer-api, layer-component, layer-e2e, layer-integration, layer-policy, layer-unit
```

Six declared tokens against five built-in ones is exactly the drift `QFAI-SPACK-091` reports, which is
the vocabulary warning `TDD-0079` exists to keep at its baseline. Caught by a probe run immediately
after the edit — written because the plan says in as many words that prose in this file can extract as a
token, so the edit was made expecting it.

The phrase is now unhyphenated in the catalog, and also in the mapping document even though the loader
does not parse that one. The comment there says why: a catalog-directory file carrying such a token is a
hazard waiting for the day someone widens the loader to scan the directory.

### The control round earned two fixes

`R10` adds a sentence that touches no required content, and on the first oracle run it reddened
`TC-0017-0081`. So did four other rounds — because every round that edited the asset copy left the
mirror unchanged, and the identity claim fired on all of them. A control that reddens something is not a
control, and `TC-0017-0081`'s own signal was buried under four unrelated rounds.

Asset rounds now edit BOTH copies, which is what an authoring edit followed by `pnpm sync:ssot` looks
like. `R8` keeps the mirror-only edit, which is the divergence that claim is actually for.

The same run showed `R5` — a planted annotation directive — reddening only the identity claim.
`TC-0017-0078`'s filter matched `\bplace\b` case-SENSITIVELY, and the planted line began "Place each
annotation...". Directives are usually written at the start of a sentence, so the case-sensitive version
would have missed the shape it exists to catch.

### What the rows assert, and why each is more than it looks

- **`TDD-0076`** — both copies, and links in BOTH directions. One direction leaves a document nothing
  points at; the other leaves a pointer to a document that does not acknowledge it.
- **`TDD-0077`** — the disclaimer is in the HEADER, taken as the first six hundred characters. The reader
  who stops after one screen is exactly the reader who would otherwise take a catalog-directory file for
  enforced vocabulary.
- **`TDD-0078`** — per-level routing, if named, carries its not-enforced status, and no line directs
  where annotations belong. The live gate reads one directory; a document sending someone elsewhere
  produces work the gate cannot see, which is worse than no document because it looks like coverage.
- **`TDD-0080`** — the built-in set is IMPORTED from `src` and compared against five literals. A
  test-local copy of the set could be edited to agree with a changed source; the import cannot.
- **`TDD-0082`** — the mirror DIRECTION, read from the sync script, plus its check mode. Two identical
  copies say nothing about which one is the source, and it is the direction that makes a root-only edit
  temporary rather than an alternative.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/assets/layerCiLaneMapping.test.ts`
- **The first RED was inadmissible**: four failures were `ENOENT` on a file that did not exist yet. The
  seam is the document itself with a heading and one line of placeholder — present enough to read, empty
  of everything the rows require. The second RED is `Tests 2 failed | 5 passed (7)`, every failure an
  assertion.
- **Five of the seven rows passed at RED** — `TDD-0078`, `TDD-0079`, `TDD-0080`, `TDD-0081` and
  `TDD-0082` — because they are negative or invariant claims: an empty document names no
  per-level routing, invents no layer code, does not modify the built-in set, is byte-identical
  to its own placeholder mirror, and does not move a sync target that predates it. Those five
  carry `RED failure mode: falsifiability`, and the oracle is what makes them mean anything.
  The two that did fail are `TDD-0076` and `TDD-0077`, the only rows requiring content to be
  present rather than absent.

  > **Added 2026-08-20, after review finding B7.** The sentence here said "five of the seven"
  > and named none of them, which is not enough for a per-row gate: item 3 of the 11-point gate
  > is "RED was observed", asked of each row separately, and seven cells were quoting one
  > file-scoped result as though every row were among the failures. The identity was therefore
  > MEASURED rather than reasoned out — the seam was reconstructed by reducing both copies of
  > the mapping document to a heading and one placeholder line, and the file was re-run:
  >
  > ```text
  > x TC-0017-0076 ... exists on both sides and links to the catalog, which links back
  > x TC-0017-0077 ... says in its header that the loader does not read it
  > + TC-0017-0078 ... repeats the not-enforced status wherever it names per-level routing
  > + TC-0017-0079 ... introduces no layer code the catalog does not already carry
  > + TC-0017-0080 ... holds exactly the five tokens, imported from the source
  > + TC-0017-0081 ... keeps the two copies byte-identical
  > + TC-0017-0082 ... mirrors from the asset tree to the root, and offers a check mode
  > Tests  2 failed | 5 passed (7)
  > ```
  >
  > `2 failed | 5 passed (7)` reproduces the recorded RED exactly, which is what makes the
  > reconstruction trustworthy rather than merely plausible. Both copies were restored and
  > byte-compared against their backups afterwards.
- **GREEN result**: same command, `Tests 7 passed (7)`.

### Oracle proof — ten rounds

| id | mutation | mutant | reddens |
| --- | --- | --- | --- |
| `R1` | the mirrored copy is deleted, so half the audience cannot see the document | (removed) | `TC-0017-0076`, `TC-0017-0081` |
| `R2` | the catalog stops linking back, so the map is a document nothing points at | `a35e0410` | `TC-0017-0076` |
| `R3` | the header stops disclaiming the loader | `6cf4844b`, `6cf4844b` | `TC-0017-0077` |
| `R4` | per-level routing is named without its not-enforced status | `f3297e7a`, `f3297e7a` | `TC-0017-0078` |
| `R5` | the map starts directing where annotations belong | `2223c54c`, `2223c54c` | `TC-0017-0078` |
| `R6` | the map invents a layer code the catalog does not carry | `a14963b9`, `a14963b9` | `TC-0017-0079` |
| `R7` | the built-in token set grows | `c9dcfca9` | `TC-0017-0080` |
| `R8` | the mirrored copy is edited on its own, so the two diverge | `ba91ed85` | `TC-0017-0081` |
| `R9` | the sync target stops being the repository root's .qfai | `a4a43ea2` | `TC-0017-0082` |
| `R10-control` | a sentence added to the map that touches no required content | `54600383`, `54600383` | **nothing new** |

### The suite

| script | test files | tests | wall clock |
| --- | --- | --- | --- |
| `test:core` | 122 passed (122) | 1587 passed | 2 skipped (1589) | 75.3s |
| `test:unit` | 43 passed (43) | 266 passed (266) | 7.3s |
| `test:validators` | 46 passed (46) | 351 passed (351) | 12.4s |
| `test:integration` | 124 passed | 4 skipped (128) | 862 passed | 19 skipped (881) | 37.0s |
| `test:e2e` | 75 passed | 4 skipped (79) | 903 passed | 16 skipped (919) | 23.5s |
| `test:cli` | 11 passed (11) | 321 passed (321) | 59.4s |
| `test:scripts` | 10 passed (10) | 132 passed (132) | 14.5s |

Total 229.4s, every one green.

### The validate delta, and the first one that is exactly zero

info=4 warning=359 error=2 - identical to the previous change, and the diff is empty in both
directions. QFAI-SPACK-091 stays at 0, which is the vocabulary baseline TC-0017-0079 exists to hold.

Zero is worth a sentence because it contrasts with change 7 part 2, where creating a shared test file
added five FALSE stale-status warnings. The difference is that all seven rows here landed at
`refactor` in the same change that created their file, so no row was left in the state the resolution
check misreports. The lesson is small and reusable: a new test file costs nothing on that axis if its
rows are promoted with it, and costs one false positive per unpromoted sibling if they are not.

### Where the spec stands

Seventy-three of eighty-two ledger rows are `refactor`. The nine that remain are not implementable at
this revision, and each has a named reason:

```text
TDD-0016  blocked   CR-20260818-0007, the minimal-scope default the boundary TC needs
TDD-0030  blocked   CR-20260820-0001, the tree-wide Node literal rule against the publish job
TDD-0032  deferred  build-artifact reuse, which 10_Plan.md excludes as "a measurement, not a step"
TDD-0033  gated     a cost claim needs captured numbers, and the measurement has not run
TDD-0034  gated     same
TDD-0035  gated     same
TDD-0065  gated     needs an adopted worker value; none has been adopted
TDD-0069  gated     constrains a tuning change; none has landed
TDD-0070  gated     same
```

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor` for all seven rows. The
item-12 checkpoint is not attempted, for the reasons recorded under the earlier changes.

## The worker-value comparison the rule asks for (TDD-0065)

<a id="tdd-0065"></a>

- **Row**: `TDD-0065`, implementing `TC-0017-0065`
- **Base revision**: `bc36f08c`, the commit this block's measurements were taken at
- **Revision**: `a910c91c`, the commit that landed the row

Recorded because `completion-reviewer` found this the only one of seventeen blocks carrying neither
a base revision nor a citation of its own TC (BL-8). Gate item 10 compares the revision an
observation names, and a block that names none cannot be checked at all.

`AC-0017-0028` / `BR-0017-0049`, and `EX-0017-0049`: "A timing artifact comparing at least two
worker settings on the largest project, plus the value actually adopted", accepting when "the
adopted setting is the fastest measured, or within ten percent of it with a written reason. A value
adopted against no comparison does not satisfy the rule."

This row was `todo` through the whole implementation because the comparison did not exist. The
parallelism episode produced measurements of the INTEGRATION slice while diagnosing contention;
that is a different measurement from the one this rule wants, and reusing it would have been the
"adopted against no comparison" case wearing a number.

### The artifact, and why it is a separate file

`.qfai/evidence/timing-workers-spec-0017.md`. A dedicated file rather than a section of this
record, because "timing artifact" is what the rule names and because this row's assertions PARSE
it — a table in its own file can be re-generated by re-running three commands, and a section buried
in a 3,000-line record cannot.

It lives in the evidence tree, which is this skill's own. Deliberately NOT in `07_Decisions.md`:
`EX-0017-0049` does not ask for it there, and `CR-20260820-0007` is open precisely because three
sibling rows' rule (`EX-0017-0030`) DOES ask for a decision-record write that `/qfai-implement` is
forbidden to make. Where the rule leaves the location open, the artifact goes where this skill is
allowed to put it.

### The measurement

Largest project established by measurement rather than assumption — every runner project listed on
one machine at one commit:

```text
core         1587 tests   122 test files      <- largest by test count
integration   862 tests   123 test files
e2e           903 tests    23 test files
validators    351 tests    46 test files
cli           321 tests    11 test files
unit          266 tests    43 test files
scripts       135 tests    10 test files
```

`integration` holds one more FILE and roughly half the cases. The count is recorded in both units
because they disagree, and the row re-checks the file count — a directory walk costs milliseconds,
and spawning the runner from a test is the exact cost that put this spec's integration slice past
its timeout earlier in this run.

Then, 14 logical CPUs, `QFAI_TEST_MAX_WORKERS=<n> pnpm -C packages/qfai test:core`, one full run
per setting:

```text
 4 workers   132.94s   1587 passed | 2 skipped     <- fastest
10 workers   134.07s   +0.85%
14 workers   135.62s   +2.02%
```

So the adopted value of ten is **not** the fastest, is 0.85% behind it, and therefore qualifies
under the ten-percent clause **with a written reason**. The reason is the user's instruction: ten is
mandatory, and when a measurement made ten look flakier the instruction was to fix the structure
that creates the contention rather than the number that exposes it. `BR-0017-0051` reserves the
choice of starting value to the user, so adopting 4 on the strength of this table is not a decision
this row may take.

The table also argues that it does not matter. The full spread from 4 to 14 workers is **2.7 seconds
on a 133-second run, about 2%** — `core` is not worker-bound, its cost is per-file transform and
collect, and every setting pays it.

### What the row asserts, and what it refuses to trust

Six claims, and the design principle is that **none of the artifact's own arithmetic is believed**:

1. the largest project is named, with its test count;
2. at least two settings are present, parsed as table data rather than read as prose;
3. the adopted value is stated AND matches `vitest.knobs.ts`, so the record and the configuration
   cannot agree with each other while both being wrong;
4. the adopted value appears in the comparison — the "adopted against no comparison" rejection;
5. it is the fastest, or within ten percent COMPUTED from the table, and on that branch only, a
   written reason is required;
6. the project's test-file count still matches the tree within twenty percent, so the comparison
   has not silently become historical.

Claim 5's structure is the one worth noting: the reason is asserted only when the adopted value is
not the fastest. A record that adopts the fastest value owes no explanation, and demanding one
would have made the row fail on a compliant artifact.

### RED and GREEN

- **RED command**, from `packages/qfai`:
  `pnpm exec vitest run tests/assets/actionPinBumpOwner.test.ts`
- **RED result**: `Tests 1 failed | 7 passed (8)`, exit 1 — `the artifact must name the largest
  project and its test count: expected null not to be null`. An ASSERTION, not a load error: the
  seam is the artifact reduced to a heading and one placeholder line, present enough to read and
  empty of everything the row requires.
- **GREEN result**: same command, `Tests 8 passed (8)`.

### Oracle proof — six rounds, five reddening and one control

| id           | mutation                                              | reddens                                                                       |
| ------------ | ----------------------------------------------------- | ----------------------------------------------------------------------------- |
| `U1`         | the adopted value is not stated                       | `the artifact must state the adopted value: expected null not to be null`      |
| `U2`         | the adopted value becomes 4, the fastest              | `the adopted value must be the one the runner declares` — the runner says 10   |
| `U3`         | the comparison drops to a single setting              | `must compare at least two worker settings: expected 1 to be >= 2`             |
| `U4`         | the written reason is removed                         | `a value that is not the fastest must carry a written reason`                  |
| `U5`         | the adopted row is slowed to 154.07s                  | `must be within ten percent ...: expected 0.15894388445915447 to be <= 0.1`    |
| `U6-control` | a heading reworded, no required content touched        | **nothing**                                                                    |

`U2` is the round that matters most: it makes the artifact internally consistent and MORE
compliant-looking — adopting the fastest value needs no reason at all — and the row still fails,
because the configuration says ten. An artifact that agrees with itself is not evidence.

`U3` failed on its first attempt and the failure was mine, not the row's: the mutation blanked one
of three rows, leaving two, and `rows.length >= 2` still held. Recorded because a mutation that
does not actually violate the property produces a false "reddens nothing" — which reads exactly
like a vacuous assertion and is the opposite.

### One measurement per setting, stated as a limitation

Not a best-of-three. The three durations differ by less than the run-to-run variance this
repository has already shown elsewhere in this record, so the ORDER of the three rows is not
established by this data — only the magnitude of the spread, which is what the reason rests on. A
best-of-three would change nothing about the conclusion and is the obvious improvement if the
ten-percent margin ever gets close.

### A byte that looked like a correct regex

Worth recording because it cost a green run and would have been invisible in review. The row's
file-count claim was written as `/test files:\s*(\d+)\b/i` through a Python script, in a non-raw
string. Python read `\b` as **BACKSPACE (0x08)** and wrote a literal control character into the
regex, which then demanded a backspace after the digits and matched nothing:

```text
const filesMatch = /test files:\s*(\d+)^H/i.exec(artifact);
```

The same regex tested standalone in Node matched perfectly, because I retyped it there. Diagnosed
by byte-inspecting the line rather than reading it. A scan of every file this branch touches turned
up one more, in `.qfai/evidence/implement-spec-0006.md`, where prose describing "the trailing `\b`"
had become "the trailing `<backspace>`" — also fixed. `check-bidi.mjs` does not cover this class,
which is why nothing caught either one.

### Gate items NOT satisfied

The three blocking agent verdicts were not obtained, so `Status` is `refactor`. The item-12
checkpoint is not attempted: step 4's clause 3 remains, for the reason `CR-20260818-0006` is open
against — see the corrections section near the top of this record for why step 2 is no longer part
of that answer.

## Rounds, and two places the round contract is not met

**Added 2026-08-20 after round 6.** `qa-gatekeeper` found that **zero `Round N:` blocks exist**
anywhere in this record, against six review rounds, and that **no row has ever held `review-fix`**.
Both are true. `references/round-evidence.md` is the contract, and this section states what the
rounds actually were and where the record does not meet it — rather than writing round blocks after
the fact and calling it compliance.

### Which rounds exist, by the contract's own test

The contract does not count review rounds. It counts RED/GREEN cycles:

> Round 1 is the original RED/GREEN cycle. Each blocking reviewer `REVISE` that requires **new
> production behaviour** adds a round. A `REVISE` that needs none (naming, duplication, comments)
> opens no round and is verified by a refreshed `Refactor verify` pair instead.

Six review rounds have run. Applying that test to the commits, **six** of the rework commits changed
production — `.github/workflows/ci.yml`, `scripts/`, `packages/qfai/src/` — and the rest changed only
tests and records:

| commit     | production change                                                        | rows whose round it opens                        |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------ |
| `575af2e4` | `--no-renames` on the detect job's diff                                  | `TDD-0008`                                        |
| `9c04aa47` | hygiene lane property 3 rejects a step-level `if`                        | `TDD-0036`, `TDD-0059`                            |
| `1f453a31` | the classifier excludes executables from the documentation set           | `TDD-0010`                                        |
| `05778274` | three lane guards: empty verification set, empty tree, `REQUIRED` pinned  | `TDD-0046`, `TDD-0057`, `TDD-0073`                |
| `5ce34ff5` | the retry scan reads the manifest; `layerPolicy` untouched                | none — test-only for every row it names           |
| `68beb10d` | the classifier's executable branch reordered, reason string changed       | `TDD-0010` (a second time)                        |

Everything else — F-1 through F-8's test rewrites, the ledger migration, the CR and evidence work —
is a `REVISE` needing no new production behaviour. Those took the second path: **no round**, and a
refreshed `Refactor verify` pair, which is recorded in § "Test results summary" measured at HEAD.

### Deviation 1 — the rework rounds have no pre-fix RED

A round block wants `Round N: RED command` / `Round N: RED result`: the rework's new failing test,
observed failing **before** the production fix. That is not what happened. In every case above the
claim and the production change landed in one commit, so no pre-fix failure was observed.

What was observed, after the fact, is the oracle round: revert the production change and the claim
fails. Those are recorded — `S1`/`S2`/`S3` for `TDD-0008`, oracle A for `TDD-0036`/`TDD-0059`,
`T1`/`T2`/`T3` for `TDD-0010`, `M1`/`M2`/`M3` for the lane guards, `Z1` for the reordering —
and each demonstrates exactly the proposition a RED demonstrates: this claim fails without this
production code.

It is not a RED, and calling it one would be the substitution `red-admissibility.md` forbids. It is
the same shape as the falsifiability path: the demonstration is real, the ORDER was wrong. Recorded
as a test-first gap per round rather than dressed as a round block, which is what
§ "Gate items NOT satisfied" already says for the original cycle of changes 1 through 5.

### Deviation 2 — no row held `review-fix`, and it cannot be written now

The contract's rework path is `refactor -> review-fix`, the rounds happen while the row sits at
`review-fix`, and `review-fix -> refactor` is the only status change the rework produces. Every row
stayed at `refactor` through six rounds of rework.

That is a real deviation and it is not repairable retroactively. Writing `review-fix` into a ledger
cell now would record a state the row never held during work that is already finished, which is the
fabrication the status lifecycle exists to prevent. The rework is over; the honest record is that it
happened at `refactor`.

What it cost, concretely: `SKILL.md`'s Phase Red step 1 says a `review-fix` row is selected **before**
any `todo` row, "one left by an interrupted session is otherwise never picked up". Rows parked at
`refactor` do not get that treatment — so a session interrupted mid-rework would have resumed by
selecting a `todo` row and left the rework stranded. Nothing was lost here because no session was
interrupted, which is luck rather than process.

### What this section is not

It is not a claim that the rounds are compliant. Two of the contract's requirements are unmet and
both are named above. It exists because the alternative — leaving six rounds of rework with no round
structure recorded at all — is worse, and because `qa-gatekeeper` asked for the rounds and is
entitled to see which ones the contract says exist.

## Round 6 — the oracles for the claims round 5 and 6 rewrote

**Added 2026-08-20.** `qa-gatekeeper` found that `68beb10d` rewrote `TC-0017-0068`'s and
`TC-0017-0079`'s assertions and **touched no evidence file**, so each row's recorded oracle had run
against an assertion that commit deleted. It also noted that the oracles I reported for that work
"appear nowhere in the evidence — that record exists only in the implementing agent's own prose".

Both are correct, and the second is the more serious: an oracle described in a commit message is not
evidence. Round 6 rewrote three of the same claims again, so the rounds are recorded together here
with the mutation each round applied and the result measured.

### `TC-0017-0079` — the loader-invisibility claim, three versions

The claim forbids one thing: the mapping document becoming visible to the layer-policy reader. Two
versions read TEXT and neither could see the change it existed to forbid.

| version  | what it asserted                                          | outcome                                                 |
| -------- | --------------------------------------------------------- | ------------------------------------------------------- |
| round 4  | `expect(MAPPING).not.toBe(CATALOG)`                       | two constants defined twenty lines apart; unfalsifiable  |
| round 5  | the loader's source must not contain the mapping filename  | the catalog's own name occurs SIX times there            |
| round 6  | `path.join(...)` argument lists only                       | `[^)]*` stops at the first `)`; `path.resolve` unmatched |
| **now**  | run `loadLayerPolicy` and inspect its tag set              | behavioural                                              |

The current version builds a temp assistant tree holding the real catalog and the real mapping
document with a `layer-quantum` token the catalog does not carry, calls `loadLayerPolicy`, and
asserts the policy file was resolved, that the bogus token is absent from `tags`, and that no
`QFAI-SPACK-091` drift appeared.

Oracle rounds, each planted alone into `packages/qfai/src/core/layerPolicy.ts` and reverted with a
byte comparison:

| id           | mutation                                                     | result                                                                |
| ------------ | ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `X1`         | the resolution gains a nested call: `path.join(path.dirname(…), …, MAPPING)` | **REDDENS** — `the loader must not read test-layers-ci-lanes.md` |
| `X2`         | `path.resolve` instead of `path.join`                        | **REDDENS**                                                            |
| `X3`         | the filename built from `["test-layers","ci","lanes"].join("-")` | **REDDENS**                                                        |
| `X4-control` | a comment naming the mapping file                            | **nothing**                                                            |

`X1`, `X2` and `X3` are the three mutations round 6 measured the text version staying GREEN under.
The behavioural version also loses a false positive the text version had: extracting the filename to
a constant is behaviour-preserving and reddened the round-6 claim.

### `TC-0017-0068` — the retry scan, two versions

| version | what it asserted                                       | outcome                                        |
| ------- | ------------------------------------------------------ | ---------------------------------------------- |
| round 5 | `retr(y\|ies)\s*[:=]` over whole files                  | `--retry 2` has a space; caught only `--retry=2` |
| round 6 | two patterns, command text gathered structurally        | line filter selected comments; prose reddened it |
| **now** | `jobs[*].steps[*].run` from the parsed document          | structural, comments stripped per body          |

| id           | mutation                                                        | result       |
| ------------ | --------------------------------------------------------------- | ------------ |
| `Y1-control` | a comment inside a `run:` body documenting the prohibition        | **nothing**  |
| `Y2-control` | an `env:` entry named `RETRIES`                                   | **nothing**  |
| `Y3`         | `--retry 2` appended to the matrix invocation in `ci.yml`          | **REDDENS**  |
| `Y4`         | `--retry 2` appended to `release.yml`'s `pnpm ci:gate`             | **REDDENS**  |

`Y1` and `Y2` are the two false positives round 6 measured. `Y4` is the site round 6 found unscanned:
`release.yml` runs `pnpm ci:gate`, which runs the suite.

### `TC-0017-0010` — the classifier's executable branch

The branch was added in round 5 and round 6 measured that **reverting it reddened nothing**: the only
reason assertion was `/executable/i`, which matches the pre-repair string too, and nothing asserted
`source path`. A production `ci.yml` change no test could see.

| id   | mutation                                                       | result                                                                 |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `Z1` | the whole repair reverted — executable test before the documentation test, with its old reason string | **REDDENS on three assertions**: the executable reason, the `source path` reason, and the `not.toMatch(/executable/i)` on a source path |

Verdicts were unaffected by the repair either way — round 6 confirmed 0 verdict changes across 20
path classes by running both extracted programs side by side. Only the stated reason moved, which is
why the three assertions are all about `reason`.

### The three lane guards (`05778274`) — recorded here because they were not recorded anywhere

`qa-gatekeeper`'s point applies to these too: the oracles ran, and until now they existed only in
that commit's message. Each guard makes the hygiene lane stop reporting PASS over nothing, and each
was planted alone into `scripts/check-workflow-hygiene.mjs` (or the declaration) and reverted with a
byte comparison.

| id           | mutation                                                    | reddens                                                                        |
| ------------ | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `M1`         | the empty-verification-set guard removed                    | `TC-0017-0057` — `expected … to match /empty or missing verificationSet/`        |
| `M2`         | the empty-tree guard removed                                | `TC-0017-0046` — `expected … to match /holds no YAML files/i`                    |
| `M3`         | one member of the declaration's verification set renamed     | `TC-0017-0073` **and** `TC-0017-0036` together                                  |

`M3` is the one worth keeping: after it, drifting the declaration fails BOTH rows that read it, so
there is no single edit that leaves one copy quietly disagreeing. Before the fix, `TC-0017-0073`'s
`REQUIRED` was pinned to nothing.

### `TC-0017-0014` — two claims removed rather than repaired

No oracle, because there is no claim left to redden. The `declared <= reachable` comparison round 5
added was the same tautology as the `declared <= jobs.length` it replaced: `hasDeclaredPermissions`
is the first disjunct of `hasReachablePermissions`, so containment holds by construction. Measured
over this tree: jobs 12, declared 4, reachable 12 — and `reachable === jobs.length` made the two
forms numerically identical.

The companion claim `reachable - declared > 0` reddens the day every job declares its own permission
block, which is a hardening. Both deleted; `TC-0017-0015` owns that discrimination on fixtures
against the lane's exported predicates.

### `TC-0017-0057` / `0058` / `0059` — the declaration helper, corrected twice

No oracle: these are fidelity fixes to a fixture, not claim changes. Measured instead.

```text
round 5   `as Declaration` replaced by a REBUILD
          -> planting stripped `why` and `verificationSetNote` from every context
round 6   fixed at the context level, root still stripped
          -> `{ contexts }` dropped the top-level `$comment`; 2692 bytes -> 1533
now       `{ ...parsed, contexts: raw.filter(isContext) }`
          -> measured: root keys and context keys both survive a plant, nothing lost
```

And `isContext` now verifies what its type claims. Round 6 measured that the previous version
accepted a context with no `verificationSet`, after which the first read raised
`TypeError: Cannot read properties of undefined` — so a row planting that shape would have crashed
rather than failed its claim.

## Test results summary

At `76ade4dd`, after round 5's rework. Every command run from `packages/qfai` unless stated.

| Gate                                     | Result                                        |
| ---------------------------------------- | --------------------------------------------- |
| `pnpm ci:lint` (repository root)         | exit 0 — all eleven `&&`-chained members      |
| `pnpm test` (unfiltered)                 | 431 files, 4426 passed / 37 skipped, exit 0   |
| `validate --profile tdd --fail-on error` | exit 1 — `info=4 warning=352 error=2`         |
| `pnpm test:scripts`                      | 135 passed                                    |
| `pnpm test:e2e`                          | 904 passed / 16 skipped                       |

The two `validate` errors are `QFAI-ATDD-111` and `QFAI-ATDD-112`, and neither is attributable to a
row of this spec: after the annotation ledger was completed, `QFAI-ATDD-112` names only the eight
rows that have no test — the six `blocked` and the two `todo` — plus TCs from `spec-0003`,
`spec-0008` and `spec-0015`. `QFAI-ATDD-111` wants `US-0017-*` E2E annotations that belong to a
different skill's scope.

**Refactor verify — one pair per block command, and why not one per item.** The contract writes
`Refactor verify command` / `Refactor verify result` once per item. Seventy-four items share six
commands, so seventy-four identical pairs would be noise; the pairs are recorded here once per
command with the rows each covers. Measured at `76ade4dd`, after every round-5 edit:

| Refactor verify command (`pnpm exec vitest run …`)  | Result             | Rows covered                                        |
| --------------------------------------------------- | ------------------ | --------------------------------------------------- |
| `tests/scripts/ownWorkflowTopology.test.ts`         | `27 passed (27)`   | changes 1, 4, 7, 8, 9 and the required-context block |
| `tests/scripts/workflowHygiene.test.ts`             | `30 passed (30)`   | changes 2, 3 and the hygiene rule-set blocks         |
| `tests/scripts/sliceSurfaceAlignment.test.ts`       | `3 passed (3)`     | change 5                                             |
| `tests/scripts/vitestWorkspaceKnobs.test.ts`        | `5 passed (5)`     | change 6                                             |
| `tests/assets/actionPinBumpOwner.test.ts`           | `8 passed (8)`     | change 7 part 2, the record rows, `TDD-0065`         |
| `tests/assets/layerCiLaneMapping.test.ts`           | `7 passed (7)`     | the mapping-document block                           |

## Reviewer verdicts

Round 5, all three blocking reviewers, at `90a33ee5` — the revision each named, one commit after the
`bc36f08c` their prompts stated. The delta between the two is this pack's `review_request.md` and
nothing else, which all three verified.

| Field                  | Value                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `Spec review`          | **REVISE** — `completion-reviewer`, `Reviewed revision: 90a33ee5`  |
| `Code quality review`  | **REVISE** — `implementation-reviewer`, `Reviewed revision: 90a33ee5` |
| `Prototype parity`     | not applicable — no row of this spec affects a UI surface           |
| `Gatekeeper`           | **REVISE** — `qa-gatekeeper`, `Reviewed revision: 90a33ee5`         |

Pack: `.qfai/review/review-20260820140000000/`. Rounds 1 through 4 have **no pack** — their verdicts
were returned to the orchestrator and recorded only in commit messages and in this file's prose,
which `completion-reviewer` raised as BL-2. That is not repairable retroactively: the reports no
longer exist to file. Round 5 onward writes a pack, and the gap is recorded rather than papered over.

Two of the three reviewers **corrected measurements stated in this record**, and both corrections are
applied above and dated at their sites: the unfiltered suite is 4426 rather than 4424, and a fenced
block labelled as `check-workflow-hygiene.mjs` output was a paraphrase carrying counts the lane never
prints.

`Checkpoint verification command` / `Checkpoint verification result`: the item-12 checkpoint is not
attempted. Step 4's clause 1 requires a baseline captured with counts AND finding IDs before any row
started; none was, and that cannot be repaired after the fact. Clause 3's excess is now zero — the
warning count is 352, the baseline value — after the six `blocked` rows stopped producing
`TDDLIST_STALE_STATUS`.

## Commands executed

Every distinct command this record's measurements come from. Paths are relative to the repository
root; the `vitest` invocations run from `packages/qfai`.

```text
pnpm ci:lint
pnpm lint:md
pnpm exec prettier -w <path>
node packages/qfai/dist/cli/index.mjs validate --profile tdd --fail-on error --root .
node packages/qfai/dist/cli/index.mjs validate --profile full --fail-on error --root .
node scripts/check-workflow-hygiene.mjs
pnpm -C packages/qfai test
pnpm -C packages/qfai test:scripts
pnpm -C packages/qfai test:e2e
pnpm -C packages/qfai test:core
QFAI_TEST_MAX_WORKERS=<n> pnpm -C packages/qfai test:core
pnpm -C packages/qfai exec vitest run --project scripts tests/scripts/<file>.test.ts
pnpm -C packages/qfai exec vitest run --project e2e tests/assets/<file>.test.ts
git diff --name-only --no-renames <base> <head>
git hash-object <path>
git show <rev>:<path>
git cat-file -t <hash>
```

`pnpm exec vitest` **from the repository root does not work** and is recorded because it cost a false
oracle result: it exits 1 with `Command "vitest" not found`, which reads exactly like a failing test.
Every invocation above uses `-C packages/qfai`.
