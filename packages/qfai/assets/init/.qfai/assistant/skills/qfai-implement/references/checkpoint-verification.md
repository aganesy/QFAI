# Checkpoint Verification

"Checkpoint verification" is the whole-repository regression check run at a checkpoint boundary. It
is what item 12 of the 12-point gate refers to and the only thing it refers to.

## Checkpoint boundary

A checkpoint boundary is reached in exactly two places:

- **Per item** — on a row that is _on_ a boundary: after all routed blocking reviewers have returned
  PASS for the item and before it transitions `refactor` -> `done`. **Not every row is one.** Which
  rows are is defined in `relevant-test-suite.md#checkpoint-boundaries`, and a row between
  boundaries is already satisfied by the narrow relevant suite of Phase: Refactor step 2 — nothing
  is re-run there. That row still owes the three checkpoint evidence fields; what it records in
  them is in `#evidence`.
- **Per spec** — after the last item in `test-list.md` reaches `done` or a valid `exception`, before
  declaring spec-level completion.

No other point is a checkpoint boundary. This file does not restate the per-item frequency: the
anchor above is its single definition, and a second copy here is exactly what let the two drift into
contradicting each other.

The two do **not** run the same commands. The per-item set is confined to what the item's own
change can reach; the spec-wide commands belong to the per-spec set. Both are below, and each one
is the whole of the applicable set at its own boundary.

## Verification command set (per item)

Run all of the following from the repository root, in order. Substitute the project's own runner for
the placeholders; record the literal commands actually executed in evidence.

1. The item's own test — the ledger's `Test file`, run **file-scoped, with no test-name option**:

   ```bash
   <test runner> <Test file>
   ```

   **Why the name option is not prescribed here.** Narrowing the run to the ledger's `Selector` is
   the obvious move and an earlier form of this step required it. Do not, unless you have checked
   that your runner matches the selector **literally**. Vitest's and Jest's `-t` take a _regular
   expression_, and a `Selector` written in the common `TC-NNNN-NNNN (TDD-NNNN): title` shape
   contains `(` and `)` — which the matcher reads as a capture group, not as characters. The pattern
   then matches nothing, the runner reports `Tests 1 skipped (1)`, and it **exits 0**: a checkpoint
   that establishes nothing while reporting success. Nothing downstream distinguishes it from a real
   pass, because the exit code is what the surrounding procedure reads.

   The file-scoped form cannot fail that way. It over-runs when several rows share one file, which is
   the safe direction — it can only execute more than the row, never less.

   **If you do narrow**, escape the selector for your runner's matcher, record the literal command,
   and check that the run actually selected something: `passed >= 1` for a GREEN, `failed >= 1` for a
   RED. A skipped count is not a pass.

   **The unit of selection is not always a file.** Package-selecting runners (`go test`) take a
   package, not a path. `go help test` documents the usage as
   `go test [build/test flags] [packages] [build/test flags & test binary flags]`, and it compiles
   the package's sources together with the matching `*_test.go` files. Handing it a lone file
   switches it into file mode and drops the rest of the package from the build, so the item's test
   normally fails on undefined symbols. Derive the package from the `Test file`'s directory:

   ```bash
   go test ./<dir of Test file>
   ```

   Record the literal command actually run either way. If a project's runner selects by something
   else again, derive that unit from `Test file` in the same manner and say so in the evidence.

2. The full test suite — `<test runner>` with no file filter and no test-name option.

That is the whole per-item set. Both commands are properties of **this item's own change** — step 1
is the row's own `Selector`, step 2 is what that change could have broken — and a per-item gate can
only be discharged by properties of the row it gates. The static gates and `npx qfai validate` are
properties of the **spec**, so they sit in the per-spec set below and are **not** run here. Carried
per item, they conditioned `refactor` -> `done` on every _other_ row's Evidence cell and on
`.qfai/contracts/**`, which the Drift Protocol puts upstream and outside this skill's write scope —
findings the gated row neither caused nor may fix. One unrelated defect anywhere in the spec then
holds every row at `refactor`, and no row can clear it. When such a finding is already known,
record it for the per-spec boundary with its owning spec; do not fix it from here, and do not
weaken the profile to clear it.

