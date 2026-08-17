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
4. `npx qfai validate --profile tdd --fail-on error` — qfai is a project dependency, not a global
   command; a bare `qfai …` is `command not found` (exit 127) on a normal local install, which would
   fail every checkpoint.

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
3. The aggregate does not worsen: no severity count is higher than the baseline's.
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
`.qfai/evidence/implement-<spec-id>.md` for spec-level `Checkpoint verification command` /
`Checkpoint verification result` entries covering the current ledger state. Run the **per spec**
command set above and record them when they are absent, or when they predate the last ledger
change. Only then report "nothing to do".

## Evidence

Record the result in `.qfai/evidence/implement-<spec-id>.md` using the two per-item evidence fields
`Checkpoint verification command` and `Checkpoint verification result`. As with RED/GREEN evidence,
a status without its command is invalid, and evidence from a previous checkpoint MUST NOT be reused.
