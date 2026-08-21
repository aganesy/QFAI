# Phase: Skeleton (Walking Skeleton)

The one phase of `/qfai-implement` whose exit criterion is that the product
**runs**. It executes once per project, ahead of the first `Phase: Red`.

## Why the phase exists

Without it the supported path from a finished spec to running software is "open
`test-list.md`, take row 1, proceed one row at a time", and nothing ever asks
whether the assembled parts start. A ledger can then carry hundreds of `done`
rows and a fully green suite while no entrypoint exists at all, because every
one of those tests constructs its subject directly.

The `Layer = E2E` and `Layer = API` rows are where that bill arrives. A test
written against a system that cannot start produces a collection error, and
`red-admissibility.md` correctly rules a collection error a **missing seam**
rather than a RED. So those rows cannot be started, and the framework is right
to say so — the seam they are missing is the program itself.

**This phase is a precondition of the existing RED rule, not a relaxation of
it.** Against a running skeleton, `404 where the row asserts 200` is an
assertion failure inside the row's own `Selector`, which is admissible under the
unchanged criterion. Nothing in `red-admissibility.md` moves.

Distinct from stage 4 of `constitution/workflow.md` ("Prototyping (optional):
contract-aligned implementation skeleton"): that stage is optional, belongs to
another skill, and is not a precondition of stage 6. This phase is neither
optional nor deferrable.

## Applicability

The phase applies whenever the spec set declares a **runnable entrypoint** — a
service, CLI, worker or app through which a `US-*` is answered.

It does not apply to a library or another artifact that is only ever imported.
Record `Skeleton: not applicable` with the reason in the ledger evidence and
continue. **The verdict is written; the phase is never skipped silently.** An
unrecorded skip is indistinguishable from the failure this phase exists to
catch.

The verdict is not a judgement call about effort. If any row in the ledger
carries `Layer = E2E` or `Layer = API`, an entrypoint is declared by
construction and the phase applies.

## Exit criterion

> The system starts from a declared entrypoint and one declared `US-*` is answered over a **real socket**, proven by a committed smoke script that exits non-zero otherwise.

Executable, not prose. "The skeleton is in place" is not an exit criterion; the
script's exit status is.

An already-passing smoke script satisfies the phase. Run it, record the run,
continue — do not rebuild what already starts.

## The smoke-script contract

1. **Committed**, at the path `catalog/structure.md` gives for project scripts,
   and invocable by a single command taken from
   `catalog/tech.md#standard-commands-copy-paste`.
2. **Starts the system the way the entrypoint declares it** — the same command a
   user or a deployment would run, not a test harness that constructs the
   application object in-process. Constructing it in-process is exactly the
   evasion the 577-green-tests-and-no-entrypoint case was made of.
3. **Exercises one declared `US-*` over a real socket** (or the real transport
   the entrypoint speaks: stdio for a CLI, the queue for a worker).
4. **Exits non-zero on any failure**, including a start-up timeout. A script
   that reports a failure on stdout and exits 0 proves nothing.
5. **Names the `US-*` it answers**, so the phase's evidence points at an
   obligation rather than at "it booted".

## Bound 1 — no predicates (blocking)

Nothing in this phase may author:

- an authorization decision,
- a business rule,
- a calculation,
- a persistence invariant.

Routes return constants or pass-throughs. **A predicate authored in this phase
is a blocking finding** — it belongs to a row, and writing it here bypasses that
row's RED.

The bound is what keeps the phase from becoming a TDD bypass. It is the same
rule `red-admissibility.md#step-3a-create-the-seam-first` applies to a per-row
seam, at the scale of the whole program: the skeleton makes the surface
reachable and implements no behaviour behind it.

Registering a route with a status the ledger does not contract for (`501`, or
`200` where a row owns `201`) keeps the surface reachable **and** keeps every
row's RED available. Prefer that over a handler that already returns the status
some row owns.

## Bound 2 — seam debt is written back (blocking)

Every shortcut the skeleton takes is written back as a `todo` row in
`test-list.md` **in the same commit** as the skeleton: the stub predicate, the
in-memory store standing in for persistence, the hard-coded identity. One row
per independently observable boundary, per `selector-granularity.md`.

The skeleton may be shallow; **it may not be invisible to the ledger.** A
skeleton whose debt is unrecorded is a set of predicates that no row owns, which
is Bound 1 reached by omission instead of by commission.

Rows written back here are ordinary `todo` rows. They carry no special status
and are selected by `Phase: Red` in the normal order.

## Cycle budget — 3, then halt

The phase gets **3 cycles**. A cycle is one attempt at the exit criterion:
change the skeleton, run the smoke script, read the exit status.

On the third failure, **halt and raise a Change Request** per
`change-request-reset.md`. Do not continue to `Phase: Red`.

This is deliberately the opposite of the row-level policy, which refines and
retries. If the product cannot be made to start, refining rows is the exact
failure this phase exists to prevent: every row refined against a system that
does not run is work whose value cannot be observed.

## Evidence

Record in the ledger evidence for this spec, before the first row is selected:

| Field                 | Content                                                      |
| --------------------- | ------------------------------------------------------------ |
| `Skeleton verdict`    | `applicable` or `not applicable` plus the reason             |
| `Skeleton entrypoint` | the declared entrypoint, as a command                        |
| `Skeleton US`         | the `US-*` the smoke script answers                          |
| `Skeleton command`    | the smoke-script invocation, verbatim                        |
| `Skeleton result`     | its output and **exit status**, verbatim                     |
| `Skeleton debt`       | the `TDD-ID`s written back as `todo` rows in the same commit |
| `Skeleton cycles`     | cycles used, of 3                                            |

`Skeleton result` follows the same rule as every other gate result in this
skill: the command and its real output, never a prose verdict
(`../SKILL.md#evidence-hard-rules`). A `Skeleton verdict` of `not applicable`
leaves the remaining fields empty and needs no smoke script.