## Verification command set (per spec)

The spec-level boundary has no "item just completed" — a re-run in a later session has none, and
under parallel slices the ledger order does not identify one either. So step 1 is dropped, and the
two spec-wide commands are added: the spec-level set is step 2 above plus steps 3 and 4 below.
Everything step 1 would have proved is already covered by the full suite. Steps 3 and 4 run at this
boundary and only at it — it is the boundary whose owner can act on what they report.

3. The project's static gates, when the repository defines them — formatter check, linter, and type
   check. **These take no `--spec`**, and a repository's own gates are whole-tree by construction —
   `prettier -c .`, `eslint .`, `tsc -b` — so a file a sibling spec or another package has in flight
   fails them at a boundary whose owner never wrote it. Classify every static finding by the file it
   names before repairing anything, exactly as step 4 classifies its own: a file a `done` row of
   **this** spec produced, or a test file this spec's ledger names in `Test file`, is this
   boundary's to repair (_Repairing a per-spec FAIL_). Any other file — a sibling spec's source,
   another package's, one no row of this ledger touched — takes the record-and-wait branch instead:
   record the finding with the owning spec or area and why it is not this checkpoint's work, and
   leave the boundary unpassed until that owner clears it. Repairing it from here would rewrite a
   spec this run is not processing, and the boundary owner can act on what a gate reports only for
   the files this spec's rows produced.
4. `npx qfai validate --profile tdd --fail-on error --spec <spec-id>` — qfai is a project
   dependency, not a global command; a bare `qfai …` is `command not found` (exit 127) on a normal
   local install, which would fail every checkpoint. `--spec` scopes the run to the spec this
   checkpoint is for: this skill processes one spec at a time, so an unscoped run makes a sibling
   spec's in-flight failure fail this checkpoint. It also writes
   `<report>/validate.spec-<id>.json` instead of the shared `validate.json`, so the checkpoint
   artifact cannot be overwritten by another spec's run.
   **`--spec` scopes the spec-owned rules only, and this checkpoint still fails on the rest.**
   `QFAI-TEST-001` names a test file, the `QFAI-TRACE-*` findings **that have no spec
   owner** are filed against `.qfai/specs/` itself, and the contract validators run
   regardless of scope —
   `QFAI-CONTRACT-*` and `QFAI-DB-002` are filed against `.qfai/contracts/**`, which
   no spec owns. None of the three has a spec owner, so a sibling spec's `it.todo`, a
   `CAP-*` it has not created yet, or a malformed contract it is mid-way through
   editing, exits 1 here. **Not the whole `QFAI-TRACE-*` family**: the per-artifact
   ones are filed against the spec's own `03_Acceptance-Criteria.md` /
   `04_Business-Rules.md` / `05_Examples.md` / `06_Test-Cases.md` and its ledger, so a
   sibling's are dropped by the scope filter and never reach this checkpoint —
   treating them as still-blocking reports a failure this run cannot see. Record the finding, its owning spec and why it
   is not this checkpoint's work; do **not** drop `--fail-on error`, weaken the profile, or
   report the checkpoint as passed.

## Pass criteria

