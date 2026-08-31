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

   **It can still run none of the row's own tests, so exit 0 is not the whole of it here either.**
   "More than the row, never less" holds for the _file_, not for the row: when several rows share a
   test file and this row's tests have been deleted or renamed, the run executes the siblings',
   exits 0, and nothing has observed that the row's own test is gone. The full suite in step 2
   passes for the same reason, and step 4 does not catch it — `TDDLIST_SELECTOR_UNRESOLVED` is a
   `warning`, so `--fail-on error` lets it through by design. Every gate in the set would report
   success on a row whose test does not exist.

   So run the file-scoped command with the same visible-output option a narrowed run uses (see
   **The option that makes the run visible**) and check the recorded output names **every**
   `Selector` entry among the tests it ran. That costs one flag and no escaping, because the entry
   is being read out of the output rather than passed into a matcher. If the runner cannot name the
   tests it ran, the file-scoped form cannot establish this at all — the selected/run count is no
   help, since the siblings supply it — so narrow per entry instead and accept the escaping rules
   below. Recording a `Selector` entry that the output never named is the FAIL, not a formality.

   **If you do narrow**, escape the selector for your runner's matcher, record the literal command,
   and check that the run actually selected something: `passed >= 1` for a GREEN, `failed >= 1` for a
   RED. A skipped count is not a pass. The name goes through the runner's own name flag — `-t` for
   vitest and jest, `-run` for `go test` — except in pytest, which selects by node ID positionally
   because its `-k` is an expression rather than a literal (see **pytest selects by node ID** below)
   — and two further decisions come with narrowing, both made from the ledger row:

   **One command per `Selector` entry.** A `Selector` may legally hold several entries — a JSON
   array of names, or a glob, for one boundary observed from several angles. **How many entries a
   cell holds is decided by `selector-granularity.md#entry-form`, and by nothing else**: a cell that
   parses as a JSON array holds one entry per element, and every other cell is a single entry,
   whatever punctuation it carries. **Do not split on commas** — a comma is legal inside one
   vitest/jest name (`falls back to the built-in set, and labels it, when the file is absent` is one
   name), so a comma split builds several commands that each match nothing and each exit 0. Those
   name options take a substring, an expression or a regex; none of them takes a list, and none of
   them takes a shell glob. Interpolating a whole multi-entry cell into one name option therefore
   matches nothing and **exits 0**: `vitest run <Test file> -t '["a","b"]'` skips every test in the
   file and reports success, so the checkpoint passes without having run any of the row's tests —
   the same silent success the file-scoped default above exists to rule out.
   This is the same rule Phase Red applies to a RED observation, for the same reason.
   So **emit one command per entry**, run all of them, and record every one of them in
   `Checkpoint verification command`. A glob entry is translated into the runner's own name language
   rather than passed literally, and **only where that language can anchor the prefix**: `go test`
   takes an RE2 regex, so `test_rejects_expired_token_*` is `-run '^test_rejects_expired_token_'`;
   vitest and jest match a regex against the full test name, so `-t '^test_rejects_expired_token_'`,
   which holds only while the entry names a top-level test — under a `describe` the name the pattern
   sees starts with the `describe` title, so the anchor no longer matches. pytest's `-k` is a
   substring expression with no anchor and therefore has **no** exact translation:
   `-k 'test_rejects_expired_token_'` also collects `test_other_test_rejects_expired_token_shadow`,
   passing the checkpoint on a test the row never named. Wherever no exact translation exists —
   pytest, and any nested vitest/jest name — enumerate the test names the glob covers and emit one
   command per name.

   **The entry is an argument, not a fragment of a command line.** Pass it as one argv element.
   A `Selector` may hold any character a test name may hold, and this repo's own suite has names
   carrying an apostrophe (`this row's CLI_SUBCOMMANDS mirror …`), so pasting an entry between
   single quotes — `-k 'this row's …'` — ends the quote early and the shell reports
   an `unexpected EOF` for the quote it never closed: a legitimate checkpoint that cannot be run at
   all. A value like `safe'; rm -rf .; #` would run as a second command instead. Build the argv
   directly where you can. If a shell line is unavoidable, escape the entry for it — single-quote it
   and rewrite each embedded `'` as `'\''` — and record the escaped line verbatim. This is
   separate from, and additional to, escaping the entry for the runner's own matcher: the shell and
   the regex are two layers, and getting one right does not settle the other.

   **pytest selects by node ID, not by `-k`.** `-k` takes a _substring expression_ that pytest
   evaluates — `pytest --help` calls it an expression, and it reads `and`, `or`, `not`, parentheses
   and brackets as grammar rather than as characters. So a name is not a legal `-k` value in
   general: a parametrised test whose ID is `test_value[one, and only]` fails
   `pytest … -k 'test_value[one, and only]'` with `Wrong expression passed to '-k'` and **exit 4** —
   not a test failure, and not something shell escaping fixes, because the string reaches the
   expression parser intact. Select by the node ID positionally instead, which takes the name
   literally:

   ```bash
   pytest --collect-only -q '<Test file>'          # find the node ID for the entry
   pytest '<Test file>::<node id>' --verbosity=1   # run exactly it
   ```

   Use `-k` only for a glob entry pytest can express, and even then only per the anchor rule above.
   Runners whose name option is a regex (`-t`, `-run`) keep taking the escaped-for-regex entry; it
   is pytest's expression grammar specifically that a name cannot be interpolated into.

   **The option that makes the run visible.** A narrowed step 1 is judged on its recorded output,
   not its exit code (see Pass criteria), so each command has to print the name of every test it
   ran. Most runners suppress that by default: `pytest -k '<entry>'` prints `test_sample.py . [100%]`
   and `go test -run '^<entry>$'` prints `ok example.com/pkg` — neither names a test, so a run that
   selected the row's test would be indistinguishable from one that selected nothing, and every
   checkpoint would FAIL. Add the runner's own option, and pick **one that sets the level, never one
   that shifts it**: pytest defines `-v` as "Increase verbosity" and `-q` as "Decrease verbosity",
   so on a project carrying `addopts = -q` in `pytest.ini` or `PYTEST_ADDOPTS` a `-v` only cancels
   the `-q` and lands back on the nameless default — the run exits 0, prints
   `test_sample.py . [100%]`, and FAILs the criterion the option was added to satisfy. Pass
   `--verbosity=1` instead: it sets the level outright, so it does not depend on what the project
   configured. `go test -v` ("log all tests as they are run"), vitest's `--reporter=verbose` and
   jest's `--verbose` are already absolute — a boolean or a named reporter, not a counter — so they
   need no equivalent. A narrowed command then reads `pytest '<Test file>::<node id>' --verbosity=1`
   or `go test ./<dir of Test file> -v -run '^<entry>$'`. If a runner has no such option, record
   instead the runner-specific count of tests it reports as selected or run, and treat a count of
   zero as the FAIL that a nameless exit 0 would otherwise hide.

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
reports zero `QFAI-TEST-001` findings. **Step 1 is not settled by its exit code, in either form.**
File-scoped it cannot select nothing, but it can select only the _other_ rows sharing the file, so
its output must name every `Selector` entry of the row being checkpointed; **narrowed**, each of its
per-entry runs passes only when the recorded output names that entry as having run — the same thing
`qa-gatekeeper` demands of a GREEN ("A full-suite pass that does not name the row's selector is not
a GREEN for that row"). A narrowed run that selected zero tests exits 0 and satisfies nothing, so an exit 0
whose output names no test is a FAIL. That output is what **The option that makes the run visible**
buys: without the runner's verbose option a passing run prints no name either, so read this criterion
against a command that carries it (or against the selected/run count that rule falls back to), never
against a default-quiet one. Any non-zero exit is a FAIL: for a per-item checkpoint the
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
