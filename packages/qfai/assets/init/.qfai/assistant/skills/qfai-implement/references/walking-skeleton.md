# Phase: Skeleton (Walking Skeleton)

The one phase of `/qfai-implement` whose exit criterion is that the product
**runs**. It executes once per **declared entrypoint**, ahead of the first
`Phase: Red`.

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
Record `Skeleton: not applicable` with the reason in the skeleton evidence file
(`#evidence`) and continue. **The verdict is written; the phase is never skipped
silently.** An unrecorded skip is indistinguishable from the failure this phase
exists to catch.

The verdict is not a judgement call about effort. If any row in the ledger
carries `Layer = E2E` or `Layer = API`, an entrypoint is declared by
construction and the phase applies.

## The unit is one entrypoint, not one project

The phase runs once per **declared entrypoint that has no recorded pass**, not
once per project. `catalog/structure.md#key-packages--entrypoints` may record
several packages and several `CLI / service entry` lines, and a project whose
first spec proved the API server has proved nothing about its worker.

So: enumerate the entrypoints `catalog/structure.md` declares and that the
in-scope specs reach, and run the phase for each one that the evidence file has
no passing record for. A queued spec that shares an entrypoint already proven
does not repeat it (`../SKILL.md` Completion step 4); a queued spec that reaches
a **different** entrypoint runs the phase for that one before its first row.

## Exit criterion

> The system starts from a declared entrypoint and one declared `US-*` is answered over the **real transport that entrypoint declares** — a socket for a service, stdio for a CLI, the queue for a worker — proven by a committed smoke script that exits non-zero otherwise.

Executable, not prose. "The skeleton is in place" is not an exit criterion; the
script's exit status is.

The transport clause is what the entrypoint declares, not a socket in every
case: a CLI that opens no socket satisfies the criterion over stdio, and a
worker over its queue. Requiring a socket of them would leave a correct CLI
unable to exit the phase with a passing smoke script.

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
3. **Exercises one declared `US-*` over the real transport the entrypoint
   speaks** — a socket for a service, stdio for a CLI, the queue for a worker.
4. **Exits non-zero on any failure**, including a start-up timeout. A script
   that reports a failure on stdout and exits 0 proves nothing.
5. **Names the `US-*` it answers**, so the phase's evidence points at an
   obligation rather than at "it booted".
6. **Stops what it started, on every exit path** — success, failure and
   timeout alike, via `trap` / `finally` or the runtime's equivalent, and the
   script asserts before it returns that no child it launched is still running.
   A script that starts a server in the background and leaves it there breaks
   the next cycle with `EADDRINUSE`, or worse, answers the next cycle's smoke
   request from the **stale** process and reports a start that never happened —
   which makes both the 3-cycle judgement and every test run after it
   unreliable. A script that cannot own the process it starts (an externally
   managed container, a shared queue broker) records that in
   `Skeleton command` and leaves the teardown to the declared command instead
   of skipping it.

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

Every shortcut the skeleton takes is written back **in the same commit** as the
skeleton: the stub predicate, the in-memory store standing in for persistence,
the hard-coded identity. One entry per independently observable boundary, per
`selector-granularity.md`.

**Written back through the ledger's owner, not into the ledger.** A `todo`
**row** is upstream SSOT: this skill's carve-out is the `Status` / `DR-ID` /
`Evidence` cells of rows that already exist, and "adding, removing or
re-scoping a row is an upstream change"
(`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`). So the
debt is discharged in two writes this skill _is_ allowed to make, both in the
skeleton's commit:

1. the enumerated shortcuts in `Skeleton debt` (`#evidence`), one line per
   boundary, each naming the obligation the missing row would carry; and
2. a Change Request at `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md` per
   `constitution/drift-protocol.md#when-drift-is-detected`, listing exactly
   those rows for `/qfai-sdd` to add.

Adding the rows here instead would be a Drift Protocol violation, and skipping
them would be Bound 1 reached by omission — hence the CR, which is the one route
that is neither.

The halt that CR carries is the scoped one drift-protocol step 1 defines: it
blocks the items that depend on the obligations under revision, which for
new rows is nothing yet in the ledger. **The rest of `Phase: Red` continues** —
this Change Request is not a stop-the-world.

The skeleton may be shallow; **it may not be invisible to the ledger.** A
skeleton whose debt is neither recorded nor requested is a set of predicates
that no row owns.

Rows `/qfai-sdd` adds from that CR are ordinary `todo` rows. They carry no
special status and are selected by `Phase: Red` in the normal order.

