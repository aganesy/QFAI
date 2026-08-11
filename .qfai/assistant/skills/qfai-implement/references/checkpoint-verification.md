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

## Verification command set (per spec)

The spec-level boundary has no "item just completed" — a re-run in a later session has none, and
under parallel slices the ledger order does not identify one either. So step 1 is dropped: the
spec-level set is steps 2, 3 and 4 only. Everything step 1 would have proved is already covered by
the full suite.

## Pass criteria

Checkpoint verification PASSES only when **every** command in the applicable set exits 0, and step 4
reports zero `QFAI-TEST-001` findings. Any non-zero exit is a FAIL: for a per-item checkpoint the
item stays at `refactor`, the failure is fixed, and the whole set is re-run. A partial run is not a
pass.

**A fix invalidates the reviewer PASS that preceded it.** The per-item boundary sits after
`completion-reviewer` and `implementation-reviewer` returned PASS (Phase: Refactor, steps 4-5), so
those verdicts were given against the pre-fix test and production code. Whenever the fix changes
either, re-submit to every routed blocking reviewer the change could affect — always the ones whose
scope it touches — and obtain a fresh PASS **before** re-running the command set. Re-running the
commands alone would let an item reach `done` carrying code no reviewer ever saw, which the
skill's own stale-evidence rule forbids. A fix that changes nothing a reviewer judged — re-running
after a flaky external service, say — needs no re-review; record which case applied.

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

The seal input is canonical and machine-recomputable: the exact three lines
`Revision: <value>`, `Checkpoint verification command: <value>`, and
`Checkpoint verification result: <value>`, in that order. Normalize them to LF, strip trailing
whitespace from each line, remove leading/trailing blank lines, add one final newline, then record the
lowercase SHA-256 of those bytes. Do not wrap this field-only seal in a file-path manifest record.

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
