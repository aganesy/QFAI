# RED Provenance for an ATDD-owned Ledger Row

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E`,
`Layer = API` and `Layer = Integration` rows are tracked there, but their tests
are authored here.** This skill therefore writes into a ledger whose status
lifecycle it does not define.

## What this skill produces

- **Evidence, not ledger cells.** `/qfai-implement` writes `Status`, `DR-ID`
  and `Evidence` for every row — one writer, as
  `constitution/drift-protocol.md` grants it. This stage produces the evidence
  those cells point at, in `.qfai/evidence/atdd-<spec-id>.md` under
  `## Ledger rows advanced`, and hands it over.
- The lifecycle is
  `../../qfai-implement/references/execution-ledger.md#allowed-transitions`. It is
  forward-only from `todo`, and `todo -> red` requires an **admissible RED**: an
  assertion inside the row's own selector raised the failure, observed before
  the production code that makes it pass exists
  (`../../qfai-implement/references/red-admissibility.md`).

## Why the stage order makes this a real question

Work Orders build the API and integration surfaces a journey needs (P3, P4). A
journey written _after_ its surface passes on the first run, so there is nothing
to watch fail — and `qfai-implement/SKILL.md` classifies a test that
unexpectedly passes as an anomaly bound for `exception`.

Left unaddressed, that makes `exception` the only terminal state an ATDD-owned
row can reach, and a spec closes with its journeys recorded as anomalies rather
than as completed work.

## The three branches (MUST)

Take the first that applies, and record which one in the evidence file.

