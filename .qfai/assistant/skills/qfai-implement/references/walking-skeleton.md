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
it.** Once the route the row exercises is **registered** — which is part of what
this phase supplies — `404 where the row asserts 200` is an assertion failure
inside the row's own `Selector`, and admissible under the unchanged criterion. A
404 from a route that is registered nowhere is the other thing: a missing seam,
which `red-admissibility.md` refuses as a RED and this phase exists to supply
before one is taken. Nothing in that reference moves.

Distinct from stage 4 of `.qfai/assistant/constitution/workflow.md` ("Prototyping (optional):
contract-aligned implementation skeleton"): that stage is optional, belongs to
another skill, and is not a precondition of stage 6. This phase is neither
optional nor deferrable.

## Applicability

The phase applies whenever the spec set declares a **runnable entrypoint** — a
service, CLI, worker or app through which a **boot obligation** is answered. The
boot obligation is a `US-*`, or on an API entrypoint a `CON-API-*`. Both spellings
are named here because a contract-only API declares no `US-*`, and reading the
condition as `US-*` alone would make the phase not applicable for an entrypoint
the exit criterion and the `Layer = API` rule below both cover.

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
no passing record for. **The enumeration spans the whole queue, in this one
pass**: `plan` frames the invocation over every confirmed spec, so the
entrypoints of every queued spec are known here and are proven here. A queued
spec that shares an entrypoint already proven does not repeat it
(`volume-policy.md#advancing-the-queue`); one that reaches a **different**
entrypoint has that entrypoint proven in this same pass, ahead of its first
row. Nothing re-enters this phase at a queue transition, which is what
`plan-phase.md` states from the other side — and proving an entrypoint starts
puts no spec in flight, so covering the queue here does not begin work on a
spec the queue has not reached.

## Exit criterion

> The system starts from a declared entrypoint and the surface one declared **boot obligation** names is **reached** over the **real transport that entrypoint declares** — a socket for a service, stdio for a CLI, the queue for a worker — proven by a committed smoke script that exits non-zero otherwise.

Executable, not prose. "The skeleton is in place" is not an exit criterion; the
script's exit status is.

**The boot obligation is a `US-*`, or a `CON-API-*` on an API entrypoint.**
A contract-only target declares no user story: `catalog/test-layers.md` gives
the `API` layer its obligations as `CON-API-*`, and a correct project whose
in-scope rows are all `Layer = API` has none of the former to name. Requiring a
`US-*` there left the smoke script with no surface to reach and stopped the
project at P1a with nothing it could legally write. Either kind names a surface,
which is all this phase asks of it; pick the one the entrypoint actually serves,
and prefer a `US-*` where the target declares both.

**Reached, not satisfied — this is a boot obligation.** The entrypoint starts,
the request the obligation names arrives at the surface it names, and the
started process answers it — **with whatever that surface already returns**. That is the
whole criterion. Nothing here asserts the `US-*`'s outcome, and nothing here
prescribes one either.

The non-contracted sentinel of Bound 1 (`501`, or any status no row owns) is
therefore the **permitted answer of a seam this phase newly authors** — Bound 1
leaves such a seam nothing else to return — and never a response the smoke
script requires. Where the entrypoint already answers that surface, because the
project is an existing application or an earlier spec finished the `US-*`, its
real `200` / `201` and its real payload exit the phase as they stand. Demanding
the sentinel there would make passing the phase conditional on regressing a
working handler to `501`, which contradicts smoke contract 3 (the script does
not inspect the outcome) and "do not rebuild what already starts" below.

Requiring the outcome would make this criterion and Bound 1 unsatisfiable
together on every project whose `US-*` set is authorization, calculation or
persistence — which is most of them. A sentinel leaves such a `US-*` unanswered
and the smoke script red; a constant shaped like the expected result implements
that `US-*` ahead of its row and is a blocking finding. The phase would have no
legal exit. So the script asserts reachability only — process started, transport
spoke, an answer came back — and asserts nothing about correctness. The
correctness of that `US-*` belongs to the row that owns it, and is taken there
as an ordinary RED.

The transport clause is what the entrypoint declares, not a socket in every
case: a CLI that opens no socket satisfies the criterion over stdio, and a
worker over its queue. Requiring a socket of them would leave a correct CLI
unable to exit the phase with a passing smoke script.

**`npx qfai init --force` adds the route.** The phase is dispatched through
`manifest/agent-routing.yml`'s `skeleton` entry. `--force` regenerates
`assistant/skills/**` and `assistant/agents/**` and never overwrites
`manifest/**` — that taxonomy is the project's, and `qfai-configure` is its
supported editor — but it does merge the phases the regenerated skills name
into the routing table, adding only and editing nothing. So an installation
that predates this phase receives both this document and a `skeleton` entry to
dispatch it through: `iteration: per-invocation`, `qa-gatekeeper` mandatory and
blocking, the engineer roles conditional. Without that merge the project would
hold a mandatory phase with no role dispatched to write the entrypoint or the
smoke script. Adjust the entry afterwards through `qfai-configure`; a project
that never runs `--force` adds it there the same way.

**`qa-gatekeeper` judges the exit, not the author.** Whenever the verdict is
`applicable`, the phase's routing entry (`manifest/agent-routing.yml`, phase
`skeleton`) lists the gatekeeper **mandatory** and blocking, and its `PASS` on
the recorded run is required before `Phase: Red` starts — recorded in
`Skeleton gatekeeper` (`#evidence`). Mandatory rather than conditional, because
a blocking list only stops the REVISE of an agent the orchestrator already
chose: a gatekeeper left unrouted leaves the phase passing on its author's own
account of the smoke run, which is the self-attestation the `red` gate exists to
prevent.
`not applicable` is the one verdict that routes nobody — there is no run to
judge — and it is still written down.

