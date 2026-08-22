# Checkpoint Verification

"Checkpoint verification" is the whole-repository regression check run at a checkpoint boundary. It
is what item 12 of the 12-point gate refers to and the only thing it refers to.

## Checkpoint boundary

A checkpoint boundary is reached in exactly two places:

- **Per item** — after all routed blocking reviewers have returned PASS for the item and before it
  transitions `refactor` -> `done`. Every item has exactly one.
- **Per spec** — after the last item in `test-list.md` reaches `done` or a valid `exception`, before
  declaring spec-level completion.

No other point is a checkpoint boundary. There is no "every N items" rule.

The two do **not** run the same commands. The per-item set is confined to what the item's own
change can reach; the spec-wide commands belong to the per-spec set. Both are below, and each one
is the whole of the applicable set at its own boundary.

## Verification command set (per item)

Run all of the following from the repository root, in order. Substitute the project's own runner for
the placeholders; record the literal commands actually executed in evidence.

1. The item's own test — the ledger's `Test file` **plus** the runner's test-name option applied to
   the ledger's `Selector`. Two runner-specific decisions, and both must be made from the ledger row:

   **a. The name option.** The `Selector` is a test NAME, and every common runner takes a name
   through a flag, not a positional argument: a positional is a file filter. Vitest and Jest use
   `-t`, pytest uses `-k`, `go test` uses `-run`. Passing the selector positionally
   (`<test runner> '<Selector>'`) exits 1 with "No test files found", so the checkpoint would fail
   on every item and none could leave `refactor`.

   **b. The unit of selection.** What goes in front of the name option is whatever the runner
   selects by, which is not always a file:
   - **File-selecting runners** (vitest, jest, pytest) take the `Test file` itself:

     ```bash
     <test runner> <Test file> -t '<Selector>'
     ```

   - **Package-selecting runners** (`go test`) take a package. `go help test` documents the usage
     as `go test [build/test flags] [packages] [build/test flags & test binary flags]`, and it
     compiles the package's sources together with the matching `*_test.go` files. Handing it a lone
     file switches it into file mode and drops the rest of the package from the build, so the item's
     test normally fails on undefined symbols. Derive the package from the `Test file`'s directory:

     ```bash
     go test ./<dir of Test file> -run '<Selector>'
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
   check.
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
the per-spec set, the only one that includes it — step 4 reports zero `QFAI-TEST-001` findings.
A step outside the applicable set is not owed, and its absence is not a partial run. Any non-zero
exit is a FAIL: for a per-item checkpoint the item stays at `refactor`, the failure is fixed, and
the whole set is re-run. A partial run of the applicable set is not a pass.

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
failure would have no legal repair path at all.

**A per-spec FAIL is not a ledger event.** Fix it in place and leave every `Status` where it is: no
row's obligation moved, its test asserts what it always asserted and still passes, so no TDD cycle
restarts and no reset is owed. What _is_ owed is the affected rows' **per-item evidence**. The fix
moves the tree, so every observation those rows took against the old `Revision` — the GREEN of gate
item 5, the reviewer verdicts of items 7-9, the per-item checkpoint of item 12 — now describes a
tree that no longer exists, which `evidence-revision.md#what-makes-evidence-stale` calls stale.
Re-taking the verdicts alone would leave items 5 and 12 pinned to the old revision and item 10's
same-`Revision` requirement unsatisfiable, on rows that are `done` and therefore skipped by the item
loop: the repair would strand exactly the evidence it invalidated.

**Re-verify each affected row in place.** For every row whose production code or test the fix
touched, re-take at the new `Revision`, in this order:

- **First, the row's own test** — the per-item step 1 command, plus the GREEN re-observed by
  `qa-gatekeeper` with the `Oracle proof` item 5 requires and the post-refactor re-confirmation of
  item 6.