1. **Observed RED (preferred).** Write the journey or API test **against the
   current tree**, before this cycle builds any surface it needs.
   1. **Ask `/qfai-implement` for the minimal seam first — for a surface that does not exist.** A row that reached branch 1 from branch 2's first-run check has its surface already; skip to step 2 and read the note there. A test for a route
      that does not exist yet fails with a 404 or an import error, and that is a
      missing seam, not a RED — but the seam is production code, and this stage
      owns none: its `red` phase is `acceptance-test-engineer` and
      `qa-gatekeeper`, with no backend or frontend agent. Hand the row over for
      its Phase Red step 3a — register the route, or add the export the test
      imports, so it **resolves but does not satisfy the row's predicate** — and
      come back with the seam in place. Skipping it makes the first failure of
      any new-surface row a resolution error by construction; writing it here
      is the ownership breach step 5 exists to prevent.

      **The seam must not return the contracted status.** When the row's
      predicate _is_ the status — `201` on create, `204` on delete, `403` on a
      refusal — a handler registered with "the declared status" passes the
      assertion the moment it exists, so there is no RED left to observe and the
      row's behaviour was implemented before its test failed, which is what
      branch 1 exists to prevent. Answer with a not-implemented sentinel the
      contract does not use (`501`, or `500` from an explicit
      `NotImplementedError`) and a **schema-compatible neutral body** — the
      shape the selector decodes, with the contracted predicate absent or at a
      value the row does not own. Not an empty body: a selector that decodes
      JSON before asserting raises a parse error, which the admissibility rule
      a few lines below rejects as a non-assertion failure, so the gate could
      not accept the RED and P1c stopped. Routing resolves, the status
      assertion fails on the predicate the row owns, and the RED is admissible.
      If the contract genuinely uses that sentinel too, pick another status
      outside its declared set — the requirement is that no assertion in this
      row's selector can pass against the seam.

      **Neutral, not empty.** The seam has to fail the row's predicate while
      still satisfying what the selector needs to _reach_ it. An empty body
      raises a parse error in a test that decodes JSON before asserting, and a
      handler that throws does the same in a server that re-raises — both are
      non-assertion failures
      `../../qfai-implement/references/red-admissibility.md` rejects, so the row
      cannot obtain an admissible RED at all. Return the status, headers and
      body _shape_ the selector assumes, with only the contracted predicate
      withheld.

   2. **With the scope approved (step 3), run the test.** An admissible failure is an assertion — or an
      expected-status check — inside this row's own selector, naming the
      predicate the row owns. Record the command and output as the row's RED
      pair, **and the revision it was observed at** — `git rev-parse HEAD` for
      a clean tree. An uncommitted tree is the ordinary case here, and it needs
      a **content** address rather than a status one: `git status --porcelain`
      names the changed paths and their states, so editing the very file under
      test after the RED leaves the digest identical and a stale observation
      reads as fresh. Record `working-tree+<content hash>` by the **one** procedure in
      `../../qfai-implement/references/evidence-revision.md` — do not restate
      it here — **the record shape least of all**: restated as
      `path + NUL + blob hash` it fell behind the canonical's `kind` and `mode`,
      and two spellings give a producer and a gatekeeper different addresses for
      one tree. It excludes the ledger and `.qfai/evidence/**`, and a
      producer hashing all of `git diff HEAD` instead got a different value from
      the `qa-gatekeeper` reviewing the same tree — in the ordinary multi-row
      loop, where the previous row's evidence is already written, the two
      observations of one RED tree could not be matched up at all. **Not
      `git stash create`** — it has no `-u`, so the tree it builds omits
      untracked files, and a brand-new acceptance test is untracked in exactly
      the case this address exists for.

      **Record the test's own content hash as well.** The working-tree hash
      covers everything at once, and Phase Green necessarily changes the
      production files in it — so the reviewer cannot recompute it from the
      final tree, and cannot tell "only production changed, as it should" from
      "the acceptance test was edited after the handoff, so the RED is stale".
      Record `RED test hash` alongside `RED revision`: a hash over the contents
      of the files the row's **`Test file`** column names, plus the
      acceptance-test-owned artifacts those files read — fixtures, snapshots,
      expected-value JSON, test helpers. Not the production tree. Limiting it to
      the test module let an edit to a snapshot or a fixture reshape the
      assertion after the handoff with the hash unchanged, which is the same
      stale-RED the field exists to catch; and since the working-tree hash cannot
      be recomputed from the final tree, nothing else would have caught it.

      **Record the manifest, not only the hash.** `RED test manifest` lists the
      repo-relative path of every file that went into it, sorted, one per line —
      and the hash is taken over `path + NUL + kind + NUL + mode + NUL + blob hash`
      in that order, the same shape the revision manifest uses. `kind` and `mode`
      are in it for the reason they are in that one, and more so here: after
      Phase Green the original `RED revision` cannot be recomputed, so this hash
      is the only thing still watching the test-owned artifacts — without them a
      `chmod +x` on an acceptance script, or a file swapped for a symlink with
      the same payload, changes how the test runs and moves nothing. Naming the _kinds_ of file is not enough:
      the consumer recomputes this before GREEN, and two readers who choose
      different sets get different values from an unchanged tree, so the gate
      either loops or passes an edit it never looked at.

      **Every entry is a file.** A directory is not an entry: it hashes to a
      value that never moves, so listing `tests/fixtures/` would leave every
      fixture under it free to change with the RED hash unchanged — the exact
      staleness the manifest exists to catch. List each file, and keep every
      parent component a real directory: a path that reaches its bytes through
      a symlinked parent addresses a tree the manifest does not describe, which
      a fresh clone cannot reproduce. The gate rejects both.

      Not the `Selector` — that column is a test _name_ in the ordinary case
      (`../../qfai-implement/references/checkpoint-verification.md` runs
      `<Test file> -t '<Selector>'`), so keying the hash on it yields an empty
      or guessed value and detects no edit at all. That hash **is** recomputable
      later — Phase Green does not touch those files — so it is what makes the
      freshness claim checkable rather than asserted.

      **Both are recorded when observed, never reconstructed.**
      `/qfai-implement` Phase Green changes the tree, and its completion gate
      requires the handed-over RED to name the revision it was taken at
      (`../../qfai-implement/references/evidence-revision.md`). A value worked
      out afterwards is a guess, and a guess fails the freshness gate exactly as
      a missing one does.

   3. **Scope approval — obtained before step 2 runs, listed here for the
      contract it carries.** Take it first: this step requires a scope REVISE to
      be settled _before_ the RED is submitted, and a REVISE changes the test or
      its selector — so a RED recorded ahead of approval is evidence for a scope
      that no longer exists, and its `RED test hash` addresses a file the
      repair rewrites. Approve, then run.
      `qfai-implement/SKILL.md` makes it the only authority on whether a
      selector covers a sufficient slice of its obligation, and requires a scope
      REVISE to be settled _before_ the RED is submitted. Approving the RED
      first leaves the planner nothing but "keep the PASS and open a new row",
      which cannot repair a handoff at the wrong granularity — the row has to be
      split before its RED is taken, not after.
   4. **Submit that run to `qa-gatekeeper` (routing phase `red`) before any
      production code exists, and wait for PASS.** `qfai-implement/SKILL.md`
      requires an independent reviewer to confirm the RED while the surface is
      still absent; a confirmation sought after it is built is post-hoc
      self-attestation of a state nobody can re-observe. Record the verdict
      beside the pair.
   5. **Stop there. Do not build the surface.** This skill owns acceptance
      tests, not production code — `agent-routing.yml` gives its implementation
      phase `acceptance-test-engineer` and no backend or frontend agent. The
      surface is built by `/qfai-implement` Phase Green from this handover, and
      the GREEN pair is recorded there. Branch 1's output is the RED pair, its
      `qa-gatekeeper` PASS, and the `Oracle proof` plan.

   Stage gate **P1b** is where steps 1-4 happen.

