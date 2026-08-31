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

**A row between boundaries records the same three fields.** They are unconditional — gate item 12
recomputes the seal on every row — so a row off a boundary cannot leave them empty and cannot
invent a full-suite command it never ran. Nothing is re-run there, so
`Checkpoint verification command` takes the narrow relevant-suite command set of Phase: Refactor
step 2 verbatim, `Checkpoint verification result` takes that run's outcome, and the seal is taken
over the two together with the `Revision` exactly as at a boundary. Item 12 accepts that pair: it
requires the **full** suite only for a row that sits on a boundary. Label the entry with the
resolution step used (`relevant-test-suite.md`) so the reviewer can tell a narrow off-boundary
record from a truncated boundary one.

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