An already-passing smoke script satisfies the phase. Run it, record the run,
continue — do not rebuild what already starts. It is the **re-run** that
satisfies it, though, never the stored record: see `#evidence`.

## The smoke-script contract

1. **Committed**, at the path `catalog/structure.md` gives under
   `Project scripts`, and invocable by the `Smoke` entry of
   `catalog/tech.md#standard-commands-copy-paste`. Both slots ship in those
   templates; a project that has not filled them in yet fills them here, rather
   than inventing a location this phase alone knows.
2. **Starts the system the way the entrypoint declares it** — the same command a
   user or a deployment would run, not a test harness that constructs the
   application object in-process. Constructing it in-process is exactly the
   evasion the 577-green-tests-and-no-entrypoint case was made of.
3. **Reaches the surface one declared boot obligation names, over the real
   transport the entrypoint speaks** — a socket for a service, stdio for a CLI,
   the queue for a worker — and asserts that reachability alone: the request was
   served **by the surface the obligation names**, not merely by the process.
   The obligation is a `US-*`, or a `CON-API-*` on an API entrypoint, exactly as
   the exit criterion above says. It asserts nothing about that obligation's
   outcome; asserting the outcome would need the predicate Bound 1 forbids.

   **A response the process would give for a surface it does not have is not
   reachability.** A web framework answers an unregistered route with its own
   404, and a script that accepts any response passes on exactly the state this
   phase exists to detect — the missing seam described above. So the script
   asserts a response only a registered surface produces, and the evidence says
   which property it read: a status the unregistered path does not return, a
   header or body the handler sets, or the router's own listing. "It answered"
   is not that property.
   **The response does not have to be the real behaviour** — the sentinel of a
   seam authored here counts as much as the response of a surface that already
   worked. What it may not be is a response the process would give without the
   seam.

4. **Exits non-zero on any failure**, including a start-up timeout. A script
   that reports a failure on stdout and exits 0 proves nothing.