Checkpoint verification PASSES only when **every** command in the applicable set exits 0, and — for
the per-spec set, the only one that includes it — step 4
reports zero `QFAI-TEST-001` **and** zero `QFAI-TEST-002` findings that a waiver has not already
marked `suppressed=true`. The JS/TS `.skip` family is the separate warning rule `QFAI-TEST-003` and is
not counted here. `QFAI-TEST-002` is `info`, so it never fails `--fail-on error`; it reports that the
stub scan produced no evidence — most often an empty `validation.traceability.testFileGlobs`, the
value `npx qfai init` ships, under which zero files are scanned and `QFAI-TEST-001` cannot fire at
all. Reading that exit 0 as a pass passes a gate that never ran: configure the globs
(`/qfai-configure`) and re-run. A waiver does not remove the finding — it stays in the output carrying
`suppressed=true` — so a `QFAI-TEST-002` a `.qfai/waivers.yml` entry has marked that way is the
accepted exception (typically an extension qfai has no stub dialect for) and does not block; every one
without the mark does. Any non-zero exit is a FAIL: for a per-item checkpoint the A step
outside the applicable set is not owed, and its absence is not a partial run. Any non-zero exit is a
FAIL: for a per-item checkpoint the item stays at `refactor`, the failure is fixed, and the whole
set is re-run. A partial run of the applicable set is not a pass.

### The one substitution: a measured delta for step 4

Step 4 alone MAY be judged on a **measured delta** instead of on exit 0, and only when all five of the
following hold. This exists for the case where the profile already reports findings that no row in the
slice can discharge — a validate run cannot exit 0 against a standing error, so without this the gate
would hold every row of every slice hostage to work outside it.

1. The baseline — the counts **and** the finding IDs — was captured before the slice's first code
   change and recorded in the slice's evidence **before any row started**. A baseline written after the
   fact is not a baseline.
2. Step 4 reports zero `QFAI-TEST-001` findings. This clause is never substituted.
3. The aggregate does not worsen, on **both** measures the baseline records: no severity count
   **attributable to this slice** is higher than the baseline's, **and no finding ID appears that the
   baseline did not hold**. The count alone is not the test — resolving one finding while introducing
   a different one leaves every count unchanged, and clauses 4 and 5 below only ever read baseline
   findings, so a new ID would reach none of them. A finding this slice introduced is a regression
   whatever its severity.

   **Attributable** is read the way clause 5 already reads a finding: by the spec and row each finding
   names, which the validator prints on every line. A count that rose because a sibling spec gained
   findings, or because a validator's own defect widened what it reports, is not this slice worsening
   the aggregate — and the raw total made those indistinguishable from a real regression, which is
   what stalled four rows behind a warning count they did not cause.

   **Record both.** The attributed delta is what the clause is judged on; the raw total is recorded
   beside it, unjudged, so a cross-spec regression this slice really did cause is still visible rather
   than attributed away. A boundary that records only the attributed figure has not satisfied this
   clause.

4. **No row's `TC-*` re-enters the unreferenced-TC list.** Stated as re-entry rather than as departure,
   because departure is undischargeable for a sibling: when one `TC-*` is split across several rows,
   the first row to discharge it removes it from the list and every sibling then satisfies a departure
   clause vacuously. Re-entry is checkable for every row, and it pairs with the row-level obligation the
   validator already enforces — that a row's `Selector` resolves in its own `Test file`.
5. **Every finding the baseline holds open is unattributable to the row being closed** — it names an
   obligation that row does not carry. Read per row, not per spec: a finding naming another row's
   obligation in the same spec, or an obligation owned by an upstream phase, does not block this row.
   What it does forbid is the case it exists for — closing a row while a baseline finding names **that
   row's own** obligation.

Clause 5 is the load-bearing one. It is also the one to state carefully in the evidence: name each
baseline finding, name whose obligation it is, and say why that is not the row's. A slice that cannot
answer that per row has not earned the substitution.

The substitution applies to step 4 and nothing else. Every other command in the set still has to exit 0.

**A fix invalidates the reviewer PASS that preceded it.** The per-item boundary sits after
`completion-reviewer` and `implementation-reviewer` returned PASS (Phase: Refactor, steps 4-5), so
those verdicts were given against the pre-fix test and production code. Whenever the fix changes
either, re-submit to every routed blocking reviewer the change could affect — always the ones whose
scope it touches — and obtain a fresh PASS **before** re-running the command set. Re-running the
commands alone would let an item reach `done` carrying code no reviewer ever saw, which the
skill's own stale-evidence rule forbids. A fix that changes nothing a reviewer judged — re-running
after a flaky external service, say — needs no re-review; record which case applied.