2. **Falsifiability (the surface is there and the test passes on its first
   run).** The usual shape when the surface predates this cycle, or this cycle
   built it before the journey was written — branch 1's seam step was not taken,
   or the work order sequenced surfaces first.

   **Run the test before choosing this branch.** Surface existence is not the
   condition; a first-run **pass** is. A surface that exists can still be wrong,
   and a correct test against a buggy one fails naturally — that is an observed
   RED, and the row belongs in branch 1 — **at its step 2**. Only step 1 is
   skipped: the surface exists, so there is no seam to ask for. Steps 3 and 4
   still run — `delivery-planner` still approves the slice before the RED is
   confirmed, and `qa-gatekeeper` still passes it, because the handover table
   requires that PASS on every `observed-red` entry. What the gatekeeper
   confirms is not "no production code exists" but that the failure is an
   assertion inside this row's selector, naming the predicate the row owns,
   observed **against the tree before the fix**. Record that pair, get the
   PASS, hand the fix to `/qfai-implement` Phase Green, and take the GREEN
   from the corrected surface. Record the branch as `observed-red` with a note
   that the surface existed and was wrong. Choosing branch 2 from existence alone sends a real,
   legitimately observed defect to `exception` or to a stop, because the
   mutation step cannot run against a test that is already failing and there is
   no GREEN to restore to.

   When it does pass: do **not** weaken it to manufacture a failure.

   **The mutation is production code, so `/qfai-implement` applies it.** This
   stage's `evidence` phase is `devops-ci-engineer` and `qa-gatekeeper`, and
   neither owns production source — the same ownership boundary branch 1 step 5
   states. Hand the row over naming the predicate to break: its Phase Red
   **step 3c** applies the mutation, runs this row's selector, captures the
   failure, reverts, and writes the trio into this row's entry here. The row
   is not deferred waiting for evidence only that step can produce. Writing
   the mutation here to "just take the evidence" is the breach the boundary
   exists to prevent, and the alternative — stopping because no agent may
   touch the file — sends a row with a perfectly good falsifiability story to
   `exception`.

   Use the shared path in
   `../../qfai-implement/references/red-not-observable.md`: record `Satisfied-by`,
   mutate the production predicate the journey asserts on, run this row's test
   and confirm it fails, restore, and record `Falsifiability command` /
   `Falsifiability result` beside the GREEN pair. `qa-gatekeeper` accepts this
   form as the row's minimum evidence, and the row proceeds to `green` and
   `done` normally.

   **`Satisfied-by` takes whatever already implements the predicate.** The
   shared reference names a sibling `TDD-NNNN` because that is its usual case,
   but an ATDD surface often has none — a pre-existing route, or one this cycle
   built outside the ledger. Record what actually satisfies it: a `TDD-NNNN`
   when there is one, otherwise the production **path and symbol**
   (`src/api/routes/evaluations.py::register`). What the field has to answer is
   "what would I mutate to falsify this row", and a path and symbol answer it as
   well as a row id does. **A commit id does not**, and is not an alternative
   form: a commit that touches several routes and a helper names no single
   predicate, so `qa-gatekeeper`'s boundary — owned code is the predicate
   `Satisfied-by` names — cannot be applied to it, and it either REVISEs a
   correct mutation or accepts an unrelated one. Add the commit alongside if it
   helps whoever reads the row later; it does not stand in for the symbol.

   **The row still moves `todo -> red -> green`.** Falsifiability _is_ the RED
   for this row — `red-not-observable.md` says so for its own case and
   `qa-gatekeeper` accepts it as the row's minimum evidence — so the mutation
   run satisfies `todo -> red` and the restored passing run is the GREEN. There
   is no `todo -> green` edge and none is needed. Hand the pair over in that
   order, so `/qfai-implement` writes the same two transitions it writes for
   any other row.