5. **Names the boot obligation whose surface it reaches** — the `US-*`, or the
   `CON-API-*` on an API entrypoint — so the phase's evidence points at an
   obligation rather than at "it booted". Requiring a `US-*` here alone left a
   contract-only API, which declares no user story, with no script this
   contract admits and no way past the phase.
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

This bound governs what the phase **writes**, not what it finds. A handler that
already implements its `US-*` was authored by some earlier row and is that row's
proof, so leave it exactly as it is: downgrading it to a sentinel to look more
skeletal would delete GREEN work no row asked to be re-opened.

## Bound 2 — seam debt is written back (blocking)

Every shortcut the skeleton takes is written back **in the same commit** as the
skeleton: the stub predicate, the in-memory store standing in for persistence,
the hard-coded identity. One entry per independently observable boundary, per
`selector-granularity.md`.

**Written back through the ledger's owner, not into the ledger.** A `todo`
**row** is upstream SSOT: this skill's carve-out is the `Status` / `DR-ID` /
`Evidence` cells of rows that already exist, and "adding, removing or
re-scoping a row is an upstream change"
(`.qfai/assistant/constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`). So the
debt is discharged in two writes this skill _is_ allowed to make, both in the
skeleton's commit:

1. the enumerated shortcuts in `Skeleton debt` (`#evidence`), one line per
   boundary, each naming the obligation it defers **and the row or obligation
   that already carries it**; and
2. a Change Request at `.qfai/decisions/CR-YYYYMMDD-NNNN-<slug>.md` per
   `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected`, listing **only the
   shortcuts that step 1 could not attribute to anything**.

Attribute first, request second. Most shortcuts are already owned: an
in-memory store stands in for persistence a `TC-*` row already plans, a fixed
identity for an authorization `TC-*`, and those rows need nothing added. And
what a CR may ask for is narrow — `/qfai-sdd` generates rows for
**coverage-target `TC-*`** and nothing else, so a request to add a row for a
`US-*` or a `CON-API-*` produces no row and returns
(`../../qfai-atdd/references/red-provenance.md#a-spec-with-no-atdd-owned-rows`).
A CR that asks for a duplicate or for a row nothing generates is unapprovable,
and an unresolved CR blocks completion for as long as it sits there. So a
shortcut reaches the CR only when it defers a coverage-target `TC-*` that the
spec set genuinely does not declare; write the rest into `Skeleton debt` with
the row that owns them and raise nothing.

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

| Failure class                                                                                                   | What it is                                                           | What to do                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Environment** — port already bound, missing dependency, wrong runtime version, absent credential              | the machine, not any artifact                                        | repair it, record the cause and the repair in `Skeleton result`, and report to the operator if it survives the repair. No Change Request.               |
| **Code** — syntax error, wiring mistake, the entrypoint the skeleton itself just wrote                          | the skeleton's own work, which this phase owns                       | fix it inside the phase. No Change Request.                                                                                                             |
| **Steering** — `catalog/tech.md` or `catalog/structure.md` names a start command or a path that is wrong        | stale steering, which Stage 0 already owns the refresh of            | refresh the steering file per Stage 0 and re-run. No Change Request.                                                                                    |
| **Upstream** — the declared entrypoint does not exist in the spec set, or the contract cannot start as declared | drift: an upstream artifact contradicts itself or the running system | **this** is the Change Request, per `.qfai/assistant/constitution/drift-protocol.md#when-drift-is-detected`, with its drift class and its reproduction. |

Only the last row produces a Change Request. A CR needs an upstream artifact to
change, a drift class and an owner rerun; a port conflict supplies none of
those, and an unapprovable CR left open blocks completion for as long as it
sits there. Once such a CR is approved, its reset is applied by
`change-request-reset.md` like any other.

### After the halt

The halt ends the **invocation**, not the work. The class decides who repairs
and where, and the repair is not a fourth cycle taken here:

- **Environment / Steering** — the operator repairs the machine or refreshes
  the steering file. Neither is this skill's artifact, and neither can be
  fixed from inside a halted phase.
- **Code** — this phase owns it, and the repair belongs to the **next**
  invocation of the phase, not to a cycle past the budget. The budget is what
  stops an unbounded loop; spending a fourth cycle because the class came out
  `Code` would remove it.
- **Upstream** — the Change Request is raised now and the repair waits on its
  approval and the owner rerun.

Resume by invoking the phase again once the cause is addressed. **The budget is
per invocation**, so the next one starts at `Skeleton cycles: 0 of 3`; record
the previous halt and its class in the same section, so a reader can see three
invocations that each burned three cycles for the same reason. A cause that
survives two halts is reported to the operator whatever its class — three more
cycles will not find what six did not.

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
`.qfai/assistant/constitution/drift-protocol.md#allowed-exceptions-minimal-whitelist`.

**This file is tracked, not ignored.** `npx qfai init`'s managed `.gitignore` block
ignores `.qfai/evidence/*` and then negates this one path
(`!.qfai/evidence/skeleton.md`), for the same reason it negates the decision
records: Bound 2 requires the debt to be written back **in the skeleton's own
commit**, and a record that never enters a commit reaches no other clone, no CI
run and no other author. The cross-invocation check below would then hold only
inside the working directory that happened to run the phase. A project whose
`.gitignore` predates that negation adds it before the first run.

One `## <entrypoint>` section per declared entrypoint, written before the first
row is selected, each carrying the fields below.

A target that declares **no** runnable entrypoint has no such section to write
its verdict in, and the verdict is still required. It goes in a single
project-level `## (no entrypoint)` section — the one section whose heading names
no command — carrying `Skeleton verdict: not applicable` and its reason, and
nothing else. Later invocations read it exactly like the others: a target that
declares no entrypoint and finds this section records nothing further and
continues; one that has since declared an entrypoint gets a section of its own
and runs the phase for it, leaving this one where it is.

The fields:

| Field                 | Content                                                                                                                |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `Skeleton verdict`    | `applicable` or `not applicable` plus the reason                                                                       |
| `Skeleton entrypoint` | the declared entrypoint, as a command                                                                                  |
| `Skeleton US`         | the boot obligation whose surface the smoke script reaches — a `US-*`, or a `CON-API-*` on an API entrypoint           |
| `Skeleton command`    | the smoke-script invocation, in a form that **re-runs** — secrets referenced (`$QUEUE_URL`), never inlined or redacted |
| `Skeleton script`     | the committed script's path and the SHA-256 of its bytes, as `<path>@<sha256>`                                         |
| `Skeleton result`     | its output and **exit status**, verbatim, secret values redacted                                                       |
| `Skeleton gatekeeper` | the `qa-gatekeeper` verdict on that run — `PASS` required when applicable                                              |
| `Skeleton debt`       | the shortcuts enumerated, and the `CR-*` raised to add their rows                                                      |
| `Skeleton cycles`     | cycles used, of 3                                                                                                      |

`Skeleton result` follows the same rule as every other gate result in this
skill: the command and its real output, never a prose verdict
(`../SKILL.md#evidence-hard-rules`). A `Skeleton verdict` of `not applicable`
leaves the remaining fields empty and needs no smoke script.