### Repairing a per-spec FAIL

A per-item FAIL keeps its row at `refactor`, where every repair edge is still available. The
per-spec set has no such row: every row is `done` or a valid `exception` before it runs, and steps 3
and 4 run **only** here — so an ordinary implementation defect over code a `done` row produced, a
formatter, linter or type-check failure among them, first becomes visible at a boundary where
`execution-ledger.md#allowed-transitions` gives `done` a single exit (the approved upstream reset)
and `SKILL.md` skips `done` rows on re-execution. Stated without the rest of this section, that
failure would have no legal repair path at all. **Everything below is about a finding this spec
owns**: steps 3 and 4 classify each one first, and a finding over a file this spec's rows neither
produced nor name is recorded for its owner there and never enters this path.

**A per-spec FAIL is not a ledger event.** Fix it in place and leave every `Status` where it is: no
row's obligation moved — the test still owes the criterion it always owed and still passes — so no
TDD cycle restarts and no reset is owed. What the fix does move is the tree. The GREEN of gate item 5, the
reviewer verdicts of items 7-9 and the per-item checkpoint of item 12 that the affected rows
recorded were all taken against a `Revision` the repair replaces, and
`evidence-revision.md#what-makes-evidence-stale` calls an observation stale the moment the tree its
work landed at is no longer the one it names. Re-taking the reviewer verdicts alone leaves the rest
of that set describing the pre-fix tree, with nothing recorded anywhere saying the row's test still
passes and still discriminates over the repaired one — on rows the item loop skips, so no later run
supplies it either.

**Re-verify each affected `done` row, and record it at the boundary.** A `done` row's own entry is
not rewritten: its observations honestly address the revision they were made at, and appending to
one breaks the `Audited evidence hash` of the verdicts that closed it. Pair it instead, exactly as
`../../qfai-atdd/references/shared-test-artifacts.md` pairs a `done` row whose shared fixture a
later row edited — the row keeps the observation it made, and the record that is still open carries
the proof that it still holds. That record here is the spec-level boundary's own, in the evidence
file the rule below selects, under a `## Shared-artifact re-verify` heading beside it: this stage is
the one that moved the artifact, so this is the second of the two places gate item 10 already reads.
**The gate consumes it as the substitute for the observations the repair invalidated**, not only as
the entry that clears a handed-over row's `RED test hash`: for a `done` row this block names, gate
items 5, 7-9 and 12 are verified from what the block carries at the `Revision` it names, and that
`Revision` is the one those items agree on — `SKILL.md` item 10 states the same rule from the gate's
side, and the two are one contract. Without it the gate still read the un-rewritten entry, whose
GREEN, verdicts and checkpoint describe the pre-fix tree, so a row could be re-verified exactly as
this section requires and remain stale for ever with nothing able to clear it.
One line per `done` row the fix touched, naming **its spec and `TDD-ID` together**
(`spec-0002/TDD-0001`) and carrying, at the new `Revision`:

- the row's own selector re-run — the per-item step 1 command — and its result;
- that row's recorded `Oracle proof` mutation re-taken against the repaired tree, reverted, and the
  restored GREEN. A passing re-run alone is not enough on a row that has a proof: the repair may
  have left the test passing against anything;
- a fresh verdict from every **required** reviewer whose scope the fix touches. "Required" is wider
  than `blocking_agents`, exactly as it is at the 12-point gate: `implementation-reviewer` and
  `completion-reviewer` always, and `product-surface-reviewer` on a UI-affecting row, which
  `agent-routing.yml` lists only under `conditional_agents` while item 9 still requires its
  prototype parity PASS. A repair that changes display logic to satisfy a linter or the type checker
  is that case, and re-running the blocking list alone would carry the pre-fix surface verdict onto
  a display it never saw;