3. **Neither is possible.** Only then is the row an `exception`, with a `DR-*`
   naming what made both branches unavailable. An obligation with no persisted
   form, or one genuinely unobservable at L5, belongs here — but "the surface
   was built first in this same cycle" does not, because branch 1 or 2 covers
   it.

Branch 3 is the last resort, not the default. A stage that routes every row it
owns to `exception` has not measured anything; it has recorded that it did not
try branches 1 and 2.

## Evidence shape

Exactly one form per row, never both and never neither:

| Branch         | Recorded                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observed RED   | Row identity (`Layer`, `Test file`, `Selector`) and the obligation reference the `Layer` selects (`TC-ref` / `US-ref` / `CON-API-ref`), RED command+result, `RED failure mode`, `RED revision`, **`RED test hash` and its manifest**, `qa-gatekeeper` PASS, the `Oracle proof` plan                                                                                                                            |
| Falsifiability | Row identity (as above), `Satisfied-by`, `Falsifiability command`, `Falsifiability result`, `RED failure mode: falsifiability`, **`RED test hash` and its manifest**, **`Falsifiability revision`**, **`qa-gatekeeper` PASS**, GREEN pair                                                                                                                                                                      |
| `exception`    | Row identity (`Layer`, `Test file`, `Selector`) and the obligation reference the `Layer` selects, recorded **before** P1d routes the gate — its audit subject is those plus the `DR-ID` and the DR artifact, so a row without them has nothing reproducible for `qa-gatekeeper` to hash. Then write `todo -> exception` with the `DR-*` the stage recorded; do not re-derive it, and do not enter Phase Green. |

`RED failure mode` is on both rows because the consumer's per-item contract
requires it before the reviewers run, and neither branch was recording it — an
otherwise correct ATDD-owned row reached the completion gate missing a mandatory
field. On an observed RED it is the kind the failure actually was
(`assertion` | `expected-error`); on branch 2 it is `falsifiability`, which is
what that form is.

Every branch carries the row identity and the obligation reference: the audit
subject hashes them and the gatekeeper judges before `/qfai-implement` can add
anything, so recorded later they move a stored hash and left out they can be repointed.

**On a Phase 2b-seeded row the identity comes from the authored test, not from
the ledger.** That row was seeded before any test existed, so its `Test file`
and `Selector` cells are `-`; record the path and selector of the test this
stage wrote, which is the only place they exist yet. `/qfai-implement` Phase Red
step 3b writes both from this entry into the ledger in the same edit that
advances the row, so gate item 10 then compares two equal values. Copying the
`-` instead leaves the row with no writer for those cells at all — nothing later
in the chain authors the test, and the `green` existence check has no path to
check.