**Verbatim except for secrets.** A real transport is started with real
connection material: a queue URL, a database connection string, an API token in
the command line or echoed by the runtime at start-up. Because this file is
git-tracked, verbatim there is not a discarded terminal scrollback — it is a
credential written into the repository's permanent history, from where a
rotation is the only removal. So `Skeleton result` is copied verbatim with
**known secret values replaced by a stable placeholder** (`<QUEUE_URL>`,
`<DB_PASSWORD>`, the variable's own name), and nothing else altered.

`Skeleton command` takes no placeholder. It is normalised before the run into a
form that resolves its secrets at run time, so by the time it is recorded there
is no value in it to redact — _`Skeleton command` stays runnable after
redaction_, below, states how.

The redaction of the result is bounded by what it must leave intact:

- the **exit status** is never redacted — it is the criterion itself;
- redact the **value**, not the line: the failing command, the error class and
  the message stay, so the halt is still classifiable by the taxonomy above;
- name each placeholder in place, so a reader can tell a redaction from a
  truncation;
- when a run cannot be recorded without its secrets — the whole diagnostic is
  the credential — record the redacted head, the exit status and that fact.
  Withholding the record is not an option; the phase is never silently skipped.

Redaction is not licence to paraphrase. A prose verdict where output belongs is
the failure this rule already forbids, and a redacted transcript is still a
transcript.

**`Skeleton command` stays runnable after redaction.** The record is not only
read — the next invocation and the spec-level checkpoint below **re-run it**, so
a command whose connection string became `<DB_PASSWORD>` would be re-run against
nothing and fail an entrypoint that is perfectly healthy. `Skeleton result` may
carry a placeholder for a value; `Skeleton command` may not. Write it in a form
that resolves the secret at run time instead of quoting it — the environment
variable (`$QUEUE_URL`), the secret-provider invocation, or the `.env` the
project already loads — and name in `Skeleton command` which variables it needs.
That is the same command a human would type, and it is what makes the re-run
mean anything. A command that cannot be written without an inline secret is a
smoke script that needs a wrapper, not a record that needs a placeholder.

**The command is a pointer to the committed script, not an independent copy.**
Nothing seals this file: it is edited by hand, merged, and rebased like any
document, and a `Skeleton command` quietly changed to `true` would re-run,
exit 0, and carry a stale `Skeleton gatekeeper: PASS` past a product that no
longer starts. So the re-run resolves the script the way the first run did —
from `catalog/tech.md` and the committed smoke script it names — and treats
`Skeleton command` as the arguments and environment that script was given. When
the two disagree, the committed script wins and the entrypoint is **unproven**:
it re-enters the 3-cycle budget with a fresh `qa-gatekeeper` judgement, because
a `PASS` recorded against a command that is no longer the one on disk is a
verdict about something else. Record the resolution in `Skeleton result` so the
disagreement is visible rather than silently repaired.

**The script's bytes are bound too, not only the path and the arguments.**
Resolving the path leaves the body free: a later commit that rewrites the same
script to `exit 0` keeps `catalog/tech.md` and `Skeleton command` agreeing, the
mismatch above never fires, the re-run exits 0, and the old
`Skeleton gatekeeper: PASS` carries a product that no longer starts. So
`Skeleton script` records the path **and** the SHA-256 of the committed
script's bytes, and the re-run recomputes it. A hash that has moved makes the
entrypoint **unproven** exactly as a moved command does — the 3-cycle budget
and a fresh `qa-gatekeeper` judgement, not an automatic re-record. The verdict
is about the script that ran, and a different script is a different run.

A hash that has moved is not by itself a fault: editing the smoke script is
ordinary work. What it is, is a verdict that has not been taken yet.

**The hash binds what the run executes, not only the file that starts it.** A
smoke script that delegates — to a `package.json` script, to another committed
helper, to a module it imports — puts the behaviour being proved outside its own
bytes, and a dependency edited to a no-op leaves the recorded hash matching
while the product stops starting. So `Skeleton script` records a path and a
SHA-256 **per committed file the run executes**, the entry script first.

Where the delegation leaves the repository no hash can reach it, and two
different things are outside. They are recorded differently, because Bound 2
has a home for one and none for the other.

| What is outside                                                                                                 | Recorded as                                                                                      |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| The runtime the project runs **on** — the language runtime, a container engine, a queue broker                  | An environment precondition in `Skeleton result`: the version, or the image digest, the run used |
| A dependency standing **in for behaviour a row owns** — a stub service, a fake started in place of the real one | `Skeleton debt`, like any other shortcut                                                         |

The first is not a shortcut. Nothing about it defers a product obligation, so no
row carries it and no `CR-*` could request it, and filing it under Bound 2 would
either block the gate or raise a Change Request `/qfai-sdd` cannot act on.
Recording the version is what makes the run reproducible, which is the whole
claim a hash makes about a committed file.

**On every later invocation, read this file first.** An entrypoint with no
section runs the phase. An entrypoint whose latest recorded `Skeleton result` is
non-zero runs the phase. An entrypoint whose latest recorded `Skeleton result`
is exit status 0 re-runs its `Skeleton command` and appends that run under the
section — and **the appended run's own exit status decides, not the recorded
one**:

- exit 0 — the entrypoint is proven for this invocation; continue to
  `Phase: Red`.
- non-zero — the entrypoint is **unproven again**, exactly as if it had no
  section: it re-enters this phase's 3-cycle budget and, if the budget runs out,
  its halt and classification. `Phase: Red` does not start for it.

A past pass says the entrypoint started once, not that it still starts: any
later change can break it, and continuing on the stale record re-admits the
collection errors this phase exists to remove. Append the failing run either
way — the record of what broke is what the classification is made from.

That read is what makes "once per entrypoint" checkable across invocations
instead of a memory of what a previous session did.

### The same re-run before spec completion

Reading this file at the top of the next invocation closes the gap **between**
invocations. It does nothing about the gap **inside** one. The rows that follow
this phase edit the composition root, the start-up configuration and the
dependency wiring, and a suite whose tests construct their subject directly
stays green through every one of those breakages. The spec-level command set is
the full suite, the static gates and `validate`
(`checkpoint-verification.md#verification-command-set-per-spec`); not one of
them starts the product. Left at that, a spec completes on this phase's opening
record while its entrypoint no longer boots — the exact state the phase exists
to remove, arrived at from the other end.

So the **spec-level checkpoint re-runs the `Skeleton command` of every in-scope
entrypoint** and appends each run under its section, exactly as a later
invocation would, and the appended exit status decides in the same way: non-zero
**fails that checkpoint, blocks spec completion**, and returns the entrypoint to
this phase's 3-cycle budget and its halt classification. Entrypoints whose
verdict is `not applicable` have no command and are skipped.

Re-run it at a **per-item** checkpoint as well whenever the item touched an
entrypoint, its wiring or its start-up configuration. That is not the cheapest
place to run it, but it is by far the cheapest place to attribute the break,
because exactly one row's work stands between the last passing run and this one.

## Reached from `/qfai-atdd`

Stage 5 (`/qfai-atdd`) runs before this skill (`.qfai/assistant/constitution/workflow.md`
stages), and its P6 runtime-evidence gate needs the same running program this
phase produces. On a fresh project there is no entrypoint yet and no ledger row
to hand over — `red-provenance.md#a-spec-with-no-atdd-owned-rows` says zero
`E2E` / `API` rows is legitimate — so that stage would fail at P5-P7 before this
phase was ever reached.

It therefore invokes `/qfai-implement` for **this phase alone**, exactly as it
already invokes `Phase: Red` step 3a for a seam alone: build the skeleton,
record the evidence, return. No row is selected, no row's status is written, and
the invocation does not continue to `Phase: Red`. The later full invocation
reads `.qfai/evidence/skeleton.md`, re-runs the recorded command and — while
that re-run exits 0 — moves on.

That invocation belongs to **stage gate P1a**, ahead of P1b, not merely
somewhere before P5: `/qfai-atdd` takes its first branch-1 RED at P1c, before
P2-P4 build any surface, so a skeleton scheduled only "before P5" arrives after
the RED it was supposed to make admissible
(`../../qfai-atdd/SKILL.md`, Stage Gates;
`../../qfai-atdd/references/red-provenance.md#a-project-whose-program-does-not-start-yet`).