- when the fix touched the row's test file, or any artifact its `RED test manifest` names, that
  artifact's new manifest and hash — the evidence the `RED test hash` recomputation at item 10 is
  looking for, which mismatches by construction once a test file moves. **Item 3 is not re-taken**:
  a RED addresses the manifest as it was when it was observed, and a `done` row has no transition
  that would let it observe another. **That is the rule for an edit that leaves every assertion
  asserting what it asserted**; an edit that moves what one asserts owes item 3 evidence of its own,
  and the paragraph below is where that evidence is taken.

The spec-level `Checkpoint verification seal` is taken over this block as well as over the command
and result, so a line added afterwards moves it. **`exception` rows are outside all of this.** A
parked row's evidence is not checked at any gate — `execution-ledger.md` exempts rows at `todo`,
`red` and `exception` — and it never reached Phase Green, so it owes no GREEN, no `Oracle proof`, no
item 6 re-confirmation and no per-item checkpoint; its reason lives in its `DR-*`. Asking one for
that evidence is asking for a run it could not have made. If the repair resolves the anomaly, or
invalidates what the `DR-*` records, `exception -> todo` is that row's own exit and needs no
approval — nothing here reopens it in place. Only once every affected `done` row is re-verified do
you re-run the **whole** per-spec set. Spec-level completion is declared from that re-run, never
from the failed one.

**A test edit alone is not a Change Request.** What makes a repair one is the **obligation** moving —
the acceptance criterion, business rule or `TC-*` the row's `TC-ref` names — not the test text
changing. A formatter rewrap, an unused import, a type annotation or a rename leaves the obligation
exactly where it was, and so does correcting an expected value that never matched the criterion it
was written from: the row owed that criterion all along and its test merely stated it wrongly. Both
are repaired by the re-verification above. Routing them to the approved reset instead would demand a
CR that `change-request-reset.md` cannot legitimately issue — that reset exists for an approved
**upstream** change invalidating rows, and here no upstream artifact moved — leaving the row holding
a static gate it may never clear. A correction that does move the assertion owes more inside the
same path, not a different path — and more than a re-taken `Oracle proof`. That mutation was chosen
against the assertion the correction replaced, so re-taking it shows the **old** predicate
discriminating; the row's RED is the old assertion failing, and
`evidence-revision.md#what-makes-evidence-stale` invalidates it the moment a later change touches
the test. Between them nothing says the corrected assertion would have failed before the production
code existed, which is what item 3 is. A `done` row cannot take a fresh RED, so it takes the
substitute item 3 already admits: **falsifiability evidence for the corrected assertion.** Break the
production predicate that assertion names, run the row's `Selector`, and confirm the failure is
admissible — an assertion failure raised by the corrected assertion, its message naming that
predicate (`red-admissibility.md`) — then revert and re-run for the restored GREEN. Record on that
row's line, at the mutated tree's `Falsifiability revision`, the trio `Satisfied-by`,
`Falsifiability command` and `Falsifiability result` with `RED failure mode: falsifiability`, and
route `qa-gatekeeper` on the mutation run exactly as Phase Red step 3c does — so what satisfies item
3 is an observation of the assertion the row now carries, not one of the assertion it replaced.
`completion-reviewer`'s fresh verdict is what confirms it still covers the row's `TC-ref`. An edit
that leaves every assertion asserting what it asserted owes none of this.

Two findings do leave the in-place path. When the repair cannot be made without moving the
obligation itself — the acceptance criterion, the business rule or the test case behind the row, so
an upstream artifact has to change — that is a Change Request, and the row re-enters through the
approved reset (`change-request-reset.md`), which is the legal reopen precisely because something
upstream changed. When the finding has no owner inside this spec — the `.qfai/contracts/**` and
un-owned `QFAI-TRACE-*` findings step 4 describes, the out-of-spec static findings step 3
classifies, **and a `QFAI-TEST-001` this spec does not own** — it is not repaired from here at all.
Record it with its owning artifact or spec as step 4 requires, and the boundary stays unpassed until
its owner clears it.