**Where each form lives.** The `## Ledger rows advanced` table is an index: one
row per `TDD-*`, holding the branch and an anchor. The commands and their output
go in that row's own `### TDD-NNNN` section, in fenced blocks. They cannot go in
a table cell: a GFM row is one physical line and a cell ends at every unescaped
`|`, so a multi-line run, a shell pipe or a regex alternation in the output
either truncates the proof or breaks every row below it
(`../../qfai-implement/references/execution-ledger.md#evidence-cell-contract`).

`qa-gatekeeper` requires an `Oracle proof` on **every** item — a named
production mutation that makes the test fail, or a recorded `equivalent-mutant`
— because a passing run does not show the test depends on the behaviour the row
owns. A natural RED is not a substitute: it shows the test failed before the
code existed, not that it discriminates once the code does. Branch 2 satisfies
this with the mutation it already performs; branch 1 names the mutation it
intends and `/qfai-implement` records the run at GREEN, when there is production
code to mutate.
Criteria: `../../qfai-implement/references/oracle-strength.md`.

The `Evidence` cell is a pointer; the payload lives in
`.qfai/evidence/atdd-<spec-id>.md` under `## Ledger rows advanced`
(`../../qfai-implement/references/execution-ledger.md#evidence-cell-encoding`).

## Handover to /qfai-implement

`/qfai-implement` Phase Red step 3b routes an `E2E` / `API` row here instead of
through its own steps 4 and 5. Those steps re-run the test and watch it fail —
but by the time that skill reaches the row, the surface exists, so the run
passes and step 5 classifies it as an anomaly bound for `exception`. That is the
terminal state branch 2 exists to avoid, reached through the branch itself.

Read the row's entry and take the branch it names:

| Branch           | What `/qfai-implement` does                                                                                                                                                                                                                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed-red`   | Verify the RED pair names this row's selector and the predicate it owns and that `qa-gatekeeper` passed it, write `todo -> red` from it, then run Phase Green normally — the surface does not exist yet, and building it is this skill's work. Do **not** re-run for a second RED. |
| `falsifiability` | If the trio is present, verify it and treat the mutation run as `todo -> red` with the restored run as GREEN. If it is not — the ordinary case, since only this skill owns the production code the mutation touches — Phase Red **step 3c** performs it and writes it here first.  |
| `exception`      | Write `todo -> exception` with the `DR-*` the stage recorded; do not re-derive it, and do not enter Phase Green.                                                                                                                                                                   |

**A branch-2 row whose evidence is not written yet is not a stop, and not a defer either.** P1b fixes every row branch; the mutation needs production code this stage does not own, so `/qfai-implement` performs it at Phase Red step 3c and records it here. Treating the empty trio as a malformed handoff stopped the run on the first such row; deferring it left nobody able to produce the evidence, since the only phase with a production agent was waiting for it.

## A shared test artifact outlives the row that recorded it

P1c closes one row before the next test is written, so a `done` row’s
`RED test manifest` addresses a fixture, snapshot or helper a later row may still
edit — and a `done` row has no re-entry edge of its own. Where those artifacts
are stabilised, what a later row that must edit one owes the rows that read it,
and how the resulting hash mismatch is cleared: `shared-test-artifacts.md`.

## A spec with no ATDD-owned rows

`/qfai-sdd` Phase 2b seeds a `Layer = E2E` row per **active** `US-*` and a
`Layer = API` row per **active** `CON-API-*` **the spec owns** — ownership being
the lowest-numbered spec whose own `spec-*/01..10` / `16_*` files name that
contract — alongside its rows for
coverage-target `TC-*`. A spec that merely references a `CON-API-*` another spec
owns therefore carries no row for it, and that absence is correct, not an
incomplete Phase 2b: the row exists once, in the owner's ledger.
Both obligations are exempt in cases
`catalog/test-layers.md` names: a spec that declares no user-facing surface
owes no E2E reference for its `US-*`, and a contract at `x-qfai-status: planned`
is excluded from `QFAI-ATDD-113`. The surface exemption is itself conditional —
`QFAI-ATDD-111` is scoped by surface type **only in a project that declares at
least one UI-bearing spec**, so in a project that never declared one the
obligation stays project-wide and every `US-*` is active. A spec whose
obligations are all exempt therefore finds **zero** `Layer = E2E` /
`Layer = API` rows, legitimately, and this stage cannot create them — it is not
the ledger's writer under any circumstance — and so does a spec whose only
active `CON-API-*` belong to other specs. A spec with an **active** obligation
**it owns** finds a row, and this stage's primary procedure enumerates it and
builds the handoff from it.

Zero is a count, not "nothing to do". The US and CON-API coverage obligations
are this skill's own (Success Criteria) and are discharged by the tests and
their annotations, not by ledger rows. Report the row count as zero with that
reason and carry on with the obligations.

**Do not raise it as a request for rows.** Check the exemption and ownership
first: a spec
with no user-facing surface signal — in a project where some spec does declare
one — and no owned `CON-API-*` outside
`x-qfai-status: planned`, is _supposed_ to have none — so the request returns
nothing and the spec is handed back and forth for rows Phase 2b is right not to
seed. A genuinely missing row for an **active** obligation **this spec owns** is
an incomplete
Phase 2b: record it in this stage's report and carry on; it does not become
writable here. Writing them
here is not the alternative either: that would make this stage a second writer
of a single-writer artifact. What the completion gate actually requires is
`QFAI-ATDD-111` / `QFAI-ATDD-113` clean, which the annotations discharge and
which this stage does own
(`../../qfai-implement/SKILL.md`, spec completion conditions).

## A project without the `red` phase

`npx qfai init --force` regenerates `assistant/skills/**` and
`assistant/agents/**` but leaves `assistant/manifest/**` alone, so an existing
project can take this skill's update without the `red` phase it relies on — and
without the `agent-catalog.yml` role contracts the reviewers read. The gate
still applies. What is stale, why routing it by hand is not enough on its own,
and how to bring both files forward: `stale-manifest.md`.

## What the nested run owes

P1c hands a branch-1 row to `/qfai-implement` and gets it to GREEN and its
checkpoint **before** P5 and P6; **P4b hands a branch-2 row over on the same
terms**, and it too sits before P5/P6, so both are covered by everything below.
Naming only P1c here left the falsifiability rows stopped at `refactor` by the
completion inputs their own stage had not produced yet. Either run is an **item
cycle**, not this spec's completion: its blocking reviewers judge the row's own RED/GREEN evidence, and
the completion-gate inputs — `.qfai/report/validate.log`, the coverage reports,
runtime evidence — are P5/P6 artifacts that do not exist yet and are not owed
here. **That applies to every blocking reviewer of the nested run, not only
`qa-gatekeeper`**: `completion-reviewer` is mandatory and blocking there too and
requires validate evidence, so exempting one and not the other left the first
branch-1 row stopped at the same gate for a different reason. In an item-cycle
invocation each of them judges the row's own phase-authored evidence and nothing
else (`../../../agents/qa-gatekeeper.md` and
`../../../agents/completion-reviewer.md`, the note above their completion-gate
inputs).

Requiring them would strand the first branch-1 row at `refactor`, which Phase
Red does not re-select, and P2 would never be reached — the gate blocking on
artifacts its own ordering produces later.

## Branch 3 does not close a spec on its own

`exception` is a legal terminal status for a row and a legal outcome for this
stage. It is **not** a completion: `qfai-implement/SKILL.md` lists `exception`
as a blocking output and forbids declaring completion while one stands, unless
the row carries a **user-approved accepted-risk waiver** — a `TDDLIST-001` entry
in `.qfai/waivers.yml`.

So a branch-3 row ends in one of two places, and the stage has to say which:

- **the waiver is obtained** — user approval is a decision this stage asks for,
  never one it makes. Raise it with the `DR-*` in hand: what could not be
  observed, why neither branch was available, and what risk is being accepted;
- **the row is parked and the spec stays open** — recorded as such, not reported
  as done.

Recording the `DR-*` and handing the row over discharges the _branch_. Treating
that as closing the spec leaves a spec that can never legally close, because
nothing later in the flow can produce the approval retroactively.

## A `review-fix` row comes back here for a new RED

A reviewer's REVISE that asks for a change to the acceptance test returns the
row to this stage: `/qfai-implement` does not author those tests and its `red`
phase has no `acceptance-test-engineer`. What the corrected test owes — a fresh
RED when it fails, the no-round path plus a re-addressed manifest and a proof
marked stale when it passes, and where the round block goes — is in
`review-fix-rounds.md`.

## Which stage hands a row over

All three branches are handed to `/qfai-implement`. None of them writes its own
ledger transition — that skill owns `Status` / `DR-ID` / `Evidence` for every
row — so a row `/qfai-atdd` never hands over stays at `todo` however complete
its work is. What differs is _when_, and a run consisting only of branch-2 or
only of branch-3 rows has to hand them over just as a branch-1 run does.

| Branch           | Handed over                     | Why then                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed-red`   | P1c, one row at a time          | The row ends with a deliberately failing test and no production code, and P5-P8 need a green suite. A second deliberate RED left open elsewhere fails the first full-suite checkpoint that reaches it.                                              |
| `falsifiability` | P4b, after P4 and before P6     | The trio is produced by Phase Red **step 3c**, the only step that runs the mutation, and the mutation needs the surface P2-P4 build. The trio is the row's RED payload, so P6 has nothing to capture and P8 nothing to judge until step 3c has run. |
| `exception`      | P1d, once the `DR-*` is written | Only `/qfai-implement` can write `todo -> exception`. A run with no branch-1 row otherwise ends with the Decision Record recorded and the ledger untouched.                                                                                         |

A branch-2 row is _passed over_ by `/qfai-implement` when it is not the named
row — see the note above — which is neither a stop nor a defer of the branch:
P4b hands it over in its turn.

### What each stage gate owes

**P1b — choose, for every row.** A row with no branch chosen is the one that
leaves P1b with no legal transition out of `todo`. **The choice is provisional
until the row's own handoff**: re-run the test against the tree as it stands
immediately before handing the row over and take the branch that result names.
An earlier branch-1 row's production code can satisfy a later row's predicate,
so a branch recorded at P1b as `observed-red` can have no observable RED left by
the time that row's turn comes.

**P1b and P1c are one loop per `TDD-ID`**, not two phases. P1c takes each row through
GREEN and its checkpoint before the next row's failing test is written; completing every
branch-1 RED in P1b first would leave several deliberate failures open at once, and any
checkpoint that runs the full suite sees all of them. This file does not restate which
rows those are, or how often they come: the cadence is defined only in
`../../qfai-implement/references/relevant-test-suite.md#checkpoint-boundaries` and
this file states no condition of its own. Deferring the RED does not escape it either — a
spec cannot be declared complete without the spec-level boundary, which runs the full
suite unconditionally — so a stray RED is reached at the latest there, and the row whose
checkpoint it fails is then stranded at `refactor`, which Phase Red does not re-select.

**P1c — discharge branch 1, one row at a time.** Branch 1 ends with a
deliberately failing test and no production code, and this stage does not write
that code. P5-P8 require the suite and the repo quality gates to pass, which
the RED makes impossible, so the handover is not deferred to the end: run
`/qfai-implement` for the row now, let its Phase Green build the surface and
take the GREEN, and return with the tree green. Name the row in the handoff —
`/qfai-implement` passes over a branch-2 row sitting above it rather than
stopping, which is what keeps this round-trip from deadlocking against its own
P6.

**What the blocking `qa-gatekeeper` judges.** The `red` phase's gatekeeper
judges the rows that have evidence at P1b — the branch 1 ones. It cannot judge a
branch 2 row there: that row's payload is the falsifiability trio, which does
not exist yet by the same rule that lets the row leave P1b. A run whose rows are
all branch 2 passes P1b with nothing submitted, and its rows are gated when the
trio lands.

If the entry is absent, names no branch, or is malformed in any other way, the
row **stays at `todo`** and `/qfai-implement` **stops with a handoff note**.
Writing `red` first and discovering the gap afterwards parks a `red` row with
no RED behind it; inventing one for a test it did not author is a drift
violation, not a recovery.