- **Then a fresh verdict from every _required_ reviewer whose scope the fix touches.** "Required" is
  wider than `blocking_agents`, exactly as it is at the 12-point gate: `implementation-reviewer` and
  `completion-reviewer` always, and `product-surface-reviewer` on a UI-affecting row, which
  `agent-routing.yml` lists only under `conditional_agents` while item 9 still requires its
  prototype parity PASS. A repair that changes display logic to satisfy a linter or the type checker
  is that case, and re-running the blocking list alone would carry the pre-fix surface verdict onto
  a display it never saw.
- **Last, the row's `Checkpoint verification command` / `result` / `seal`**, re-recorded from a
  re-run of the **per-item** set, so item 12's seal is taken over the revision the row actually
  landed at.

Append all of it as a fresh evidence entry under the new `Revision`; nothing from the pre-fix
revision is reused. Item 3 is not re-taken — it names its own `RED revision`, judged against the
tree the RED was observed on. This is a re-observation, not a re-execution: the row never leaves
`done`, the `done`-row skip in `SKILL.md` governs the item loop and does not reach a boundary-owned
re-observation, and no `Status` moves. Only once every affected row is re-verified do you re-run the
**whole** per-spec set. Spec-level completion is declared from that re-run, never from the failed
one.

**A test edit alone is not a Change Request.** A formatter rewrap, an unused import, a type
annotation or a rename inside a `done` row's test file changes the file without changing what the
test asserts, so the obligation is exactly where it was and the re-verification above — whose step 1
re-runs that very test — is the whole of what is owed. Routing it to the approved reset instead
would demand a CR that `change-request-reset.md` cannot legitimately issue: that reset exists for an
approved **upstream** change invalidating rows, and here nothing upstream moved, so the row would be
left holding a static gate it may not clear.

Two findings do leave the in-place path. When the fix cannot be made without changing **what the
row's test asserts** — its predicate, its expected value, the obligation behind it — the obligation
itself moved: that is a Change Request, and the row re-enters through the approved reset
(`change-request-reset.md`), which is the legal reopen precisely because something upstream changed.
When the finding has no spec owner — the `.qfai/contracts/**` and un-owned `QFAI-TRACE-*` findings
step 4 describes — it is not repaired from here at all: record it with its owning artifact as step 4
requires, and the boundary stays unpassed until its owner clears it.

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
command set above and record them when they are absent, or when they predate the last ledger
change. Only then report "nothing to do".

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
`Checkpoint verification result` and `Checkpoint verification seal`. The seal is the audit hash over
the first two together with the `Revision` this run was made against, taken the moment the run ends
and recomputed at gate item 12: these fields are appended after every reviewer has hashed, so they
sit in no audit subject, and the revision that would otherwise cover them excludes
`.qfai/evidence/**`. Without it a recorded FAIL could be edited to PASS on a `done` row and no hash
anywhere would move.

**The spec-level boundary records a seal of its own, and the spec completion conditions recompute
it.** That boundary has no row, so gate item 12 never runs for it: the seal defined here was
per-item only, and the full-suite result on a terminal ledger could still be edited from FAIL to
PASS afterwards with no revision, no `Audited evidence hash` and no pack seal moving. Take it the
same way — the audit hash over the spec-level `Checkpoint verification command` and
`Checkpoint verification result` together with the `Revision` that run was made against — record it
beside them as `Checkpoint verification seal`, and recompute it before spec-level completion is
declared. A mismatch means the record was edited after the run, and completion is not declared.

**Both seals — per item and per spec — are recorded when the run ends and recomputed at the gate**,
and `evidence-revision.md` says once, for every seal in this contract, what that catches and what
it does not: drift between those two moments, which is what happens; not an author rewriting the
pair and the seal together, which nothing recorded in the repository can catch.

These are per-item fields of the same contract gate item 10
resolves, so writing them to the implement file for a row anchored at the ATDD one splits that row
across two files and leaves the one the gate reads incomplete. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