**A `QFAI-TEST-001` is split by the file it names, not by the rule id.** A stub in a test file no
row of this ledger names in `Test file` sits in the tests of the spec that owns that file, and is
that spec's to clear — repairing it from here would edit a spec this run is not processing. A stub
in a file this ledger **does** name splits once more, on the obligation behind it:

- one standing for an obligation a row of this spec already carries is scaffolding a `done` row left
  behind. Deleting it removes no assertion and moves no obligation, so it is an obligation-preserving
  test edit: the in-place re-verification above is the whole of its repair, including the new
  manifest and hash the edit moves;
- one standing for an obligation no row carries is a **missing row**, and rows are upstream — this
  skill writes the ledger's `Status`, `DR-ID` and `Evidence` cells and nothing else (`SKILL.md`
  Non-goals) — so record it with the obligation it names for `/qfai-sdd`, and the boundary waits for
  that row to exist and run.

Routing every `QFAI-TEST-001` to record-and-wait made the first case name this spec as its own
owner while every row was terminal and skipped: the finding had no repair subject anywhere and the
boundary could never be passed.

## Spec-level boundary on an already-complete ledger

A ledger is **terminal** when every row is `done` or a valid `exception` — the same condition the
spec completion conditions use. The last row reaching `exception` ends the loop exactly as `done`
does, so both must reach this boundary.

The per-spec boundary is owed once per terminal ledger state, not once per session. Two cases leave
it unrecorded:

- the run was interrupted between the last row reaching its terminal status and the spec-level
  verification;
- `/qfai-implement` is re-run against a ledger that is already terminal.

In both, an unconditional "nothing to do" exit would skip the boundary permanently, and no later
re-run could repair it — a re-run finds no `todo` rows to process either. So before that exit: read
the spec's evidence file for spec-level `Checkpoint verification command` /
`Checkpoint verification result` entries covering the current ledger state. Run the **per spec**
command set above and record them when they are absent, when they predate the last ledger change,
or when the `Revision` recorded beside them is not this tree's. Only then report "nothing to do".

**Ledger state is not tree state.** A terminal ledger stops moving; the production code, the tests
and the dependencies under it do not. An edit after the last row reached its terminal status leaves
a recorded PASS that no ledger change postdates, so a freshness rule keyed on the ledger alone reads
that PASS as current and a re-run reports "nothing to do" against a tree it never executed. The
recorded `Revision` is what closes that gap, and it is the same mechanical staleness test the rest
of this contract already uses: compare it to the current tree by the procedure in
`evidence-revision.md`, and on any mismatch re-run the command set instead of reusing the result.
Recomputing the `Checkpoint verification seal` is not a substitute — the seal detects a record
edited after the fact, not code that moved underneath an honest record, so a stale PASS survives it
intact.

**Which file, for a boundary that has no `Layer`.** The per-item rule below picks the file from the
row's `Layer`, and this result belongs to no row. The spec-level boundary is written to
`.qfai/evidence/implement-<spec-id>.md` whenever that file exists, and to
`.qfai/evidence/atdd-<spec-id>.md` when it does not — the terminal-ledger case of a spec whose every
row is `E2E` / `API`, where the implement file was never created. Read and write are the same rule,
so a re-run finds what the previous run wrote instead of judging the boundary unrecorded, and the
one-file-per-spec contract holds: a spec never has this boundary in both files.

## Evidence