## Cycle budget — 3, then halt and classify

The phase gets **3 cycles**. A cycle is one attempt at the exit criterion:
change the skeleton, run the smoke script, read the exit status.

On the third failure, **halt** — record the halt in `Skeleton result` and
**classify the failure before raising anything**. Do not continue to
`Phase: Red`.

| Failure class                                                                                                   | What it is                                                           | What to do                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment** — port already bound, missing dependency, wrong runtime version, absent credential              | the machine, not any artifact                                        | repair it, record the cause and the repair in `Skeleton result`, and report to the operator if it survives the repair. No Change Request. |
| **Code** — syntax error, wiring mistake, the entrypoint the skeleton itself just wrote                          | the skeleton's own work, which this phase owns                       | fix it inside the phase. No Change Request.                                                                                               |
| **Steering** — `catalog/tech.md` or `catalog/structure.md` names a start command or a path that is wrong        | stale steering, which Stage 0 already owns the refresh of            | refresh the steering file per Stage 0 and re-run. No Change Request.                                                                      |
| **Upstream** — the declared entrypoint does not exist in the spec set, or the contract cannot start as declared | drift: an upstream artifact contradicts itself or the running system | **this** is the Change Request, per `constitution/drift-protocol.md#when-drift-is-detected`, with its drift class and its reproduction.   |

Only the last row produces a Change Request. A CR needs an upstream artifact to
change, a drift class and an owner rerun; a port conflict supplies none of
those, and an unapprovable CR left open blocks completion for as long as it
sits there. Once such a CR is approved, its reset is applied by
`change-request-reset.md` like any other.

The halt itself is not conditional on the class: the phase stops either way and
`Phase: Red` does not start. This is deliberately the opposite of the row-level
policy, which refines and retries. If the product cannot be made to start,
refining rows is the exact failure this phase exists to prevent: every row
refined against a system that does not run is work whose value cannot be
observed.

## Evidence

The record is **project-level and lives at `.qfai/evidence/skeleton.md`** — not
in the ledger's `Evidence` cell, which is a pointer from an existing row to that
row's own proof (`execution-ledger.md#evidence-cell-contract`) and which this
phase has no row to hang off, since it runs before the first row is selected.
`.qfai/evidence/**` is append/update for this skill under
`constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`.

One `## <entrypoint>` section per declared entrypoint, written before the first
row is selected, each carrying:

| Field                 | Content                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `Skeleton verdict`    | `applicable` or `not applicable` plus the reason                  |
| `Skeleton entrypoint` | the declared entrypoint, as a command                             |
| `Skeleton US`         | the `US-*` the smoke script answers                               |
| `Skeleton command`    | the smoke-script invocation, verbatim                             |
| `Skeleton result`     | its output and **exit status**, verbatim                          |
| `Skeleton debt`       | the shortcuts enumerated, and the `CR-*` raised to add their rows |
| `Skeleton cycles`     | cycles used, of 3                                                 |

`Skeleton result` follows the same rule as every other gate result in this
skill: the command and its real output, never a prose verdict
(`../SKILL.md#evidence-hard-rules`). A `Skeleton verdict` of `not applicable`
leaves the remaining fields empty and needs no smoke script.

**On every later invocation, read this file first.** An entrypoint with a
section whose `Skeleton result` records exit status 0 is already proven: re-run
its `Skeleton command`, append the new run under that section, and continue. An
entrypoint with no section — or one whose recorded result is non-zero — runs the
phase. That read is what makes "once per entrypoint" checkable across
invocations instead of a memory of what a previous session did.

## Reached from `/qfai-atdd`

Stage 5 (`/qfai-atdd`) runs before this skill (`constitution/workflow.md`
stages), and its P6 runtime-evidence gate needs the same running program this
phase produces. On a fresh project there is no entrypoint yet and no ledger row
to hand over — `red-provenance.md#a-spec-with-no-atdd-owned-rows` says zero
`E2E` / `API` rows is legitimate — so that stage would fail at P5-P7 before this
phase was ever reached.

It therefore invokes `/qfai-implement` for **this phase alone**, exactly as it
already invokes `Phase: Red` step 3a for a seam alone: build the skeleton,
record the evidence, return. No row is selected, no row's status is written, and
the invocation does not continue to `Phase: Red`. The later full invocation
reads `.qfai/evidence/skeleton.md`, finds the entrypoint proven, re-runs the
recorded command and moves on.
