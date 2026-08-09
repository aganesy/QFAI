# RED Provenance for an ATDD-owned Ledger Row

`.qfai/specs/<spec-id>/tdd/test-list.md` is `/qfai-implement`'s execution
ledger, and `qfai-implement/SKILL.md` states the split: **`Layer = E2E` and
`Layer = API` rows are tracked there, but their tests are authored here.** This
skill therefore writes into a ledger whose status lifecycle it does not define.

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
      `NotImplementedError`) and an empty body. Routing resolves, the status
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
      reads as fresh. Record `working-tree+<hash>` over HEAD **and** the content
      of the changes on top of it: hash `git rev-parse HEAD`, `git diff HEAD`
      and the contents of every untracked file, together. **Not
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
      and the hash is taken over `path + NUL + blob hash` in that order, the same
      shape the revision manifest uses. Naming the _kinds_ of file is not enough:
      the consumer recomputes this before GREEN, and two readers who choose
      different sets get different values from an unchanged tree, so the gate
      either loops or passes an edit it never looked at.

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

| Branch         | Recorded                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Observed RED   | RED command+result, `RED revision`, `qa-gatekeeper` PASS, the `Oracle proof` plan                                |
| Falsifiability | `Satisfied-by`, `Falsifiability command`, `Falsifiability result`, GREEN pair                                    |
| `exception`    | Write `todo -> exception` with the `DR-*` the stage recorded; do not re-derive it, and do not enter Phase Green. |

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

## A spec with no ATDD-owned rows

`/qfai-sdd` Phase 2b seeds a ledger row per **coverage-target** `TC-*`, which
excludes `L4` / `L5`; `US-*` and `CON-API-*` are not row-producing
obligations there. A first run therefore finds **zero** `Layer = E2E` /
`Layer = API` rows, legitimately, and this stage cannot create them — it is
not the ledger's writer under any circumstance.

Zero is a count, not "nothing to do". The US and CON-API coverage obligations
are this skill's own (Success Criteria) and are discharged by the tests and
their annotations, not by ledger rows. Report the row count as zero with that
reason, and raise the missing rows as a request to `/qfai-sdd` — writing them
here would make this stage a second writer of a single-writer artifact.

## A project without the `red` phase

`npx qfai init --force` regenerates `assistant/skills/**` and `assistant/agents/**`
but leaves `assistant/manifest/**` alone: those are the declarative files
`qfai-configure` owns, and overwriting a project's adjusted agent taxonomy is
the worse failure. So an existing project can take this skill's update without
taking the `red` phase the update relies on.

The gate still applies. Route `qa-gatekeeper` for the branch-1 rows by hand at
P1b, and record in the evidence file that the phase was absent and the routing
was manual. A missing phase is a stale manifest, never the gate not applying —
and the same is true of the production owners `qfai-implement`'s red phase
needs for step 3c.

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

`/qfai-implement` Phase Red step 3b sends a `review-fix` row back when the
blocking reviewer's REVISE asks for a change to the acceptance test itself: that
skill does not author these tests and its `red` phase has no
`acceptance-test-engineer`. The three branches above define the **first**
handoff of a `todo` row, so this one needs its own contract.

- **Invocation.** Named by `TDD-ID`, with the reviewer's REVISE and its round
  number. The row stays at `review-fix` throughout — this stage writes no
  ledger cell, and `review-fix -> red` is not a transition.
- **What this stage does.** Correct the test the REVISE names, then **run it and
  let the result choose the path** — the same first-run check branch 1 makes,
  for the same reason.
  - **It fails.** Take that as the fresh RED, exactly as branch 1 does: record
    the pair, the `RED revision` and the `RED test hash`, and get
    `qa-gatekeeper` PASS on that run.
  - **It passes.** Many REVISEs ask for no new behaviour at all — splitting a
    selector, renaming a test, making an expectation explicit — so the corrected
    test passes on the first run and there is no RED to take. Demanding one
    stranded the row at `review-fix`. Record the run and its revision, and
    take the **no-new-behaviour path** of
    `../../qfai-implement/references/round-evidence.md`: no round is opened, and
    the row returns on that basis.

    **Re-address the test.** The REVISE changed the test, so the `RED test hash`
    recorded at handoff still addresses the manifest before the edit, and the
    consumer checks it against the current one before the reviews
    (`../../qfai-implement/SKILL.md`, the field contract) — a mismatch is sent
    back here for a fresh RED, which is this same passing no-round path, for
    ever. Recompute the manifest and the hash over the corrected test and
    **replace** the recorded pair, marked `test-only replacement` with the
    reviewer verdict that asked for it. That is what the consumer accepts in
    place of a fresh RED: the reviewer judged that no new production behaviour
    is owed, so there is no RED to take, and the hash's job — telling "the test
    moved under the RED" from "only production changed" — is discharged by
    naming the verdict that moved it.

    **Not falsifiability.** That form needs a production mutation, which this
    stage owns no agent for and cannot hand over either: Phase Red step 3b
    excludes a `review-fix` row by name and step 3c is reachable only from a
    `todo` falsifiability entry, so there is nobody to produce the trio and the
    row would sit at `review-fix` again. A REVISE whose repair genuinely needs
    new production behaviour is not this case — that one's corrected test fails,
    and the branch above applies.

- **Where it goes.** A `### Round N` block in
  `.qfai/evidence/atdd-<spec-id>.md`, keyed to the round the reviewer opened,
  in the shape `../../qfai-implement/references/round-evidence.md` defines.
  Not a second `## Ledger rows advanced` entry: that section is the record of
  a first handoff, and appending to it would read as one.
- **Handing back.** Return to `/qfai-implement` naming the round. The
  production fix and the re-review happen there, and the row leaves
  `review-fix` by that skill's own path.

A REVISE that does **not** touch the acceptance test never reaches this stage;
it is production rework and stays where it is.

## Which stage hands a row over

All three branches are handed to `/qfai-implement`. None of them writes its own
ledger transition — that skill owns `Status` / `DR-ID` / `Evidence` for every
row — so a row `/qfai-atdd` never hands over stays at `todo` however complete
its work is. What differs is _when_, and a run consisting only of branch-2 or
only of branch-3 rows has to hand them over just as a branch-1 run does.

| Branch           | Handed over                     | Why then                                                                                                                                                                                                                                            |
| ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `observed-red`   | P1c, one row at a time          | The row ends with a deliberately failing test and no production code, and P5-P8 need a green suite. A second deliberate RED left open elsewhere fails the first row's checkpoint.                                                                   |
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

**P1b and P1c are one loop per `TDD-ID`**, not two phases. P1c takes each row
through GREEN and its checkpoint before the next row's failing test is written;
completing every branch-1 RED in P1b first would leave several deliberate
failures open at once, and every row's checkpoint runs the full suite
(`../../qfai-implement/references/checkpoint-verification.md`). A second deliberate
RED left open elsewhere fails the first row's checkpoint — and that row is then
stranded at `refactor`, which Phase Red does not re-select.

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