Record a **per-item** result in the evidence file the row's `Layer` owns (the spec-level boundary
above has no row, and its own rule is stated there) —
`.qfai/evidence/implement-<spec-id>.md`, or `.qfai/evidence/atdd-<spec-id>.md` for an `E2E` / `API`
row — using the per-item evidence fields `Checkpoint verification command`,
`Checkpoint verification result`, `Checkpoint verification revision` and
`Checkpoint verification seal`. **The revision is this run's own**, taken by the procedure in
`evidence-revision.md` against the tree the command set actually ran on. It is not a round block's
`Revision`: `round-evidence.md` scopes that field to a round and it addresses the pre-refactor tree
(`evidence-revision.md#which-tree-each-gate-item-addresses`), while this boundary sits after every
reviewer PASS and before `refactor` -> `done`, so sealing with it would certify a run that was never
made there — and a producer trying to make the two agree would overwrite item 5's address instead.
It is not borrowed from `Refactor verify revision` either: a checkpoint failure is fixed and the
whole set re-run (above), which moves this address, and the field has to be able to move with it.
The seal is the audit hash over the command and the result together with that revision, taken the
moment the run ends
and recomputed at gate item 12: these fields are appended after every reviewer has hashed, so they
sit in no audit subject, and the revision that would otherwise cover them excludes
`.qfai/evidence/**`. Without it a recorded FAIL could be edited to PASS on a `done` row and no hash
anywhere would move.

The seal input is canonical and machine-recomputable: the exact three lines
`Revision: <value>`, `Checkpoint verification command: <value>`, and
`Checkpoint verification result: <value>`, in that order. Normalize them to LF, strip trailing
whitespace from each line, remove leading/trailing blank lines, add one final newline, then record the
lowercase SHA-256 of those bytes. Do not wrap this field-only seal in a file-path manifest record.
**A row between boundaries records the same three fields.** They are unconditional — gate item 12
recomputes the seal on every row — so a row off a boundary cannot leave them empty and cannot
invent a full-suite command it never ran. Nothing is re-run there, so
`Checkpoint verification command` takes the narrow relevant-suite command set of Phase: Refactor
step 2 verbatim, `Checkpoint verification result` takes that run's outcome, and the seal is taken
over the two together with the `Revision` exactly as at a boundary. Item 12 accepts that pair: it
requires the **full** suite only for a row that sits on a boundary. What lets a reviewer tell a
narrow off-boundary record from a truncated boundary one is the resolution step (1-3), and it
already has a home: `relevant-test-suite.md` requires it in the item's evidence. Record it there,
beside these fields — **never inside `Checkpoint verification command`**. That field is the command
set verbatim and the seal is taken over it, so a label mixed into it changes the sealed bytes and
stops the record matching the run it describes.

**The spec-level boundary records a seal of its own, and the spec completion conditions recompute
it.** That boundary has no row, so gate item 12 never runs for it: the seal defined here was
per-item only, and the full-suite result on a terminal ledger could still be edited from FAIL to
PASS afterwards with no revision, no `Audited evidence hash` and no pack seal moving. Take it the
same way — the audit hash over the spec-level `Checkpoint verification command`,
`Checkpoint verification result` and any `## Shared-artifact re-verify` block this boundary wrote
(_Repairing a per-spec FAIL_), together with a `Checkpoint verification revision` of its own,
recorded beside them. That boundary has no row, so there is no round block to take a `Revision`
from even in principle; the address is the one this spec-level run was made against and nothing
else. Record the seal beside them as `Checkpoint verification seal`, and recompute it before
spec-level completion is
declared. A mismatch means the record was edited after the run, and completion is not declared.
**Those four inputs are the whole subject, and the recomputation takes the same four.** The spec
completion conditions in `SKILL.md` name them from the completion side and this list is the same
one: a recomputation over the command, the result and the revision alone can never match a seal
taken over a block as well, so a spec that used the repair path would be uncompletable by
construction. Where no repair ran, the boundary wrote no block and the subject is the other three.

**Both seals — per item and per spec — are recorded when the run ends and recomputed at the gate**,
and `evidence-revision.md` says once, for every seal in this contract, what that catches and what
it does not: drift between those two moments, which is what happens; not an author rewriting the
pair and the seal together, which nothing recorded in the repository can catch.

These are per-item fields of the same contract gate item 10
resolves, so writing them to the implement file for a row anchored at the ATDD one splits that row
across two files and leaves the one the gate reads incomplete. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
