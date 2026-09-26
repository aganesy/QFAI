# CLI Contract: `qfai workflow`

- Contract scope: the `npx qfai workflow` command surface — seven operations,
  their input and output, the run state machine and the final gate — and the
  operator-facing screens of the free-text entry built on it
- Owning flow: `BF-0001`
- Used-by: `qfai-run` and `qfai-maintain`, and the stage skills when a work
  order hands them a stage of a run
- SSOT modules:
  - `packages/qfai/src/cli/lib/args.ts` (flag parser; `--in` and `--root` keep
    their meaning, `--run` is added)
  - `packages/qfai/src/cli/lib/exitCodes.ts` (`EXIT_CODES`; this surface adds no
    code)
  - `packages/qfai/src/core/gitChanges.ts` (the read-only git access the core
    reuses)
  - `packages/qfai/src/core/validate.ts` (`validateProject()`, which `start` and
    `finish` call in process)
  - `packages/qfai/src/core/flowScope.ts` (resolves the one business flow a run
    binds)
  - `packages/qfai/src/core/storyTree/tables.ts` (reads and compares the rows
    of `decisions.md` and `open-questions.md`)
  - `packages/qfai/src/core/validators/storyTreeObligations.ts` (the obligation
    model: which BF, AC and EX IDs a flow holds, and which tests annotate them)
- Companion contracts:
  - `.qfai/spec/03_contract/cli/workflow-files.md` — the run trees, the tracked
    evidence, the authorization record, the plan files and the shipped schemas
  - `.qfai/spec/03_contract/cli/qfai-init.md` — what `qfai init` installs for
    this surface, and its mode line
  - `.qfai/spec/03_contract/cli/qfai-validate.md` — the drift gate that reads the
    `Change request:` rows a run appends, and the config issue for an invalid
    `workflow.mode`

The command adds a `workflow` command under `packages/qfai/src/cli/commands/`
and the control core under `packages/qfai/src/core/workflow/`. The SSOT list
names only files that exist.

## Command line

`workflow` is a known command. It has exactly seven operations. There is no
`exec` operation and no command registry: the harness runs commands and submits
their results. The CLI never launches an AI or a slash skill.

| Operation  | Flags              | Payload in `--in` | Takes the lock | Returns                                              |
| ---------- | ------------------ | ----------------- | -------------- | ---------------------------------------------------- |
| `start`    | `--in`             | start input       | yes            | the new run, or the mode in force                    |
| `next`     | `--run`            | none              | yes            | the outstanding work order, or what the run waits on |
| `accept`   | `--run`, `--in`    | stage result      | yes            | the verdict and the run's new state                  |
| `decision` | `--run`, `--in`    | decision input    | yes            | the recorded answer and the run's new state          |
| `status`   | `--run` (optional) | none              | no             | where the run stands, and the mode in force          |
| `resume`   | `--run`            | none              | yes            | the classed receipts and the next work order         |
| `finish`   | `--run`            | none              | yes            | the completion target and every unmet condition      |

- `--root` keeps its existing meaning on every operation. No other flag exists.
- `--run <runId>` names a run by its ID. `status` without it reports the
  worktree's one non-terminal run, or no run.
- `--in <path>` names a regular file whose real path lies under the real path of
  `.qfai/run/`. The `start` payload is written to `.qfai/run/inbox/<name>.json`
  and every later payload to `.qfai/run/<runId>/inbox/<name>.json`. Anything
  else is refused `invalid-input` with reason `in-path`. There is no stdin
  input and no inline JSON argument.
- The core copies the request into `request.private.json` and leaves the inbox
  file in place, so a retry after a lost response re-reads the same path.
- An unknown operation, an eighth operation name, `exec` and an unknown flag are
  refused through the existing parser, exit 2, with the JSON error document of
  [Output](#output) on stdout.
- `npx qfai workflow --help` prints the seven operations, one line each, as text.
  It is the one invocation whose stdout is not a JSON document.

## Modes

The mode in force is `workflow.mode` in `qfai.config.yaml`: `active`, `shadow`
or `off`. An absent key means `active`.

| Mode      | `start`                                                                                      | `status`                     |
| --------- | -------------------------------------------------------------------------------------------- | ---------------------------- |
| `active`  | Creates a run, subject to the checks below                                                   | Reports the run and `active` |
| `shadow`  | Writes nothing, reads no payload, returns `ok` with `mode: "shadow"` and `run: null`, exit 0 | Reports `shadow`             |
| `off`     | Writes nothing, reads no payload, returns `ok` with `mode: "off"` and `run: null`, exit 0    | Reports `off`                |
| any other | Refused `fail-closed` with cause `invalid-mode`, exit 2; no mode is guessed                  | Reports `mode: null`         |

Under `shadow` no run exists. `qfai-run` reads the mode from `status`, proposes
the route and its reason in the conversation and calls no write operation. The
core therefore checks no shadow proposal. That is a known limit of `shadow`.

`active` chains stages automatically only on a host whose capability report and
first delegation pass ([Host capability report](#host-capability-report)).

## Operations

### `start`

1. Reads the mode. Under `shadow` or `off` it returns as [Modes](#modes) says.
2. Takes the lock and scans `.qfai/run/` for directories named `run-<17
digits>`, and nothing else. A non-terminal run is refused `run-active`,
   naming that run and its state. A run written by a newer package is refused
   `newer-record`.
3. Parses the start input and checks the capability report.
4. Recomputes triggers (b) and (c) of [Fail-closed](#fail-closed).
5. Runs `validateProject()` in process, profile `full`, the whole project and
   the project's `failOn`, and keeps each finding identity as the `cli_observed`
   baseline of [Completion](#completion).
6. Fixes the tool and policy for the run: the package version as `qfaiVersion`,
   the digest of the running CLI entry file, the digests of the watched paths,
   and the git identity (branch, worktree real path, `HEAD`). It snapshots the
   tracked index and working tree and the nonignored untracked paths as the
   [run change boundary](#run-change-boundary) defines.
7. Creates `.qfai/run/<runId>/` without `recursive`. On `EEXIST` it takes the
   next millisecond. It copies the request, publishes `run-created` and
   `capture-request`, and returns the run in state `routing`.

A check that fails before step 7 leaves no run directory behind. `start` starts
no AI and spawns no process.

### `next`

- In `routing`, returns the routing work order. Its executor is `qfai-run`.
- In `ready`, issues the next work order of the plan and moves the run to
  `running`. Before issuing a story-authoring work order for a new-story slot,
  it checks that the slot's CREATE `human_decision` has a persisted
  `authorizationId`. If it has none, `next` moves the run to `awaiting_input`
  with a new `create` question for that slot, returns no work order and emits
  no `work-order-issued` event. When every stage of the plan is accepted, it
  returns `workOrder: null`, and `finish` is the next call.
- In `running`, returns the outstanding work order again, with the same ID.
- In `awaiting_input` or `blocked`, returns `workOrder: null` and names the open
  questions or the cause.
- No `next` returns a completed verdict.

### `accept`

Takes an agent-submitted stage result. The checks run in this order:

1. A result ID already recorded returns the stored verdict and writes nothing,
   whatever state the run is in now. The same ID with a different payload digest
   is refused `invalid-input` with reason `result-id-reused`.
2. A terminal run is refused `run-terminal`.
3. The expected sequence must equal the run's current sequence, or the result is
   refused `stale-sequence`.
4. The payload checks of [Stage result](#stage-result), the
   [obligation check](#obligation-check), the
   [record check](#story-tree-records) for a story-authoring stage, then the
   guards of [State machine](#state-machine).
5. One transition is applied and its event appended.

A routing result carries the route proposal, so a refused proposal is
`proposal-refused` from `accept`. An approval cannot arrive through `accept`: the
stage result has no field that can carry one, and a payload trying is refused
`invalid-input` with reason `schema`.

### `decision`

Records a human answer on a path apart from agent-submitted results, as
[Questions and decisions](#questions-and-decisions) states. A `stop` is the one
input that needs no open question.

### `status`

Reads the published journal and writes nothing. The run directory is byte for
byte the same before and after. It takes no lock and ignores unpublished
temporary files. The journal, not tracked `summary.json`, supplies the current
state. It reports the current stage and work order, the open questions as
stored, the cause or blocker with its owner, the debts and the mode in force. A
terminal run reports its terminal state.

### `resume`

Revalidates the stored run against the current tree:

1. The run's recorded worktree real path must be this worktree's, or the call is
   refused `identity-mismatch`. A changed branch in the same worktree is cause
   `invariant-violation`.
2. Journal integrity, `qfaiVersion` compatibility, and tool and policy digests
   against those fixed at `start`.
3. Rechecks the [run change boundary](#run-change-boundary), then matches
   unaccepted results against the artifacts on disk. It rechecks each receipt's
   dependency fingerprints and classes every receipt `valid`, `stale` or
   `unknown`. An `unknown` receipt is never treated as `valid`.
4. Reads which examples of the bound flow tests annotate. It never rewrites a
   story or a test to match the run.
5. Applies the edges of [State machine](#state-machine) that `resume` fires.
6. Returns the classed receipts and the work order `next` would return from the
   smallest valid checkpoint.

`resume` never starts a host session.

### `finish`

The only operation that judges completion. See [Completion](#completion).

## Payloads

Field names are exact. An unknown key in any payload is refused `invalid-input`
with reason `schema`. Paths are project-relative and use `/`. The shipped
schemas that encode these payloads are named in `workflow-files.md`.

### Start input

| Field              | Content                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `request`          | `{ text }`, the request as the operator wrote it. Stored only in the runtime tree |
| `completionTarget` | `qfai_done`, or `working_tree` when the operator said not to commit               |
| `harness`          | `{ host, capabilities }`, the capability report                                   |

### Execution context

The run records it in `snapshot.json`: the run ID; `qfaiVersion`; the digests
of `qfai.config.yaml`, of `.qfai/assistant/rule/**` and of the package's plan
files; the harness and its reported capabilities; the request digest; the
normalized goal; the request kind; the scope; the flow binding; the allowed
effects; the current stage instance, attempt and work order; the dependency
snapshot; the budgets used; and the history of authors, recommenders and
reviewers. It carries no private version counter and no `schemaVersion`.

### Route proposal

The `proposal` of a routing result.

| Field                  | Content                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestKind`          | `change`, `read_only`, `plan_only`, `verify_only`, `resume`, `cancel` or `explicit_stage`                                                                                                |
| `candidateRoute`       | `direct`, `bugfix`, `bounded-change`, `feature`, `discovery`, or `null` for a kind other than `change`                                                                                   |
| `goal`                 | The goal in one sentence                                                                                                                                                                 |
| `expectedBehaviorRefs` | Tagged normative references: `request`, `flow-id`, `contract-id` or `path`                                                                                                               |
| `observedRefs`         | Tagged observed references: `path` for code or files and `evidence` for test or log artifacts; kept apart from normative references                                                      |
| `affectedFlowIds`      | Business-flow IDs, `BF-NNNN`                                                                                                                                                             |
| `riskSignals`          | Members of `data-loss`, `breaking-public-contract`, `authorization-loosened`, `authorization-restored`, `secret-egress`, `production-effect`, `requirement-dropped`, `out-of-scope-work` |
| `unresolvedQuestions`  | Question inputs ([Questions and decisions](#questions-and-decisions))                                                                                                                    |
| `newStories`           | `{ goal, covers, excludes, evidence, flowId }` per story the plan needs and no existing story represents. `flowId: null` means the slot creates a flow                                   |
| `proposedWriteScope`   | Write areas: project-relative paths or globs                                                                                                                                             |
| `protectedTargets`     | Paths the run must not write                                                                                                                                                             |
| `requiredStages`       | Stage kinds, in plan order                                                                                                                                                               |
| `rationale`            | A short auditable reason, never a transcript                                                                                                                                             |
| `confidence`           | Optional number. Advisory; it lifts no gate                                                                                                                                              |

Each reference is exactly `{ kind, ref }`, with a nonempty string `ref` and a
closed `kind`. `request` has `ref: "request"`; `flow-id` names a `BF-NNNN`;
`contract-id` names a Short ID of `contracts.md`. `path` and `evidence` name
project-relative file paths, without a glob or root escape. `evidence` is
observed-only and is checked as a path, so naming a missing test or log cannot
bypass `unknown-path`. A `kind` allowed in one reference array is not inferred
from the spelling of `ref` or from an observer fact. A bare string or an unknown
or disallowed `kind` is refused `invalid-input` with reason `schema` before
proposal checks. There is no legacy string fallback. The checked plan retains
both typed arrays separately.

SIMPLIFIED: a `contract-id` reference resolves against no index, so it is always
`unknown-id`. Lift when a route proposal needs to cite a contract as the
normative source of a change.

The core checks the proposal and refuses it `proposal-refused`, listing every
failed check in `reasons[]`:

| Reason                | Refused when                                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `unknown-path`        | A `path` or `evidence` reference has no current path-existence fact or that fact is false; the reason names the exact `ref`                                                                                  |
| `unknown-id`          | A `flow-id` reference names no business flow of the tree, or the reference is a `contract-id`                                                                                                                |
| `protected-surface`   | A write area lies inside `.git/`, `.qfai/run/`, `.qfai/evidence/workflow/` or `.qfai/evidence/decision/`, names `decisions.md` or `open-questions.md` under `paths.specsDir`, or overlaps a protected target |
| `scope-escape`        | A write area resolves outside the project root, or `requestKind` is not `change`                                                                                                                             |
| `unresolved-approval` | A risk signal needing the operator is neither answered nor opened as a question                                                                                                                              |
| `stage-set`           | `requiredStages` omits a stage the plan runs `always`, omits `verify` on a change route, or names a stage the plan lacks                                                                                     |
| `flow-binding`        | `newStories` is empty, the plan has a stage that takes a flow target, and `affectedFlowIds` names no flow or more than one                                                                                   |

The two tables are closed to a proposal's write areas: a stage that records a
decision or an open question does so through its `recordAreas`, which only the
story-authoring stage kinds carry, and the
[record check](#story-tree-records) governs what it may append.

A checked proposal becomes the run's plan. Its write scope is the
`request_scope` authorization. `authorization-restored` asks nothing and raises
the review profile of the run's `qfai-implement` and `qfai-atdd` work orders to
`implementation-heavy`, as [Work order](#work-order) states.

A run binds exactly one business flow:

- When the checked proposal lists `newStories`, the `sdd` result's `bindings`
  bind it ([Authorizations](#authorizations)).
- When it lists none and the plan has a stage that takes a flow target,
  accepting the checked plan binds the one flow `affectedFlowIds` names. The
  core resolves it as `qfai validate --flow` does and appends a
  `binding-recorded` event naming that flow, with no slot.

Every stage but `route`, `discussion`, `maintenance` and `verify` takes the
bound flow as its `target`. A plan with no other stage binds no flow.

### Work order

| Field                                                | Content                                                                                                                                                                                                                             |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runId`, `workOrderId`, `stageInstanceId`, `attempt` | Identity. `workOrderId` is stable until a result for it is accepted                                                                                                                                                                 |
| `stageKind`, `operation`                             | From the plan. One fixed operation per work order                                                                                                                                                                                   |
| `executor`                                           | `{ skill }`                                                                                                                                                                                                                         |
| `target`                                             | `{ kind: "flow", flowId }` or `{ kind: "new_story", slotId }`. Absent from the `route`, `discussion`, `maintenance` and `verify` work orders, which bind no flow and no new story; never absent from any other                      |
| `scope`                                              | `{ digest, writeAreas, protectedTargets, allowedEffects, nonGoals }`                                                                                                                                                                |
| `recordAreas`                                        | The stage's own records for the bound flow, which the core derives from the stage kind, as below. Held apart from `scope`: `scope.digest` covers `scope` only, and the announcement shows `scope` only                              |
| `inputs`                                             | `{ path, digest }` per input                                                                                                                                                                                                        |
| `obligations`                                        | `{ flowId, ids, digest }`: the BF, AC and EX IDs of the bound flow and a digest over them. It never records whether a test annotates an item                                                                                        |
| `checkpointRef`, `parentWorkOrderId`                 | The example a long stage resumes at, and the acceptance work order a seam-only order returns to                                                                                                                                     |
| `requiredGates`, `requiredReviewerRoles`             | Gate IDs and reviewer roles                                                                                                                                                                                                         |
| `actorHistory`                                       | Every author, recommender and reviewer the run has recorded                                                                                                                                                                         |
| `authorizationRefs`                                  | What authorizes the work                                                                                                                                                                                                            |
| `priorStageReceiptRefs`                              | `{ ref, validity }` per receipt the work builds on, `validity` one of `valid`, `stale`, `unknown`. After a replan they show which receipts stay valid and which went stale, and `obligations.ids` names the obligations that remain |
| `settled`                                            | The checked proposal's routing result ID, and every answered question as `{ questionId, text, chosen }`, `chosen` the option labels or the value. Runtime only: the tracked summary copies none of it                               |
| `expectedSequence`                                   | The sequence the result must carry                                                                                                                                                                                                  |

A stage of a run processes the examples of its obligation set that no test
annotates, one at a time in ascending ID order, as
`delivery-workflow.md` states for a stage invoked by name. Pending OQ-0191:
which of those examples a work order hands to a stage when the flow holds many.

`recordAreas` holds the records a stage is defined to write for the flow its
work order binds. Each is named for that flow, never as a pattern over every
flow:

| Stage kind                                                               | `recordAreas`                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `implement`, `regression_fix`, and `test_fix` served by `qfai-implement` | `.qfai/evidence/implement-<BF>.md`                                                                                                                                                                                                                                                                                                                                                              |
| `acceptance`, and `test_fix` served by `qfai-atdd`                       | `.qfai/evidence/atdd-<BF>.md`; `.qfai/evidence/coverage-depth-<BF>.md`                                                                                                                                                                                                                                                                                                                          |
| `sdd_append`                                                             | The `03_Example.md` of the one story the diagnosis's first matched ID names; the one contract whose rule cites that criterion's examples, derived at issue (pending OQ-0193 when rules in several contracts cite them: the work order then names no contract, and the stage returns `blocked` with one `operator` finding naming those contracts); `decisions.md`; `.qfai/evidence/sdd-<BF>.md` |
| `sdd`, `sdd_delta`                                                       | `decisions.md`; `open-questions.md`; `.qfai/evidence/sdd-<BF>.md`. For a slot that creates a flow, the two tables only: the flow's ID is not known at issue. Pending OQ-0192: where that flow's SDD evidence is named. Story and contract files come from the proposal's write scope                                                                                                            |
| `prototype`                                                              | None                                                                                                                                                                                                                                                                                                                                                                                            |
| Every other kind                                                         | None: its writes are the checked scope or git-ignored output                                                                                                                                                                                                                                                                                                                                    |

- `recordAreas` never holds a path the `protected-surface` check of
  [Route proposal](#route-proposal) closes, apart from the two tables for the
  story-authoring kinds. Nor does it hold a story's `01_User-story.md` or
  `02_Acceptance-Criteria.md`: a stage that needs one names it in the
  proposal's write scope, where the operator sees it.
- For `sdd_append` this refuses a change to a criterion with `write-scope`.
  The contract file is a record area as a whole, so `write-scope` does not
  keep its rules unchanged: the [record check](#story-tree-records) does.
- `recordAreas` lifts no [obligation check](#obligation-check).

`requiredReviewerRoles` are the `always_required` reviewers of the review profile
the effective routing gives the executor skill: the package's default
`agent-routing.yml` and `review-profiles.yml`, each entry replaced whole by a
`qfai.config.yaml` `routing:` or `reviewProfiles:` override of the same key. In
a run whose routing result carries `authorization-restored`, a work order whose
executor is `qfai-implement` or `qfai-atdd` takes the `implementation-heavy`
profile instead: `completion-reviewer`, `qa-gatekeeper` and
`implementation-reviewer`. Every other work order keeps its skill's profile.

`scope.allowedEffects` holds each external effect the stage declares in its plan
(`workflow-files.md#format`, `stages[].effects`) that the run's
`project_policy` authorization also names. An effect the stage declares and no
`project_policy` names is left out. The stage runs without it, the core performs
no external effect itself, and the completion report lists the effect as not
requested.

An orchestrated `/qfai-sdd` work order always carries a target, so a missing
target never means every flow. A valid binding supplies the flow scope a stage
skill otherwise takes from `--flow BF-NNNN`.

## Run change boundary

`start` fixes the branch, worktree real path and `HEAD`. It also records the
starting state of each dirty tracked path in the index and working tree, and
each nonignored untracked path, with its path, file type, mode and digest. The
core compares current path content, type and mode with that starting state. It
includes commits since `start` by comparing the current `HEAD` with the fixed
`HEAD`, as well as current index, working-tree and nonignored untracked
changes. Committing a path already dirty at `start` without changing its
content, type or mode does not make it a run change.

For that cumulative comparison, the authorized set is the union of all issued
work orders' `scope.writeAreas` and `recordAreas`, plus the core's own tracked
`.qfai/evidence/workflow/<runId>/` tree. The core evidence tree grants no stage
write permission. A stage result's `changedFiles` remains limited to that work
order's `scope.writeAreas` and `recordAreas`; it cannot list the core evidence
tree or another work order's areas as its own change.

When a `scope-dependency` blocker is repaired outside the run, `resume` admits
only the paths named by that blocker's findings that a `Change request:` row at
WIP or DONE names, and that row's change to `decisions.md`. It records each
admitted path and its current digest as a bounded adjustment to the starting
state, while keeping the original snapshot for audit. It rechecks the row's
Status, the paths and the digests on later `resume` calls and at `finish`. A
row not in force, a different digest or any other out-of-scope change fails
closed until the scope is replanned and authorized. The same adjusted starting
state and authorized set govern `finish`.

### Stage result

| Field                                                           | Content                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resultId`                                                      | Chosen by the harness; 1 to 64 characters of `[A-Za-z0-9._-]`. The idempotency key                                                                                                                                                                                                              |
| `workOrderId`, `stageInstanceId`, `attempt`, `expectedSequence` | Must name the outstanding work order                                                                                                                                                                                                                                                            |
| `outcome`                                                       | `accepted`, `accepted_with_debt`, `needs_repair`, `awaiting_input`, `blocked` or `unrun`                                                                                                                                                                                                        |
| `testObservation`                                               | `pass`, `expected_red`, `fail`, `unrun` or `not_applicable`. Reported apart from `outcome`                                                                                                                                                                                                      |
| `changedFiles`                                                  | `{ path, digest }` for each path this stage changed that git does not ignore. Each must lie in this work order's `scope.writeAreas` or `recordAreas`                                                                                                                                            |
| `artifactRefs`                                                  | `{ path, digest }` each. A file the stage wrote that git ignores, such as a report or a review record, is named here: it is not a changed file and is outside the `write-scope` check. Its real path must lie under the project's real root and name a regular file                             |
| `gateResults`                                                   | `{ gateId, verdict }` each. No command ID                                                                                                                                                                                                                                                       |
| `reviewResults`                                                 | `{ role, agentInstance, verdict, reportRef }` each                                                                                                                                                                                                                                              |
| `actor`                                                         | `{ agentInstance }`, required: the agent instance that produced the result. The actor history records it as the recommender of a routing result and the author of any other, and each `reviewResults` entry of an accepted result as a reviewer                                                 |
| `debts`                                                         | `{ findingCode, path, cause, owningFlow, detectingCommand, resolvingOwner, blockingExtent }` each. `resolvingOwner` is a skill a plan names, or `operator`; `owningFlow` is `null` in a run that binds no flow                                                                                  |
| `questions`                                                     | Question inputs, with `outcome: awaiting_input`                                                                                                                                                                                                                                                 |
| `notRun`                                                        | `{ kind: "not_applicable", reason }` or `{ kind: "reused", receiptRef }`                                                                                                                                                                                                                        |
| `red`                                                           | `{ testId, failureKind }`, `failureKind` one of `assertion`, `collection`, `import`, `startup`, `timeout`                                                                                                                                                                                       |
| `seam`                                                          | `{ targetTestId, observation }` on a seam-only result                                                                                                                                                                                                                                           |
| `seamRequest`                                                   | `{ targetTestId }` on an acceptance result that needs a seam first                                                                                                                                                                                                                              |
| `testFix`                                                       | `{ citedBefore, citedAfter, reviewRef, rerunRef }` on a `test_fix` result. `citedBefore` and `citedAfter` each hold the BF, AC and EX IDs the test annotates and a digest of the text of those items and of the rules that cite them                                                            |
| `regressionFix`                                                 | `{ testId, rerunRef, reviewRef }` on a `regression_fix` result: the GREEN re-run of the same test and its independent review                                                                                                                                                                    |
| `diagnosis`                                                     | `{ verdict, reproductionRef, matchedIds }`, `verdict` one of `missing-test`, `defective-test`, `regression`, `expectation-differs`. `matchedIds` names BF, AC or EX IDs of the bound flow; the first decides the next stage. Cause and impact are content of the record `reproductionRef` names |
| `bindings`                                                      | `{ slotId, flowId, storyIds }` per new-story slot the `sdd` stage created                                                                                                                                                                                                                       |
| `delegation`                                                    | `{ status, attempt }`, `status` `saturated` or `unavailable`                                                                                                                                                                                                                                    |
| `measurement`                                                   | Tokens in, out and cached; the total over every sub-agent; resident tool-definition size; reference bytes read; wall-clock time; questions put; rework count. Each a number or `null` when the host does not expose it, never `0` in its place                                                  |
| `proposal`                                                      | On a routing result only                                                                                                                                                                                                                                                                        |

`accept` refuses a result `invalid-input`, naming each failed check in
`reasons[]`:

| Reason                     | Refused when                                                                                                                                                                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`                   | The payload does not parse, lacks a required field, holds a field of the wrong shape, has an unknown key, or tries to carry an authorization                                                                                                                                                                  |
| `work-order`               | The result names a work order other than the outstanding one                                                                                                                                                                                                                                                  |
| `result-id-reused`         | The result ID is recorded with a different payload digest                                                                                                                                                                                                                                                     |
| `digest-mismatch`          | A submitted digest differs from the core's own of the file                                                                                                                                                                                                                                                    |
| `write-scope`              | A changed file lies in neither `scope.writeAreas` nor `recordAreas`. A diagnose-only work order has neither                                                                                                                                                                                                   |
| `unbound-story`            | The result creates a story or a flow that no approved slot is bound to                                                                                                                                                                                                                                        |
| `red-not-assertion`        | `expected_red` with a failure kind other than `assertion`. Such a failure is `unrun` or `blocked`                                                                                                                                                                                                             |
| `seam-passed`              | A seam-only result observes `pass` at its target test                                                                                                                                                                                                                                                         |
| `test-fix-meaning`         | `citedAfter` differs from `citedBefore`. The fix belongs to `qfai-sdd`, and the run is unchanged. The `test_fix` stage reaches story authoring by returning `needs_repair` with a finding whose `resolvingOwner` is `qfai-sdd`, through routing when no active stage serves `qfai-sdd` (DEC-0784)             |
| `test-fix-receipt`         | A test fix without its review or re-run receipt                                                                                                                                                                                                                                                               |
| `regression-fix-receipt`   | A regression fix without its `regressionFix` re-run or review receipt                                                                                                                                                                                                                                         |
| `blocked-repairable`       | A `blocked` result lists a finding the run can repair: one inside the checked write scope whose `resolvingOwner` is a skill, or one whose `owningFlow` names a flow that does not exist, or is `null` in a run that binds a flow, or claims another flow while its `path` lies inside the checked write scope |
| `reviewer-not-independent` | A reviewer instance is the result's own `actor`, or is in the actor history as the author or recommender of what it reviewed                                                                                                                                                                                  |
| `example-uncovered`        | An example of the obligation set lost its annotating test ([Obligation check](#obligation-check))                                                                                                                                                                                                             |
| `example-added`            | An example was added by a stage other than `sdd`, `sdd_append` or `sdd_delta`                                                                                                                                                                                                                                 |
| `record-rewritten`         | A story-authoring result changed a row of the two tables it may not change ([Story-tree records](#story-tree-records))                                                                                                                                                                                        |
| `rule-changed`             | An `sdd_append` result changed the contract its `recordAreas` name other than by adding one example ID to one rule's Examples cell ([Story-tree records](#story-tree-records))                                                                                                                                |
| `record-unauthorized`      | A story-authoring result left an approval-requiring row at WIP or DONE without citing this run's answer for it                                                                                                                                                                                                |
| `debt-owner-missing`       | A debt without a resolving owner                                                                                                                                                                                                                                                                              |
| `skip-unexplained`         | A stage not run with no reason                                                                                                                                                                                                                                                                                |
| `reuse-stale`              | A reuse whose receipt is not `valid`                                                                                                                                                                                                                                                                          |
| `authorization-kind`       | An authorization of a kind other than the three, or one derived from mode or confidence                                                                                                                                                                                                                       |

The core never judges whether a rewritten assertion changes what a test means.
The independent review does.

A `delegation` of `saturated` keeps the work order outstanding as a new attempt
and returns `retry: { attempt, nextDelaySeconds }`. The core never sleeps.

A `needs_repair` result lists the findings to repair in `debts`, with the same
fields, and the core routes each finding to its `resolvingOwner`. These entries
are routing data, not open debts of the run: only the debts of an `accepted` or
`accepted_with_debt` result count toward `debt-open` at `finish`. The re-run of
the stage that detected a finding is what shows it repaired.

In a run that binds no flow, such as a `direct` run, a `debts` entry carries
`owningFlow` `null`. The semantic effect `qfai-maintain` finds before an edit is
one such entry: `findingCode` `maintain-semantic-effect`, and a
`detectingCommand` naming the review or the command that found it.

A `blocked` result lists what blocks it in `debts`, with the same fields. These
entries are routing data too. A finding inside the checked write scope may
appear on a `blocked` result only with `resolvingOwner` `operator`. A finding
owned by a skill there is repairable, and `accept` refuses the result with
reason `blocked-repairable`. A finding's `owningFlow` must name a flow that
exists, or be `null` in a run that binds no flow, and one naming another flow
must have its `path` outside the checked write scope, or the result is refused
the same way. How the core names the blocker is in [State machine](#state-machine).

An acceptance result that cannot reach its assertion carries
`seamRequest: { targetTestId }` with outcome `needs_repair`. The core issues a
seam-only work order to `qfai-implement` whose `parentWorkOrderId` names the
acceptance work order, and once that result is accepted it returns to the same
acceptance stage instance as a new attempt. The round trip stays inside the run.

A `blocked` or `unrun` seam-only result blocks the run as any result does, and
the parent acceptance attempt stays open. Once `resume` clears the cause, `next`
reissues the seam-only work order as a new attempt. A `needs_repair` seam-only
result routes by its `debts`, as any `needs_repair` result does.

## Obligation check

When it issues a work order bound to a flow, the core records the flow's
obligation set with the story-tree obligation model: each BF, AC and EX ID of
the flow, and for each example whether a test annotates it. At `accept` it reads
the set again and refuses:

- an example a test annotated at issue that has no annotating test
  (`example-uncovered`);
- an example added by any stage but `sdd`, `sdd_append` and `sdd_delta`
  (`example-added`).

An example a story-authoring result removes is not `example-uncovered`: the
removal is that stage's own change, which its `Change request:` row names. A
regression fixed against an annotated example leaves it annotated.

The digest covers the IDs and the text of the items and serves `resume`'s
reconciliation. `accept` refuses only the two changes above. Any other test
edit, such as a test fix moving a selector, is the stage owner's and is judged
by review.

## Story-tree records

A story-authoring stage (`sdd`, `sdd_append`, `sdd_delta`) records its triage
and its change requests as rows of `decisions.md`, and its open questions as
rows of `open-questions.md`, as `story-tree-authoring.md` states. At `accept`
of such a result the core compares both tables with their state at issue:

- Every row present at issue keeps its ID, Content and Approach and stays in the
  table. Only a row this run appended may change its Status. Any other change is
  `record-rewritten`.
- An appended `decisions.md` row that names an approval-required operation —
  CREATE, DELETE, SPLIT, MERGE, SUPERSEDE or UPDATE:REMOVE — or opens
  `Change request:` may stand at WIP or DONE only when its Approach cites
  `<runId>/<authorizationId>` and `answeredBy` of a `human_decision` this run
  recorded for it. Otherwise the result is `record-unauthorized`.

- An `sdd_append` result leaves every rule of the contract its `recordAreas`
  name with the ID and Statement it had at issue, and changes that file only by
  adding the new example's ID to one rule's Examples cell. Any other change to
  that file is `rule-changed`.

SIMPLIFIED: the operation of a triage row is read as the first operation token
of its Content. Lift when a triage row is found whose operation stands
elsewhere in its Content.

A row's Approach never changes after it is appended, so a row that needs an
answer is appended only by the attempt that holds it:

- A CREATE row answers a new-story slot. Its `human_decision` is the `create`
  answer given at routing ([Authorizations](#authorizations)), so the stage
  appends the row citing it.
- A `Change request:` row names every story-tree and contract file the stage
  changed, so that `qfai validate --profile tdd` later in the run finds the
  change authorized by the drift gate. The stage asks once and changes nothing:
  it returns `awaiting_input` with one `decision` question showing the change
  target and the proposal. The attempt holding the `human_decision` makes the
  change and appends the row at WIP, citing that answer. A row citing only
  `request_scope` is refused `record-unauthorized`.
- An approval-free row, such as the UPDATE:APPEND a seeded example records,
  cites no answer.

The attempt that appends a row moves it to DONE, in that same attempt, once
every change the row names is written. `accept` of its result therefore sees
the row at DONE, or at WIP when changes the row names remain for a later
attempt of the same stage, which moves it to DONE once it writes them. The core
never writes a Status.

A row a run appends carries no options or recommendation of its own, as BR-0005
asks of a change request raised outside a run: they are the ones the stage's
question showed, and the authorization record the row cites holds them
(`workflow-files.md#authorization-record`).

A stage that finds upstream drift outside the run's checked scope appends no
`Change request:` row for it. It returns `blocked`, and the change is made by
the owning stage invoked by name, outside a run ([State machine](#state-machine)).

## Questions and decisions

The core opens every question. A question input from a routing or stage result
becomes a stored question the core names:

| Field            | Content                                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `questionId`     | Minted by the core                                                                                                      |
| `kind`           | `decision`, `fact` or `create`                                                                                          |
| `text`           | Stored as `qfai-run` put it to the operator, and returned verbatim by `status` and `next`                               |
| `options`        | `{ optionId, label, description, effect }` each, `effect` one of `proceed`, `replan`, `stop`                            |
| `selection`      | `{ min, max }`, how many options may be chosen                                                                          |
| `recommendation` | An `optionId`, on a `decision` or `create` question only. A `fact` question carries none                                |
| `effect`         | On a `fact` question with no options: the effect of any value                                                           |
| `story`          | On a `create` question: `{ goal, covers, excludes, flowId }` as the question showed it, and the `slotId` the core mints |

A `create` question has exactly two options: create it, with effect `proceed`,
and do not create it, with effect `stop`.

The decision input is `{ questionId, answer, answeredBy, expectedSequence }`,
where `answer` is `{ optionIds }` or `{ value }`, or it is
`{ stop: true, answeredBy }`. `answeredBy` comes from the harness, from the
operator. The core records `capture: "agent_captured"`.

| Case                                                               | Result                                                              |
| ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Same `questionId` and the same normalized answer as a recorded one | The stored verdict. Nothing is written; one `human_decision` exists |
| An answered `questionId` with a different answer                   | Refused `answer-conflict`                                           |
| No open question with that ID, or no question ID and not a `stop`  | Refused `no-open-question`                                          |
| An option outside the offered set, or a count outside `selection`  | Refused `invalid-input`, reason `option`                            |
| `stop` on a non-terminal run                                       | The run moves to `cancelled`. It needs no open question or sequence |
| `stop` again on a run a `stop` cancelled                           | The stored verdict. Its identity is the run plus the `stop` input   |
| Any other input on a terminal run                                  | Refused `run-terminal`                                              |

- The two replay rows are checked first, whatever state the run is in now, and
  before the expected sequence.
- The normalized answer is the sorted option IDs, or the value in Unicode NFC
  with surrounding white space removed.
- Every answered question creates a `human_decision` authorization.
- The answer's effect is the strongest effect among the chosen options, in the
  order `stop`, `replan`, `proceed`.
- A decline of the `create` question is the `stop` effect: the run moves to
  `cancelled` over the authorized-stop edge.

## Authorizations

| Kind             | Recorded when                                               | Satisfies                                                       |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `request_scope`  | The routing result is accepted and its plan checked         | The normal change the request allowed, within the checked scope |
| `human_decision` | `decision` records an answer                                | The question it answers, and only that                          |
| `project_policy` | The project adopted a policy, referenced by path and digest | An external effect the policy names                             |

- Each records `capture`: `host_observed` or `agent_captured`. No producer of
  `host_observed` exists, so every record the core writes is `agent_captured`,
  and a submitted `host_observed` is recorded as `agent_captured`.
- `mode`, a confidence value and an agent-written approval are not
  authorizations.
- An `ask-user` item of a skill's Default Autopilot Policy is satisfied only by
  a `human_decision` answering it. A `hard-required` input is satisfied by
  `request_scope` or by the run's binding. An `auto-decide` item needs none.
  `--auto` satisfies nothing.
- Push, pull request, merge, deploy, a production migration and extra spending
  each need a `project_policy` naming the effect. A `request_scope` authorizes
  none of them, even when the request names one.
- A routing-time CREATE approval is a `human_decision` bound to a `new_story`
  slot. One slot is one approval-required triage operation the story-authoring
  stage will record: a CREATE of a story in an existing flow, or a CREATE of a
  flow with the stories written under it. The approval is stale when the scope
  digest it was given under changes, when the approved story text changes, or
  when a replan widens the scope. It never goes stale by the clock. The scope
  digest leaves out the IDs the stage binds, so binding the created story does
  not make it stale.
- An apparent CREATE approval with the right slot and `proceed` effect but no
  persisted `authorizationId` does not authorize the story-authoring work order.
  At issue time the core opens a new `create` question for that slot and moves
  the run from `ready` to `awaiting_input`; it issues no work order. `/qfai-sdd`
  does not ask the question again.
- The core judges staleness when it issues and when it accepts a story-authoring
  work order. A stale approval sends the run to `awaiting_input` with a new
  `create` question. `/qfai-sdd` judges it too, before it appends the triage row.
- When the `sdd` result reports `bindings`, the core appends a binding event and
  writes the binding into the tracked summary.

The record's fields and where it is tracked are in `workflow-files.md`.

## State machine

States: `created`, `routing`, `ready`, `running`, `awaiting_input`, `blocked`,
`interrupted`, `completed`, `cancelled`, `failed`. The last three are terminal
and take no further event.

| From                     | To               | Event                               | Fired by                                                                                                                                         |
| ------------------------ | ---------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `created`                | `routing`        | `capture-request`                   | `start`; or `resume`, for a run a crash left in `created`                                                                                        |
| `routing`                | `ready`          | `plan-accepted`                     | `accept` of a routing result whose proposal is checked and opens no question                                                                     |
| `routing`                | `awaiting_input` | `unsettled-material-input`          | `accept` of a routing result with unresolved questions or new stories                                                                            |
| `routing`                | `blocked`        | `missing-capability`                | `accept` of a routing result with outcome `blocked`, or a cause found at that `accept`                                                           |
| `ready`                  | `running`        | `dispatch-work-order`               | `next`, or `resume`, issuing a work order                                                                                                        |
| `ready`                  | `awaiting_input` | `material-decision`                 | `next`, before a story-authoring work order, when the slot's CREATE approval lacks a persisted `authorizationId`; opens a new `create` question  |
| `ready`                  | `routing`        | `required-plan-revision`            | `next` or `resume`, when the routing receipt is no longer `valid`                                                                                |
| `ready`                  | `blocked`        | `budget-exhausted`                  | `next` or `resume`, when the routing receipt is no longer `valid` and the run has made every replan its budget allows                            |
| `ready`                  | `completed`      | `validated-final-result-and-target` | `finish`, when every condition holds                                                                                                             |
| `running`                | `ready`          | `accept-nonfinal-result`            | `accept` of a result with outcome `accepted`, `accepted_with_debt` or `needs_repair`                                                             |
| `running`                | `awaiting_input` | `material-decision`                 | `accept` of a result with outcome `awaiting_input`, or a stale approval at `accept`                                                              |
| `running`                | `blocked`        | `unrun-or-unresolved-dependency`    | `accept` of an `unrun` or `blocked` result, an unavailable delegation, a budget at its cap, or a cause found                                     |
| `running`                | `interrupted`    | `observed-session-interruption`     | `resume`, when the outstanding work order has no accepted result                                                                                 |
| `running`                | `routing`        | `scope-or-obligation-revision`      | `accept` of a result that needs a new plan: a diagnose verdict `expectation-differs`, or a repair whose owner no active stage of the plan serves |
| `awaiting_input`         | `ready`          | `valid-answer-no-replan`            | `decision` with effect `proceed`                                                                                                                 |
| `awaiting_input`         | `routing`        | `answer-changes-scope`              | `decision` with effect `replan`                                                                                                                  |
| `blocked`                | `ready`          | `blocker-cleared-and-revalidated`   | `resume`, when the named cause or blocker no longer holds                                                                                        |
| `interrupted`            | `ready`          | `reconciled-resume`                 | `resume`, in the same call that fired `observed-session-interruption`                                                                            |
| `interrupted`            | `blocked`        | `reconciled-with-blocker`           | `resume`, when reconciliation leaves a cause or blocker                                                                                          |
| every non-terminal state | `cancelled`      | `authorized-stop`                   | `decision` with a `stop` input or an answer with effect `stop`                                                                                   |

- There is no edge from `running` to `completed`: a run in `running` has an
  outstanding work order, which is an unmet condition. A `finish` whose
  conditions are unmet leaves the state as it was.
- `failed` has no edge and no event. An operation that finds `torn-event`,
  `sequence-gap` or `hash-mismatch` derives `failed` on read, from any
  non-terminal state, and writes nothing to a journal it cannot trust. Nothing
  else leads to `failed`: a budget at its cap, an unavailable delegation and an
  identity or scope break are `blocked`.
- A cause found on a run in `running` or `routing` moves it to `blocked` over
  the edges above. Found on a run in `ready` or `awaiting_input`, the operation
  is refused `fail-closed`, naming the cause, and the state is unchanged. A
  `stop` is never refused on that ground.
- Guards on every event: `expected-sequence-matches`, `lock-owned`,
  `authority-in-scope`, `input-dependencies-valid`, and
  `no-unresolved-blocking-debt-on-completion` on `completed`.
- The journal also carries events that change no state: `run-created`,
  `work-order-issued`, `question-opened`, `authorization-recorded`,
  `binding-recorded`, `receipt-recorded` and `retry-scheduled`.
- Budgets are constants of the core: three replans per run, three automatic
  repairs per cause (a finding code and its path), and three retries of a
  saturated delegation per work order, at 30, 60 and 120 seconds. Reaching one
  moves the run to `blocked` with blocker `budget-exhausted` and never counts as
  a pass. A replan `next` or `resume` needs on a run in `ready` once the replan
  budget is spent takes the `budget-exhausted` edge to `blocked`.

A blocked run names exactly one cause from [Fail-closed](#fail-closed) or one
blocker — `stage-blocked`, `delegation-unavailable`, `budget-exhausted` or
`scope-dependency` — together with who can clear it: `operator`, or the skill
that owns the work.

- After the first required real delegation has succeeded,
  `delegation-unavailable` is derived from a result's `delegation` and takes
  precedence over anything the result lists. An unavailable first delegation
  gives cause `unsupported-capability`. `budget-exhausted` is derived from the
  budgets and also takes precedence over listed findings.
- Otherwise a `blocked` result gives the blocker. It is `scope-dependency` when
  any finding it lists in `debts` lies outside the checked write scope, and
  `stage-blocked` when none does or none is listed.
- The notice names every listed finding as the blocker's subject. Who clears it
  is the findings' shared `resolvingOwner`, or `operator` when they differ or
  none is listed.
- The core cannot observe a blocker a stage reported. `resume` clears one by
  reissuing that stage's work order as a new attempt, and the new result decides
  whether the block still holds.

## Fail-closed

A fail-closed cause stops automatic chaining. It never rewrites the project's
configuration.

| `cause`                  | Trigger                                                                                                                                                                                            | Found at                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `policy-drift`           | (a) A digest fixed at `start` of `qfai.config.yaml` or `.qfai/assistant/rule/**` changed, including inside the [run change boundary](#run-change-boundary)'s authorized set                        | Write operations, `resume`, `finish`            |
| `contract-undeclared`    | (b) A plan fails to load; a skill a plan names is not installed; or a `(skill, operation)` pair a plan uses is absent from that skill's `## Operations` table in `references/orchestrated-mode.md` | `start`; write operations after an upgrade      |
| `reviewer-missing`       | (c) A blocking reviewer the package's default routing requires for a phase a plan dispatches is absent from the effective routing                                                                  | `start`; write operations                       |
| `unsupported-capability` | An unknown host, a declared capability gap, or a failed first delegation                                                                                                                           | `start` (refusal); first delegation (`blocked`) |
| `invariant-violation`    | The branch or worktree identity fixed at `start` changed, or the cumulative change escaped the [run change boundary](#run-change-boundary)                                                         | Write operations, `resume`, `finish`            |
| `invalid-mode`           | `workflow.mode` holds a value other than the three                                                                                                                                                 | `start`                                         |

- Policy drift is exactly (a), (b) or (c). A `qfai.config.yaml` routing override
  that keeps every required role is not drift, and `active` stays in force.
- The plans are read from the package only. A plan file under the project's
  `.qfai/assistant/` is never read and is not a cause.
- Journal integrity is not a cause. It derives `failed`.
- A submitted input that breaks a rule is a refusal, not a cause.
- Found at `start`, a cause is a `fail-closed` refusal that leaves no run. The
  message names the cause and a stage skill that works when invoked by name.
  For `reviewer-missing` it names the `qfai.config.yaml` override that dropped
  the reviewer.
- Found later, it acts as [State machine](#state-machine) says. `resume` clears
  it once the cause no longer holds, and a `stop` ends the run. Meanwhile a new
  `start` is refused `run-active`, naming the blocked run.
- At `finish`, drift is an unmet condition, not a refusal
  ([Completion](#completion)).

## Host capability report

The start input's `harness` names the host, `claude-code` or `codex`, and
reports each required capability as `true` or `false`:

| Capability         | Means                           |
| ------------------ | ------------------------------- |
| `fetchSkillBody`   | Fetch a skill body              |
| `invokeStage`      | Invoke a stage skill            |
| `delegateSubAgent` | Delegate to a real sub-agent    |
| `relayQuestion`    | Relay a question and its answer |
| `runShellAndTests` | Run shell commands and tests    |
| `writeProjectRoot` | Write inside the project root   |
| `keepRunRecord`    | Keep a run record               |
| `resume`           | Resume a run in a new session   |

- The set is fixed and every capability is required.
- An unknown host, Copilot included, or any `false` is refused at `start`:
  `fail-closed`, cause `unsupported-capability`, naming the host or the
  capability.
- The report is recorded as `agent_captured`. The first stage that needs a real
  delegation is the probe: a result reporting it `unavailable` moves the run to
  `blocked` with cause `unsupported-capability`, naming `delegateSubAgent`.
- The hosts the documentation declares supported have no runtime effect. The
  capability report and the first delegation decide, in every mode.

## Journal, lock and crash states

Every write operation takes these steps, in this order:

1. Create `.qfai/run/.lock` exclusively (`wx`), holding the owner stamp: pid,
   hostname, worktree real path, run ID, operation, start time and a random
   owner token.
2. Read and verify the journal: every `journal/NNNNNN.json` from `000001`
   parses, the sequence has no gap, and each event's `prevHash` is the SHA-256
   of the previous event file's bytes as written.
3. Check the operation: replay first, then the expected sequence, then the
   guards.
4. Write the files the event will reference — work order, result, report copies
   — each to a temporary name, then rename.
5. Write the event to `journal/.NNNNNN.tmp`, then rename it to
   `journal/NNNNNN.json`. The lock and the sequence check make the target name
   new, so the rename never replaces a file. There is no in-place fallback.
6. Rewrite `snapshot.json` through a temporary file, recording the sequence it
   reflects.
7. Once tracked evidence has begun, rewrite the tracked files through temporary
   files ([Decline audit](#decline-audit)). `finish` skips this step: its
   completion event changes only the runtime journal and snapshot.
8. Remove the lock, if it still carries this owner token.

| A crash after             | Leaves                                  | The next operation                                                                  |
| ------------------------- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| Step 1                    | The lock, and nothing else              | Takes the lock over after the checks below                                          |
| Step 4                    | Files no event references               | Ignores them, and replaces them when the operation is retried                       |
| Step 5, before the rename | `journal/.NNNNNN.tmp`                   | Discards it at takeover. It is never read as an event                               |
| Step 5, after the rename  | A published event and a stale snapshot  | Rebuilds the snapshot from the journal and applies no effect twice                  |
| Step 6                    | Stale tracked files, except at `finish` | Rebuilds them from the journal at the next non-terminal write operation or `resume` |

- A published event file that does not parse is `torn-event`, a missing
  sequence number is `sequence-gap`, and a `prevHash` that does not match is
  `hash-mismatch`. Each stops the run, and none is corrected to success.
- Recovery or replay of a completed `finish` may rebuild the runtime snapshot
  from the journal. It never rewrites tracked evidence. `summary.json` keeps its
  last recorded state even if the runtime journal says `completed`.
- The hash chain detects accidental corruption and mix-ups, not tampering by an
  agent with the same write access.
- The lock is taken over only when its owner is on this host, its pid is not
  alive, and its run holds no pending temporary event or that event has been
  discarded. Never on the lock's age. Otherwise the call is refused `lock-held`,
  naming the owner's run, operation and start time.
- The lock lives for one write operation. One writing run per worktree follows
  from the `run-active` check at `start`, not from a lock held between calls.
- `EBUSY`, `EPERM` and `EACCES` while reading or writing a run file are refused
  `io-error`, naming the system error, with no retry loop. Every write operation is idempotent and
  compare-and-set, so the harness re-invoking it is the retry.
- A run whose `qfaiVersion` is newer than the running package is refused
  `newer-record` by every operation. A record the core cannot parse is reported
  as `legacy`, is never reported as a success, and is not counted as a
  non-terminal run.

## Fingerprints and receipts

- Every digest of a tracked input is SHA-256 after CRLF normalization, so a
  Windows and a Linux checkout agree.
- The obligation fingerprint of an example covers the flow ID, the example ID,
  and the text of the example, its criterion, its story and every contract rule
  that cites it. It leaves out test annotations, selectors and implementation
  files.
- The oracle fingerprint is the test file content recorded at RED, kept apart
  from the obligation fingerprint.
- A receipt's dependencies are a set of `(path, digest)` over the actual inputs,
  glob membership lists, config and lockfile, the contract that owns each cited
  rule, the selected discussion pack, and the tool, policy and skill digests.
  Never a modification time or a size.
- Each dependency is classed `normative`, `historical_observation` or
  `current_verification`. A RED receipt holds its obligation fingerprint as
  `normative` and its oracle fingerprint as `historical_observation`, so a later
  production change leaves it `valid`. A GREEN or verify receipt holds the
  production and test files it ran as `current_verification`. The routing
  receipt holds each `path` its proposal cites outside the proposed write scope
  as `normative`, and each cited `evidence` file as `historical_observation`: a
  log the run's own tests rewrite leaves it `valid`.
- `accept` checks that every `artifactRefs` real path stays under the project's
  real root and names a regular file. It refuses a missing or escaping file as
  `invalid-input` with reason `schema`, before reading it. It recomputes the
  digest of every submitted `changedFiles` and `artifactRefs` entry.
- A result naming a shared report, such as `verify.json`, has that file copied
  to `reports/<stageInstanceId>/` with its digest. Every later read uses the
  copy.
- Each receipt records its trust level: `cli_observed` for what the core ran
  itself, `agent_reported` for what a result submitted. A submitted
  `host_observed` is recorded as `agent_reported`.

## Completion

`finish` judges the run against the completion target fixed at `start`.

For `qfai_done`, every tracked run change and tracked workflow evidence file
must be committed before `finish` can succeed. The core checks this condition
before publishing the completion event. A successful `finish` then appends
`completed` to the runtime journal and updates its runtime snapshot; it writes
no tracked file. `working_tree` uses the same runtime-only completion event, but
does not require a commit. Tracked `summary.json` keeps the state it had at its
last write. `status` derives the current state from the journal.

- It runs `validateProject()` in process: the whole project, profile `full`, the
  project's `failOn`, with no shell and no process spawned for it. The git reads
  `finish` needs are the read-only argv reads [Boundaries](#boundaries) allows.
  The runtime journal records the verdict and finding identities as
  `cli_observed`, without request text, free-text answers or raw validator
  output. That result, not an agent's, decides the validate gate.
- Each remaining finding at or above `failOn` is reported as `pre-existing` or
  `new` against the `start` baseline. A finding's identity is its `code`, `file`
  and sorted `refs`. Neither kind is waived.
- The gates are `validate`; `verify`, read from this run's verify stage copy of
  `verify.json`, which must hold `status: PASS` and `scope: full`; and
  `qa-gatekeeper`, an independent PASS recorded by a reviewer instance the actor
  history does not show as an author or recommender. Submitted `gateResults` are
  informative and `agent_reported`.
- It compares the tool version, the CLI entry digest, and the policy and config
  digests with those fixed at `start`, including paths inside the run's write
  scope. A run that changed its own gate does not complete.

Every condition that fails is listed once in `unmet[]` as
`{ condition, subject, owner }`:

| `condition`              | Unmet when                                                                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `work-order-outstanding` | The run is in `running`                                                                                                                                                                    |
| `run-waiting`            | The run is in `awaiting_input` or `blocked`, naming the question or the cause                                                                                                              |
| `obligation-unprocessed` | An obligation in scope is not processed                                                                                                                                                    |
| `stage-unaccepted`       | A required stage has no accepted result                                                                                                                                                    |
| `review-missing`         | A blocking reviewer has no independent PASS                                                                                                                                                |
| `verify-missing`         | The run has no accepted verify stage                                                                                                                                                       |
| `verify-foreign`         | The `verify.json` offered is not this run's verify stage copy                                                                                                                              |
| `gate-failed`            | A gate fails, with each finding marked `pre-existing` or `new`                                                                                                                             |
| `diff-out-of-scope`      | The cumulative change escapes the [run change boundary](#run-change-boundary)                                                                                                              |
| `approval-unanswered`    | A required approval has no answer                                                                                                                                                          |
| `debt-open`              | A debt of an accepted result is unresolved, as defined below. Findings listed on a `needs_repair` result are not debts                                                                     |
| `tool-drift`             | The tool version or CLI entry digest differs from `start`                                                                                                                                  |
| `policy-drift`           | A policy or config digest differs from `start`                                                                                                                                             |
| `uncommitted`            | `qfai_done` only: a tracked run change under the [run change boundary](#run-change-boundary), or a tracked workflow evidence file, is uncommitted before the runtime-only completion event |

A debt is resolved when the `finish` validate, or a later accepted result of the
stage kind that detected it, no longer reports its `findingCode` at its `path`.
Otherwise it stays `debt-open`, with its `resolvingOwner` as the owner. A debt
only another flow's owner can resolve therefore keeps the run from completing
until that flow is repaired.

Every condition has a fixed `owner`, which extends the rule that a blocked run
names `operator` or the skill that owns the work ([State machine](#state-machine)):

| `condition`                        | `owner`                                                                                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work-order-outstanding`           | The skill the outstanding work order was issued to                                                                                                                                    |
| `stage-unaccepted`                 | The skill of the stage with no accepted result, as `workflow-files.md#vocabulary` maps its stage kind; for `test_fix`, the skill the kind of the diagnosis's first matched ID selects |
| `verify-missing`, `verify-foreign` | `qfai-verify`, the skill of the verify stage                                                                                                                                          |
| `debt-open`                        | The debt's `resolvingOwner`                                                                                                                                                           |
| Every other condition              | `operator`                                                                                                                                                                            |

A run with no accepted verify stage is reported as `verify-missing` only, never
also as `stage-unaccepted`.

| Target         | Met when                                | Reported as                                                                          |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `working_tree` | Every condition but `uncommitted` holds | `target: "working_tree"`, with `deliveryUnmet[]` naming what `qfai_done` still needs |
| `qfai_done`    | Every condition holds                   | `target: "qfai_done"`                                                                |

A `working_tree` result is never reported as `qfai_done`. A met target moves the
runtime run from `ready` to `completed`, exit 0. An unmet one leaves the state as
it was, exit 1. `finish` implies no push, pull request, merge or deploy.

## Output

Every operation writes exactly one JSON document to stdout, on success and on
every error path. Logs and progress go to stderr, and nothing on stderr is
needed to act. While an operation runs, stdout stays empty.

```json
{
  "ok": false,
  "run": { "id": "run-20260924101010123", "state": "running", "sequence": 7 },
  "error": {
    "code": "stale-sequence",
    "message": "The run moved on since this result was prepared. Read the run's status and submit again."
  }
}
```

- `ok` is `true` when the operation was processed and `false` when it was
  refused. `run` is `{ id, state, sequence }`, or `null` where no run exists. A
  refusal on an existing run carries its current state and sequence.
- A successful document adds the operation's own payload beside `ok` and `run`.
- `error` is `{ code, message }`. `reasons[]` of `{ reason, subject }` is added
  on `proposal-refused` and `invalid-input`, and `cause` on `fail-closed` and
  `io-error`.
- `message` is one English sentence in the operator's words: what happened and
  what to do next. It carries no request shape and no internal identifier.
  `qfai-run` relays it in the operator's working language.
- Tests assert codes, reasons and causes, never message text.

The refusal codes form a closed set. They are not validate findings and stay
out of the emitted rule codes.

| Code                | Refused when                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `invalid-input`     | A payload, a flag or the `--in` path is invalid; `reasons[]` names each check                              |
| `lock-held`         | Another write operation holds the lock                                                                     |
| `run-active`        | `start` while a non-terminal run exists                                                                    |
| `run-terminal`      | Any operation but `status` on a terminal run, other than the replay of a recorded result, answer or `stop` |
| `stale-sequence`    | The expected sequence is not the run's current one                                                         |
| `no-open-question`  | A `decision` names no open question                                                                        |
| `answer-conflict`   | A different answer to an answered question                                                                 |
| `identity-mismatch` | The run belongs to another worktree                                                                        |
| `newer-record`      | The run was written by a newer package                                                                     |
| `fail-closed`       | A fail-closed cause, named in `cause`                                                                      |
| `unknown-run`       | `--run` names no run                                                                                       |
| `torn-event`        | A published event does not parse                                                                           |
| `sequence-gap`      | The journal skips a sequence number                                                                        |
| `hash-mismatch`     | An event's `prevHash` does not match                                                                       |
| `proposal-refused`  | A route proposal fails a check; `reasons[]` names each one                                                 |
| `io-error`          | `EBUSY`, `EPERM` or `EACCES` while reading or writing a run file, named in `cause`                         |

## Exit codes

From `EXIT_CODES`, with their existing meanings. No code is added.

| Exit | When                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | The operation was processed, whatever state results: `blocked`, `awaiting_input` and `cancelled` included; a replayed `accept` or `decision`; `status` of a failed run; `start` under `off` or `shadow` |
| 1    | `finish` with an unmet target, drift found at `finish` included; a write operation on a journal failing integrity; `io-error`                                                                           |
| 2    | Every other refusal                                                                                                                                                                                     |

Exit 0 from `status` or `next` means the query was served, never that the run is
complete.

## Boundaries

- The core runs no repository command. It reads git read-only through argv with
  no shell, and runs validate in process.
- No request text, agent output or file content reaches a shell command line.
  Request text is stored verbatim and never evaluated.
- Identity is the resolved real path. On a case-insensitive file system, two
  paths that differ only in case are one identity. The core carries no
  file-system probe. A path whose real path leaves the project root is outside
  every write area.
- Paths are written project-relative with `/`. No absolute path reaches the
  tracked evidence.
- Every command this surface names in shipped text is `npx qfai workflow …`.
- Runtime state never uses `.qfai/state.json`.
- The core writes no file of the story tree and no row of its two tables. The
  stages write them, and the core checks what they wrote.

## Decline audit

Tracked evidence is first written at the run's first `proceed` authorization or
its first accepted stage result — one whose outcome is `accepted` or
`accepted_with_debt`. A run that ends before either writes nothing tracked.

- A CREATE declined at routing ends before either. Nothing is written outside
  `.qfai/run/<runId>/`, and the decline stays in that run's journal. It stays
  auditable only while the project keeps `.qfai/run/`.
- A CREATE declined later, when a stale approval is asked again, comes after
  tracked evidence began, so it is tracked like every other answer.

## Operator-facing screens

A screen is one thing the operator or the harness sees at one moment: a message
the host shows, a question it puts, or the output of one command. The screens
are built on the sections above and do not restate them. The workflow's stories
anchor their criteria on the task IDs below. No UI contract exists for them: the
workflow declares no rendered UI surface.

Rules for every screen:

- A host screen is keyed `host:<name>`, a command screen by its command line.
- A host screen is relayed in the operator's working language. Its acceptance
  asserts the structure and the JSON it is built from — the target field, the
  question ID, the cause, the count of questions — and never a literal word.
  Five tokens are the exception, because the operator types or reads them
  verbatim: `continue`, `stop`, `off`, `shadow` and `active`.
- No route identifier or stage kind reaches the operator. Stages are named in
  plain words.
- Every question takes the form `.agents/rules/user-questions.md` sets out,
  including its plain-text fallback.
- A command screen's `loading` state is stdout staying empty until its one
  document.

### `host:request-entry`

Request entry and route announcement. Actor: the operator, on a host whose
capability report passes, in mode `active`.

| Task                           | Observable result                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `request-entry.announce`       | A change request yields one announcement: the goal, the stages in order and the write scope. It asks nothing   |
| `request-entry.no-stage-typed` | On a clear routine change the operator types no `/qfai-*` after the first prompt, and the run reaches `finish` |
| `request-entry.continue`       | `continue` resumes the one non-terminal run of the worktree without reclassifying it                           |
| `request-entry.other-kind`     | An explanation, a plan only or a verification only is handled as that kind, with no write authorization        |

| State            | Observable                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`        | The announcement. Its write scope is the `request_scope`. It lists no skipped stage; their reasons are in the run evidence                          |
| `loading`        | The host's own activity indicator. `qfai-run` shows nothing until the core returns a checked plan                                                   |
| `empty`          | The text is not a change request. No run, no announcement, no question                                                                              |
| `error`          | `proposal-refused`. `qfai-run` revises the proposal itself; the operator sees nothing unless `host:decision-question` or `host:halt-notice` follows |
| `awaiting_input` | One round: `host:create-question`, or a fact on `host:decision-question`. The announcement follows the answer                                       |
| `shadow`         | The proposed stages and the reason, and a statement that nothing was written. No run exists                                                         |
| `off`            | No run. Stage skills are invoked by name                                                                                                            |

Transitions: `empty` → `loading` when the text is a change request; `loading` →
`default` when the plan is checked; `loading` → `awaiting_input` when routing
opens a question; `awaiting_input` → `default` when the answer's effect is
`proceed`; `loading` → `error` on `proposal-refused`; `error` → `loading` when
`qfai-run` submits a revised proposal; `default` → `host:completion-report`
after `finish`.

### `host:create-question`

New-story approval. Actor: the operator.

| Task                               | Observable result                                                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-question.answer`           | One single-select `create` question per new-story slot names the story, what it covers, what it leaves out and the flow it joins. The answer is recorded through `decision`, and `/qfai-sdd` asks nothing |
| `create-question.decline`          | Declining ends the run `cancelled`. No story is created, story authoring does not start, and nothing is written outside `.qfai/run/<runId>/`                                                              |
| `create-question.no-question-mode` | Under a no-question mode the question is not put. The run stays `awaiting_input` with the story named                                                                                                     |

| State     | Observable                                                                                                                                                                        |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | Two options, each saying what follows, and a recommendation on a line of its own citing the evidence that no story represents the goal. A lexical miss alone is not that evidence |
| `loading` | The answer is being recorded. Nothing else is shown                                                                                                                               |
| `empty`   | The plan needs no new story. The question never appears                                                                                                                           |
| `error`   | `decision` refuses the answer. The run stays `awaiting_input`, and the question is put again with the reason in one sentence                                                      |
| `stale`   | A recorded approval went stale. A new `create` question is put as a material decision on `host:decision-question`                                                                 |

Transitions: `empty` → `default` when routing opens the question; `default` →
`loading` when the operator answers; `loading` → `host:request-entry` when the
effect is `proceed`; `loading` → `host:halt-notice` when it is `stop`;
`loading` → `error` on a refusal; `error` → `default` when the question is put
again.

The announcement does not repeat this question.

### `host:decision-question`

Material decision, story-tree change approval or missing fact. Actor: the
operator.

| Task                               | Observable result                                                                                                                                              |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decision-question.material`       | A material risk puts one `decision` question: what was found, each option with its effect, how many may be chosen, and a recommendation where one is permitted |
| `decision-question.fact`           | One missing fact is asked as a value with no recommendation: a choice where the candidates can be listed, a plain request where they cannot                    |
| `decision-question.round`          | Independent pending questions are put together in one round; a dependent one waits for its answer                                                              |
| `decision-question.change-request` | A story-authoring stage's change is put once: the files it changes and the proposal, with the options to apply it or not                                       |
| `decision-question.stale-create`   | When a CREATE approval is stale, mismatched or unrecorded, this screen puts a new `create` question; `/qfai-sdd` asks nothing                                  |

| State              | Observable                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`          | The finding in at most two sentences, the options with their effects, the selection count, and the recommendation where permitted                                                                 |
| `loading`          | The answer is being recorded                                                                                                                                                                      |
| `empty`            | Nothing material was found. A bugfix restoring an existing authorization check asks nothing, and its `qfai-implement` and `qfai-atdd` work orders carry the `implementation-heavy` review profile |
| `error`            | `decision` refuses the answer. The run stays `awaiting_input`, and the question is put again                                                                                                      |
| `no_question_mode` | The question is not put. The run stays `awaiting_input` or ends `blocked`, and `host:halt-notice` names the open decision                                                                         |

Transitions: `empty` → `default` when a question opens; `default` → `loading`
when the operator answers; `loading` → `empty` when the effect is `proceed`;
`loading` → `host:request-entry` (`loading`) when it is `replan`; `loading` →
`host:halt-notice` when it is `stop`; `loading` → `error` on a refusal; `error` →
`default` when the question is put again.

### `host:halt-notice`

Run halted: blocked, fail-closed, stopped or failed. Actor: the operator.

| Task                      | Observable result                                                                                                                                                                      |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `halt-notice.fail-closed` | Names the cause and what can be done next: clear it, or invoke a stage by name. A `start` refusal says no run was created                                                              |
| `halt-notice.blocked`     | Names the cause or blocker and who can clear it. Nothing reads as complete                                                                                                             |
| `halt-notice.failed`      | Names the integrity code, says nothing was corrected and the run cannot continue, and says a new request starts a new run                                                              |
| `halt-notice.stopped`     | One line confirms the stop. Nothing further is written or asked, and any open decision is listed as open                                                                               |
| `halt-notice.recovery`    | Where recovery is needed, a reverse diff limited to the paths the run wrote, apart from the operator's uncommitted work. Never a reset, a stash, a branch switch or a worktree removal |

| State     | Observable                                                                                                           |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| `default` | One notice: what stopped, the one cause or code, and what clears it. It does not list the checks that passed         |
| `loading` | The operation that found the halt is completing. No partial notice                                                   |
| `empty`   | Nothing halted                                                                                                       |
| `error`   | The host could not record a stop. The next `resume` reconciles the run as `interrupted`, and the notice appears then |

Transitions: `empty` → `default` when an operation returns `blocked`, a
`fail-closed` refusal, an integrity code or a recorded stop; `default` →
`host:request-entry` when the operator clears a blocked or fail-closed cause and
writes `continue`; `empty` → `error` when a stop went unrecorded; `error` →
`default` at the next `resume`. A stopped or failed run is terminal and does not
resume.

### `host:completion-report`

Completion report after `finish`. Actor: the operator.

| Task                             | Observable result                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `completion-report.done`         | `qfai_done` met: the change is done, with the paths changed, a verdict per gate and every decision adopted as an assumption |
| `completion-report.working-tree` | `working_tree` met: the working tree is changed and verified, never done, with the delivery conditions still unmet          |
| `completion-report.unmet`        | Each unmet condition once, with its owner                                                                                   |

| State          | Observable                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------- |
| `default`      | `qfai_done` met. Only this state reports the change as done                                                         |
| `working_tree` | Changed and verified; the delivery conditions still unmet are named                                                 |
| `loading`      | `finish` is running validate. The host shows its own activity                                                       |
| `empty`        | `finish` has not run. `status` is the view of a run in progress                                                     |
| `error`        | Unmet conditions, each once with its owner. A failing gate is marked pre-existing or new. Nothing reads as complete |

- A gate shows its verdict only. Its receipt carries the trust level; the final
  `cli_observed` validation is in the runtime journal.
- An external effect nobody requested is listed as not requested.
- The report does not restate the run's history.

Transitions: `empty` → `loading` when the last stage is accepted and `finish`
is called; `loading` → `default`, `working_tree` or `error` by the `finish`
result; `error` → `loading` when the owners clear the conditions and `finish`
runs again.

### `host:stage-skill-handover`

A stage skill selected with no work order. Actor: the operator, and the stage
skill the host selected.

| Task                           | Observable result                                                                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `stage-skill-handover.pass-on` | In mode `active`, a stage skill neither invoked by name nor handed a work order edits nothing and passes the request to `qfai-run` in the same turn. The operator sees at most one line, then `host:request-entry` |
| `stage-skill-handover.by-name` | A stage invoked by name runs standalone and ends at that stage. A request to go to the end becomes a whole run                                                                                                     |
| `stage-skill-handover.worker`  | A worker handed a work order checks the run, stage and work-order IDs and does only that work, saying nothing to the operator                                                                                      |

| State     | Observable                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------- |
| `default` | At most one line. No explanation of modes or stages                                                  |
| `loading` | The entry check reads the invocation and any work order. Nothing is shown                            |
| `empty`   | Invoked by name, or holding a valid work order. The stage runs                                       |
| `error`   | The work order matches no issued one. The skill edits nothing and returns the refusal to the harness |
| `off`     | Mode `off` or `shadow`. No entry check; the skill behaves as it does when invoked by name            |

Transitions: `loading` → `default` with no name and no work order in mode
`active`; `default` → `host:request-entry`; `loading` → `empty` on a name or a
valid work order; `loading` → `error` on a mismatched work order.

### Command screens

Each command screen is one operation's output. Actor: `qfai-run` through the
harness, or an operator by hand.

| Command                      | `default`                                                                   | `empty`                                                                                   | `error`                                                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx qfai workflow start`    | `ok`, the run in state `routing`, no process spawned                        | Mode `off` or `shadow`: `ok`, the mode, `run: null`, exit 0, nothing written              | `lock-held`, `run-active` (naming the run), `invalid-input`, `newer-record` or `fail-closed` (naming the cause). No run directory is written                      |
| `npx qfai workflow next`     | `ok` and the work order; an unanswered one again with the same ID           | `ok`, `workOrder: null`, and the open question or the cause the run waits on              | `unknown-run`, `run-terminal`, `fail-closed`, or an integrity code with the run derived `failed` (exit 1)                                                         |
| `npx qfai workflow resume`   | `ok`, the work order, and the receipts as `valid`, `stale` and `unknown`    | `ok`, `workOrder: null`: the run waits on a question, or stays `blocked` naming the cause | `unknown-run`, `identity-mismatch`, `newer-record`, `run-terminal`, or an integrity code (exit 1)                                                                 |
| `npx qfai workflow accept`   | `ok`, the verdict, the new state, one new transition event                  | The result ID was already accepted: the stored verdict, exit 0, nothing written           | `stale-sequence`, `invalid-input` with its reasons, `proposal-refused`, `lock-held`, `run-terminal`, or an integrity code. The journal is byte for byte as it was |
| `npx qfai workflow decision` | `ok`, the recorded answer and the new state                                 | The same question and answer, or a repeated `stop`: the stored verdict, exit 0            | `no-open-question`, `answer-conflict`, `invalid-input` (`option` or `authorization-kind`), `stale-sequence` or `run-terminal`. The state is unchanged             |
| `npx qfai workflow status`   | The state, stage, work order, open questions, cause, debts and the mode     | No run in this worktree: `run: null` and the mode, exit 0                                 | `unknown-run`; or a journal failing integrity, reported as `failed` with its code, exit 0                                                                         |
| `npx qfai workflow finish`   | The target met, `qfai_done` or `working_tree`; the run moves to `completed` | No accepted verify stage: `verify-missing`, exit 1, state unchanged                       | The unmet conditions, each once, exit 1, state unchanged. A terminal run is refused `run-terminal`                                                                |

`accept` never returns a completion verdict, and `resume` never starts a host
session. The init summary's mode line is `qfai-init.md`'s.

## Release evidence

The command's routing behaviour is measured by a manual eval before the first
release that ships it, and by deterministic fixtures on every pull request.

- The fault-seed fixture holds 24 cases (`FAULT-001` to `FAULT-024`), and the
  routing-seed fixture 64 English prompts. Both live under
  `packages/qfai/tests/fixtures/workflow/`, with a typed token vocabulary.
- The eval runner lives under `packages/qfai/tests/` with a file name vitest does
  not collect. A maintainer starts it; no workflow file references it.
- A routing seed is safety-relevant when its expected result requires human
  input or forbids an effect, an authorization or a skipped gate. The list is
  recorded before the eval runs.
- An eval record names the host, the package version, the digest of the
  routing-seed file, the recorded safety list and a result per case.
- The README claims as supported exactly the hosts with a passing record and a
  green adapter test for the current version. Both READMEs put the free-text
  entry first and direct `/qfai-*` invocation as the expert path.

## Shipped text

- `qfai-run/SKILL.md` stays within 150 lines. Every shipped asset the workflow
  adds or changes stays within 800 lines, and no line the workflow adds is
  wider than 400 characters.
- Every shipped mention of the command is `npx qfai workflow …`.
- New operator-facing CLI strings are English; `qfai-run` relays them in the
  operator's working language.

## Rules

Rule refs: BR-0147, BR-0148, BR-0241, BR-0320, BR-0341, BR-0676, BR-0680, BR-0681, BR-0682, BR-0683, BR-0741

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Examples                                                                                                                                                                                                                                                                                                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-0533 | When a checked plan needs a story no existing story represents, the run opens one `create` question per new-story slot at routing, before the story-authoring work order is issued, and no later stage asks it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0192-01                                                                                                                                                                                                                                                                                                  |
| BR-0534 | The answer to a `create` question is recorded only through `decision`, as a `human_decision` bound to the work order's `new_story` slot. An approval with no persisted `authorizationId` authorizes no story-authoring work order: `next` opens a new `create` question for that slot instead.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0192-02, EX-0001-0192-44                                                                                                                                                                                                                                                                                 |
| BR-0535 | One approval covers one new-story slot: a CREATE of a story in an existing flow, or a CREATE of a flow with the stories written under it. A plan that needs two slots opens two `create` questions in one round.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0192-03                                                                                                                                                                                                                                                                                                  |
| BR-0536 | An orchestrated story-authoring work order always carries a target: a flow, or a `new_story` slot, which is bound to the created flow and story IDs once the `sdd` result is accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0192-04                                                                                                                                                                                                                                                                                                  |
| BR-0537 | The core judges the approval's staleness when it issues and when it accepts the story-authoring work order, and a stale or mismatched approval sends the run to `awaiting_input` with a new `create` question.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0192-05                                                                                                                                                                                                                                                                                                  |
| BR-0538 | Declining the `create` question takes the stop edge to `cancelled`, and a run that ends before its first `proceed` authorization or accepted stage result writes nothing tracked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0192-06                                                                                                                                                                                                                                                                                                  |
| BR-0539 | Once the plan is checked and before the first stage, `qfai-run` announces the goal, the stages in order and the write scope in the operator's words, names no route or stage identifier, and asks nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0192-07                                                                                                                                                                                                                                                                                                  |
| BR-0540 | The routing stage result carries a proposal with closed, field-specific reference kinds. `accept` rejects malformed or legacy string references as `invalid-input` / `schema` before proposal checks. A typed path or evidence path with no current existence fact or a false fact is refused `proposal-refused` / `unknown-path`, with the path named, state `routing` unchanged and no events. Other failed checks are listed in `reasons[]`; confidence lifts none.                                                                                                                                                                                                                                                                                                      | EX-0001-0192-08, EX-0001-0192-45                                                                                                                                                                                                                                                                                 |
| BR-0541 | Routing records tagged normative references in `expectedBehaviorRefs` apart from tagged observed paths or evidence in `observedRefs`; the kind travels with the value, and a lexical miss never authorizes a CREATE.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0192-09                                                                                                                                                                                                                                                                                                  |
| BR-0542 | `qfai-run` fetches each work order with `next`, hands it to the executor skill and submits its result with `accept` until `finish`, so the operator names no stage after the first prompt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0192-10                                                                                                                                                                                                                                                                                                  |
| BR-0543 | `start` creates a run from its three inputs, `request`, `completionTarget` and `harness`, records the execution context, and spawns no process; the scope is fixed later, at routing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0192-11                                                                                                                                                                                                                                                                                                  |
| BR-0544 | `next` returns the same work order until a result for it is accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0192-12                                                                                                                                                                                                                                                                                                  |
| BR-0547 | A stage that did not run is recorded `not_applicable` with a reason or `reused` with a valid receipt, and neither is a pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0192-15                                                                                                                                                                                                                                                                                                  |
| BR-0548 | `qfai-run` creates work orders, delegates, integrates and presents; it drafts and reviews no primary artifact, and its routing entry names no authoring or reviewing role for itself.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0192-16                                                                                                                                                                                                                                                                                                  |
| BR-0549 | `npx qfai workflow` accepts exactly its seven operations, and any other operation name or unknown flag is refused as invalid input.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0192-17                                                                                                                                                                                                                                                                                                  |
| BR-0550 | Every operation writes exactly one JSON document to stdout, on success and on every error, and exit 0 from `status` or `next` means the query was served, not that the run is complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0192-18                                                                                                                                                                                                                                                                                                  |
| BR-0551 | `finish` runs validate in process with no shell and records the result `cli_observed`, and that result, not an agent's, decides the validate gate.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0192-19, EX-0001-0192-36                                                                                                                                                                                                                                                                                 |
| BR-0552 | `finish` reads the verify gate only from this run's verify stage copy of `verify.json`; a report from another run or a shared file is never this run's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0192-20, EX-0001-0192-36                                                                                                                                                                                                                                                                                 |
| BR-0553 | `finish` requires a `qa-gatekeeper` PASS from a reviewer the run's actor history does not show as an author or recommender.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0192-21, EX-0001-0192-36                                                                                                                                                                                                                                                                                 |
| BR-0554 | Only `finish` reports a run complete, and only from `ready`; an unmet `finish` changes no state and lists every unmet condition with its owner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0192-22                                                                                                                                                                                                                                                                                                  |
| BR-0555 | Each validate finding at or above `failOn` that remains at `finish` is reported as pre-existing or new against the `start` baseline, and neither kind is waived.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0192-23                                                                                                                                                                                                                                                                                                  |
| BR-0556 | A run's completion target is fixed at `start`, and a `working_tree` result is never reported as `qfai_done`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0192-24                                                                                                                                                                                                                                                                                                  |
| BR-0557 | When the operator said not to commit, the target is `working_tree`, and the report lists the QFAI delivery conditions still unmet.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0192-25                                                                                                                                                                                                                                                                                                  |
| BR-0558 | A run carrying unresolved debt does not complete, and debt with no resolving owner is refused at `accept`. A debt only another flow's owner can resolve keeps the run from completing until that flow is repaired outside the run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0192-26                                                                                                                                                                                                                                                                                                  |
| BR-0559 | When an acceptance test cannot reach its assertion because a route, export or module is missing, the acceptance stage asks implement for a seam-only work order, and control returns to the same acceptance stage instance.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0192-27                                                                                                                                                                                                                                                                                                  |
| BR-0560 | A seam-only result that makes the target assertion pass is refused, so the main implementation never lands before RED.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0192-28                                                                                                                                                                                                                                                                                                  |
| BR-0561 | Only a failure at the intended assertion is `expected_red`; an import, collection, start-up or timeout failure is never RED.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0192-29                                                                                                                                                                                                                                                                                                  |
| BR-0562 | A stage result carries its outcome and its test observation as separate fields, validation that did not run is `unrun` and never a pass, and neither value is written into `verify.json`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0192-30                                                                                                                                                                                                                                                                                                  |
| BR-0563 | A result ID already recorded returns its original verdict before the sequence check, and never creates a story or appends a row a second time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0192-31, EX-0001-0192-37                                                                                                                                                                                                                                                                                 |
| BR-0564 | `accept` applies a transition only by compare-and-set against the expected sequence, and a stale sequence is refused with no state change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0192-32, EX-0001-0192-37                                                                                                                                                                                                                                                                                 |
| BR-0565 | `accept` refuses a result whose changes leave the authorized write areas.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0192-33                                                                                                                                                                                                                                                                                                  |
| BR-0566 | The story-authoring stage may bind the stories and the flow it creates for an approved slot, but a story no slot authorizes is refused `unbound-story`, and reading more never widens the write scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0192-34                                                                                                                                                                                                                                                                                                  |
| BR-0567 | A run whose tool version, CLI entry, policy or config digest at `finish` differs from `start`, including by a change inside its own write scope, does not complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0192-35                                                                                                                                                                                                                                                                                                  |
| BR-0568 | A `missing-test` diagnosis for which no example states the case selects `sdd_append` under `missing_example_needed`, then acceptance only when the case needs an acceptance-layer test, then implement and a full verify.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0193-01                                                                                                                                                                                                                                                                                                  |
| BR-0569 | The `sdd_append` work order carries the diagnosis evidence as the reason for the example it appends, and the stage changes no story statement, criterion or rule statement.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0193-02                                                                                                                                                                                                                                                                                                  |
| BR-0570 | A `regression` diagnosis on an example a test annotates selects `regression_fix` under `regression_found`, then a full verify, and the example stays annotated. `diagnosis_missing_test` does not hold, so no implement stage runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0193-03                                                                                                                                                                                                                                                                                                  |
| BR-0571 | A `regression_fix` result is accepted only with a GREEN re-run receipt of the same test and an independent review receipt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0193-04                                                                                                                                                                                                                                                                                                  |
| BR-0572 | `accept` refuses, with reason `example-uncovered`, a result after which an example of the obligation set that a test annotated at issue has no annotating test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0193-05                                                                                                                                                                                                                                                                                                  |
| BR-0573 | `accept` refuses, with reason `example-added`, a result that adds an example to the bound flow, unless it comes from an `sdd`, `sdd_append` or `sdd_delta` stage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0193-06                                                                                                                                                                                                                                                                                                  |
| BR-0574 | A work order names its obligation set by the flow, the BF, AC and EX IDs and their digest, and never records whether a test annotates an item.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0193-07                                                                                                                                                                                                                                                                                                  |
| BR-0575 | An `expectation-differs` diagnosis reclassifies the run to `bounded-change` before any edit.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0193-08                                                                                                                                                                                                                                                                                                  |
| BR-0576 | A request that no story covers but that states its expected result routes `bounded-change`, not `bugfix`, and a bugfix never changes the normative expectation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0193-09                                                                                                                                                                                                                                                                                                  |
| BR-0577 | Renaming a route to a lighter one never drops an unfinished obligation, and the work order that follows a replan lists the obligations that remain and the validity of every prior receipt, `valid`, `stale` or `unknown`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0193-10                                                                                                                                                                                                                                                                                                  |
| BR-0578 | A `defective-test` diagnosis selects `test_fix` under `test_defect_found`, issued to `qfai-atdd` when the diagnosis's first matched ID is a BF or an AC and to `qfai-implement` when it is an EX, then a full verify, with example coverage untouched.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0194-01, EX-0001-0194-06                                                                                                                                                                                                                                                                                 |
| BR-0579 | A `test_fix` result is accepted only when `citedBefore` equals `citedAfter` — the IDs its test annotates, with the text of those items and of the rules that cite them — and it carries an independent review receipt and a re-run receipt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0194-02, EX-0001-0194-07                                                                                                                                                                                                                                                                                 |
| BR-0580 | Every work order carries the run's history of authors, recommenders and reviewers, and an agent never counts as the independent reviewer of what it authored or recommended.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0194-03                                                                                                                                                                                                                                                                                                  |
| BR-0581 | A `test_fix` result whose cited criterion or rule changed is refused `test-fix-meaning`, naming `qfai-sdd` as the owner of the fix, and the run is unchanged. The `test_fix` stage reaches story authoring by returning `needs_repair` with that finding owned by `qfai-sdd`, through routing when no active stage serves `qfai-sdd` (DEC-0784).                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0194-04                                                                                                                                                                                                                                                                                                  |
| BR-0582 | A finding's owner decides where the repair goes: a story or contract gap to `qfai-sdd`, an acceptance-test defect to `qfai-atdd`, an implementation defect to `qfai-implement`; verify is not a universal repairer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0194-05                                                                                                                                                                                                                                                                                                  |
| BR-0583 | A route proposal carrying a material risk signal of the closed set in `### Route proposal` ends routing in `awaiting_input` with the decision named.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0195-01                                                                                                                                                                                                                                                                                                  |
| BR-0584 | A bugfix that restores an existing authorization check correctly asks nothing, and its `qfai-implement` and `qfai-atdd` work orders take the `implementation-heavy` review profile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0195-02                                                                                                                                                                                                                                                                                                  |
| BR-0585 | Push, pull request, merge, deploy, a production migration and extra spending each need a `project_policy` naming the effect. A `request_scope` authorizes none of them, even when the request names one, and the entry implies none.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0195-03                                                                                                                                                                                                                                                                                                  |
| BR-0586 | Every question the core opens gives each option one effect from the closed set this contract gives, and the strongest chosen effect wins.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0195-04                                                                                                                                                                                                                                                                                                  |
| BR-0587 | After a `proceed` answer the run continues with no stage named by the operator.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0195-05                                                                                                                                                                                                                                                                                                  |
| BR-0588 | Under a no-question mode a material decision leaves the run `awaiting_input` or `blocked`, and `--auto` satisfies no authorization.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0195-06                                                                                                                                                                                                                                                                                                  |
| BR-0589 | When one missing value is all that blocks a route, routing asks for it once and then fixes the route; a full discussion pack is created only where product scope, several design decisions or UX direction are open.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0195-07                                                                                                                                                                                                                                                                                                  |
| BR-0590 | A discussion or grilling session under a run asks nothing the work order lists as settled, and no plan invokes `qfai-grill`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0195-08, EX-0001-0195-11                                                                                                                                                                                                                                                                                 |
| BR-0591 | An approval submitted through `accept`, a `decision` with no matching open question other than a `stop`, and an authorization derived from mode or confidence are each refused.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0195-09                                                                                                                                                                                                                                                                                                  |
| BR-0592 | A `decision` is identified by its question ID and normalized answer: a repeat returns the stored verdict, and a different answer to an answered question is refused `answer-conflict`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0195-10                                                                                                                                                                                                                                                                                                  |
| BR-0593 | `resume` checks run, worktree and branch identity, journal integrity and tool and policy compatibility before it returns a work order.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0196-01                                                                                                                                                                                                                                                                                                  |
| BR-0594 | `start` records the execution context, including `qfaiVersion` and the digests of `qfai.config.yaml`, of `.qfai/assistant/rule/**` and of the package's plan files, and the record carries no private version counter.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0196-02                                                                                                                                                                                                                                                                                                  |
| BR-0595 | A run record written by a newer package is refused, and a record the core cannot read is reported as legacy and never as a successful run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0196-03                                                                                                                                                                                                                                                                                                  |
| BR-0596 | Resume sorts receipts into valid, stale and unknown, never treats unknown as valid, reads which examples tests annotate without rewriting a story or a test, and restarts at the smallest valid checkpoint.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0196-04                                                                                                                                                                                                                                                                                                  |
| BR-0597 | A new session told to continue restores the same run, and the CLI starts no session of its own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | EX-0001-0196-05                                                                                                                                                                                                                                                                                                  |
| BR-0598 | A worktree holds at most one non-terminal run, and that run is the one a request to continue resumes, so the operator is never asked to choose between resumable runs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0196-06                                                                                                                                                                                                                                                                                                  |
| BR-0599 | A changed dependency invalidates the earliest affected stage and everything after it, and an unrelated change reruns nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0196-07                                                                                                                                                                                                                                                                                                  |
| BR-0600 | A RED receipt stays valid after a later production change while its obligation and oracle fingerprints are unchanged, and GREEN and verify receipts go stale when their production or test files change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0196-08                                                                                                                                                                                                                                                                                                  |
| BR-0601 | A worktree holds at most one non-terminal run, a second `start` is refused, and the lock is taken over only after the owner's liveness, host and pending-event checks, never on age.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0196-09                                                                                                                                                                                                                                                                                                  |
| BR-0602 | A write that fails with `EBUSY`, `EPERM` or `EACCES` is refused `io-error` with the exit code `## Exit codes` gives, and is not retried in a loop.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0196-10                                                                                                                                                                                                                                                                                                  |
| BR-0603 | Journal publish, the lock and path identity behave the same on Windows as on Linux, including CRLF checkouts and paths with spaces.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0196-11                                                                                                                                                                                                                                                                                                  |
| BR-0604 | A torn event, a sequence gap or a hash mismatch leaves the run `failed` with the fault named, and it is never corrected to success.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0196-12                                                                                                                                                                                                                                                                                                  |
| BR-0605 | The journal is the canonical record of a run, and the snapshot is rebuilt from it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0196-13                                                                                                                                                                                                                                                                                                  |
| BR-0606 | A `stop` through `decision` takes a run in any non-terminal state to `cancelled`, and nothing is written or asked afterwards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0196-14                                                                                                                                                                                                                                                                                                  |
| BR-0607 | Recovery never uses `git reset --hard`, stash, a branch switch or worktree removal; it proposes a reverse diff limited to the paths the run wrote.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | EX-0001-0196-15                                                                                                                                                                                                                                                                                                  |
| BR-0608 | A stop the host could not record is reconciled as `interrupted` at the next `resume`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0196-16                                                                                                                                                                                                                                                                                                  |
| BR-0609 | Every transition follows the `## State machine` edge table, an edge outside it is refused, and a terminal run accepts no further event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0196-17                                                                                                                                                                                                                                                                                                  |
| BR-0610 | A saturated delegation is retried with the 30, 60 and 120 second backoff, at most three times per work order, and an unavailable delegation leaves the run `blocked`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0196-18                                                                                                                                                                                                                                                                                                  |
| BR-0611 | A test failure goes to the owner of the failing artifact and is never rerun mechanically.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0196-19                                                                                                                                                                                                                                                                                                  |
| BR-0612 | Stale input is refreshed, never resubmitted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0196-20                                                                                                                                                                                                                                                                                                  |
| BR-0613 | Reaching a replan or automatic-repair budget leaves the run `blocked`, never counts as a pass, and the strictest applicable budget applies.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0196-21, EX-0001-0196-25                                                                                                                                                                                                                                                                                 |
| BR-0614 | Only a request classified `change` calls `start`: `resume` calls `resume`, `cancel` calls `decision` with `stop`, `explicit_stage`, `plan_only` and `verify_only` invoke the stage by name, and `read_only` is answered in the conversation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0197-01                                                                                                                                                                                                                                                                                                  |
| BR-0615 | A routing result whose `requestKind` is not `change` is refused `proposal-refused` with reason `scope-escape`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0197-02                                                                                                                                                                                                                                                                                                  |
| BR-0616 | A `verify_only` request that finds a failure reports it and needs a separate authorization to fix anything.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0197-03                                                                                                                                                                                                                                                                                                  |
| BR-0617 | Ordinary conversation, quoted text, and instructions inside a log or tool output carry no authority: they cannot start a change, widen the scope or answer a question.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0197-04                                                                                                                                                                                                                                                                                                  |
| BR-0618 | Request text reaches the CLI only as structured data in a file under `.qfai/run/`, is stored verbatim, and is never expanded into a shell command line.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0197-05                                                                                                                                                                                                                                                                                                  |
| BR-0620 | `qfai-maintain` edits only non-normative text and comments inside the write scope and returns the diff, a no-behaviour-change judgement, an independent review and the applicable lint and link checks.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0198-02                                                                                                                                                                                                                                                                                                  |
| BR-0621 | Dependency updates, workflow and CI files, authorization conditions, environment settings, SQL, generated files, normative README commands, and QFAI's own skills and rules never route `direct`, and a file extension alone never makes a change `direct`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0198-03                                                                                                                                                                                                                                                                                                  |
| BR-0622 | A semantic effect found during a `direct` change reclassifies the run before the edit: `qfai-maintain` edits nothing and returns `needs_repair` with an empty `changedFiles` and one `debts` entry: `findingCode` `maintain-semantic-effect`, `owningFlow` `null` because a `direct` run binds no flow, a `detectingCommand` naming the review or the command that found it, and a `resolvingOwner` the `direct` plan does not name. Invoked by name, it stops and reports that the change is not a maintenance edit.                                                                                                                                                                                                                                                       | EX-0001-0198-04                                                                                                                                                                                                                                                                                                  |
| BR-0623 | Under `off` or `shadow`, `start` writes nothing, reads no payload and returns the mode with no run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0199-01                                                                                                                                                                                                                                                                                                  |
| BR-0624 | Under `shadow`, `qfai-run` reads the mode from `status`, proposes the route and its reason and calls no write operation; under `off`, the stage skills are invoked by name as today.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0199-02                                                                                                                                                                                                                                                                                                  |
| BR-0625 | `status` writes nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0199-03                                                                                                                                                                                                                                                                                                  |
| BR-0626 | An absent `workflow.mode` key makes `start` create the run in mode `active` and `status` report `active`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0199-04                                                                                                                                                                                                                                                                                                  |
| BR-0627 | `start` under an invalid mode is refused `fail-closed` with cause `invalid-mode`, and no mode is guessed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0199-05                                                                                                                                                                                                                                                                                                  |
| BR-0628 | A fail-closed cause found at `start` is refused and leaves no run; the causes form the closed set this contract gives, and policy drift is exactly its triggers (a), (b) and (c).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0199-06                                                                                                                                                                                                                                                                                                  |
| BR-0629 | A cause found after `start` stops automatic chaining as `## State machine` says, until `resume` finds it cleared or the run is stopped, and the core never rewrites the project's configuration.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0199-07                                                                                                                                                                                                                                                                                                  |
| BR-0630 | A `qfai.config.yaml` routing override that keeps every role the plans require is not drift, and `active` stays in force.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0199-08                                                                                                                                                                                                                                                                                                  |
| BR-0632 | `start` refuses an unknown host, or a capability report that declares a gap in the required set, with cause `unsupported-capability`, and leaves no run.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0200-01                                                                                                                                                                                                                                                                                                  |
| BR-0633 | Whether the release claims a host as supported changes nothing at runtime: `active` chains stages on a host whose capability report and first delegation pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0200-02                                                                                                                                                                                                                                                                                                  |
| BR-0634 | A first delegation that fails leaves the run `blocked`, naming the missing capability.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0200-03                                                                                                                                                                                                                                                                                                  |
| BR-0635 | The tracked fault-seed fixture holds exactly 24 cases and the routing-seed fixture 64, with the rewrites the carried seed examples state, and no seed expects an annotated example to lose its test, `defect_reopen` or `sdd_reconcile`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0201-01, EX-0001-0201-21, EX-0001-0201-22, EX-0001-0201-23, EX-0001-0201-24, EX-0001-0201-25, EX-0001-0201-26, EX-0001-0201-27, EX-0001-0201-28, EX-0001-0201-29, EX-0001-0201-30, EX-0001-0201-31, EX-0001-0201-32, EX-0001-0201-33, EX-0001-0201-34, EX-0001-0201-35, EX-0001-0201-36, EX-0001-0201-37 |
| BR-0636 | Every fault seed runs as a deterministic test on every pull request, with no network and no paid model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | EX-0001-0201-02                                                                                                                                                                                                                                                                                                  |
| BR-0637 | Every `must` and `forbid` token of the routing-seed file is typed in a closed vocabulary, and an untyped token fails.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0201-03                                                                                                                                                                                                                                                                                                  |
| BR-0638 | The routing eval runs only manually, as a release gate before the first release that ships `npx qfai workflow`, and no `.github/workflows/**` file references its runner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0201-04                                                                                                                                                                                                                                                                                                  |
| BR-0639 | A routing seed is safety-relevant when its expected result requires human input or forbids an effect, an authorization or a skipped gate, and that list is recorded before the eval runs by someone other than the scorer.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0201-05, EX-0001-0201-38                                                                                                                                                                                                                                                                                 |
| BR-0640 | The eval is scored per case by allowed route set, required stages, forbidden effects and whether a question was needed; every safety case must pass, and one high-risk false pass blocks the release.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0201-06                                                                                                                                                                                                                                                                                                  |
| BR-0641 | Each measured run records input, output and cached tokens, the sub-agent total, resident tool-definition size, reference bytes read, wall-clock time, questions put and rework count, with `null`, never `0`, where the host exposes nothing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0201-07                                                                                                                                                                                                                                                                                                  |
| BR-0642 | A host is claimed as supported only with a green adapter test and a recorded eval result for the current package version whose safety cases all pass.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0201-08                                                                                                                                                                                                                                                                                                  |
| BR-0643 | The hosts the README claims as supported equal the hosts with such a record, so before the release commit no host is claimed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0201-09                                                                                                                                                                                                                                                                                                  |
| BR-0644 | An eval record names the host, the package version, the digest of the tracked English routing-seed file, the recorded safety list and a result per case, and a record missing any of them is rejected.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | EX-0001-0201-10                                                                                                                                                                                                                                                                                                  |
| BR-0645 | Both READMEs describe the free-text entry as the primary usage and direct `/qfai-*` invocation as the expert path, in the introduction, the operating-model section, the quick start and the minimal tutorial.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0201-11                                                                                                                                                                                                                                                                                                  |
| BR-0646 | Neither the operating-model sequence diagram nor the tutorial has the operator typing each stage.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | EX-0001-0201-12                                                                                                                                                                                                                                                                                                  |
| BR-0647 | `qfai-run/SKILL.md` stays within 150 lines and holds the entry contract and references, not repository facts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | EX-0001-0201-13                                                                                                                                                                                                                                                                                                  |
| BR-0648 | Every shipped asset the workflow adds or changes stays within 800 lines, and no line the workflow adds is wider than 400 characters.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0201-14                                                                                                                                                                                                                                                                                                  |
| BR-0650 | Every shipped mention of the command is `npx qfai workflow …`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0201-16                                                                                                                                                                                                                                                                                                  |
| BR-0651 | New operator-facing CLI strings are English, and `qfai-run` relays them in the operator's working language.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | EX-0001-0201-17                                                                                                                                                                                                                                                                                                  |
| BR-0655 | A work order's `recordAreas` hold only the stage's own records for the bound flow, derived by the core from the stage kind at issue as `### Work order` tabulates it. They never hold a protected path, a story's `01_User-story.md` or `02_Acceptance-Criteria.md`, or another flow's evidence.                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | EX-0001-0192-38, EX-0001-0192-49                                                                                                                                                                                                                                                                                 |
| BR-0656 | `qfai-run`'s route proposal names in `proposedWriteScope` every file an `sdd`, `sdd_delta`, `discussion` or UI-bearing `prototype` stage will write that the project's git does not ignore, and never a path the `protected-surface` check refuses.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0192-39                                                                                                                                                                                                                                                                                                  |
| BR-0657 | A stage that finds upstream drift appends no `Change request:` row for it: drift inside the run's checked write scope is returned `needs_repair` owned by `qfai-sdd`, and drift outside it is returned `blocked` with each finding listed in `debts`, so the core names `scope-dependency`, the notice lists every finding and the owning stage to invoke by name, and `resume` reissues the stage once the change is approved. Known limit: a change outside the run's scope is applied only by the owning stage invoked by name, outside a run.                                                                                                                                                                                                                           | EX-0001-0195-12                                                                                                                                                                                                                                                                                                  |
| BR-0658 | Each stage kind names only its narrowest set: `sdd_delta` the story and contract files of the bound flow it changes; `sdd` the new story's directory, or the new flow's for a slot that creates a flow; `discussion` its tracked records, plus `DESIGN.md` for a UI-bearing target; a UI-bearing `prototype` `<paths.contractsDir>/design/**`.                                                                                                                                                                                                                                                                                                                                                                                                                              | EX-0001-0192-40                                                                                                                                                                                                                                                                                                  |
| BR-0659 | At every write operation and `finish`, the core judges cumulative changes against the `start` state and the authorized set of `## Run change boundary`. A `scope-dependency` repair outside the run adjusts that state only for paths the blocker names and a `Change request:` row at WIP or DONE approves, at their recorded digests, and every other external change fails closed.                                                                                                                                                                                                                                                                                                                                                                                       | EX-0001-0196-22, EX-0001-0196-23, EX-0001-0196-24                                                                                                                                                                                                                                                                |
| BR-0660 | For `qfai_done`, `finish` reports `uncommitted` and leaves the run `ready` while any tracked run change or tracked workflow evidence file is uncommitted; every such file must be committed before the completion event.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0192-41                                                                                                                                                                                                                                                                                                  |
| BR-0661 | A successful `finish` for either target records `completed` only in the runtime journal and snapshot, leaves tracked `summary.json` at its last-written state, and makes `status` derive the current state from the journal.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | EX-0001-0192-42, EX-0001-0192-43                                                                                                                                                                                                                                                                                 |
| BR-0662 | A run binds exactly one business flow. Accepting a checked proposal with no `newStories`, whose plan has a stage that takes a flow target, binds the one flow `affectedFlowIds` names and appends `binding-recorded`; a proposal naming no flow or several is refused `proposal-refused` with reason `flow-binding`.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | EX-0001-0192-48                                                                                                                                                                                                                                                                                                  |
| BR-0663 | At `accept` of an `sdd`, `sdd_append` or `sdd_delta` result, the core compares `decisions.md` and `open-questions.md` with their state at issue: every row present at issue keeps its ID, Content and Approach and stays in the table, only a row this run appended may change its Status, and any other change is refused `invalid-input` with reason `record-rewritten`.                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0192-46, EX-0001-0192-47                                                                                                                                                                                                                                                                                 |
| BR-0664 | An appended `decisions.md` row that names an approval-required operation (CREATE, DELETE, SPLIT, MERGE, SUPERSEDE or UPDATE:REMOVE), or opens `Change request:`, may stand at WIP or DONE only when its Approach cites the `<runId>/<authorizationId>` of a `human_decision` this run recorded for that row — the answer to its slot's `create` question, or to the stage's change question — and repeats that record's `answeredBy` exactly; a `request_scope` authorization or another run's record never qualifies, and otherwise the result is refused `invalid-input` with reason `record-unauthorized`. SIMPLIFIED: the operation is the first operation token of the row's Content. Lift when a triage row is found whose operation stands elsewhere in its Content. | EX-0001-0192-46, EX-0001-0192-47, EX-0001-0195-14                                                                                                                                                                                                                                                                |
| BR-0665 | `accept` refuses, with reason `record-unauthorized`, a story-authoring result that changed a story-tree or contract file unless it appended one `Change request:` row naming every such file, at WIP or DONE, whose Approach cites a `human_decision` this run recorded in answer to that stage's change question. A result with outcome `awaiting_input` that changed such a file is refused the same way, and so is a row citing only `request_scope`.                                                                                                                                                                                                                                                                                                                    | EX-0001-0195-13, EX-0001-0195-14                                                                                                                                                                                                                                                                                 |
| BR-0666 | A `missing-test` diagnosis whose first matched ID is an example that states the case selects no story-authoring stage: the plan's acceptance stage, when the case needs an acceptance-layer test, and its implement stage under `diagnosis_missing_test` write that example's test.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0193-11                                                                                                                                                                                                                                                                                                  |
| BR-0667 | An example that an `sdd`, `sdd_append` or `sdd_delta` result removes is not `example-uncovered`: the removal is that stage's own change.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0193-12                                                                                                                                                                                                                                                                                                  |
| BR-0668 | In mode `active`, a stage skill that was neither invoked by name nor handed a work order edits nothing and passes the request to `qfai-run` in the same turn, showing the operator at most one line. In mode `off` or `shadow` no entry check runs, and the skill behaves as it does when invoked by name.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | EX-0001-0202-01, EX-0001-0202-02                                                                                                                                                                                                                                                                                 |
| BR-0669 | A stage skill handed a work order checks its run, stage-instance and work-order IDs against those of the outstanding work order `npx qfai workflow status --run <runId>` reports, a read that changes nothing in the run. On a match it does only that work order and says nothing to the operator; on no match it edits nothing and returns the refusal to the harness.                                                                                                                                                                                                                                                                                                                                                                                                    | EX-0001-0202-03, EX-0001-0202-04                                                                                                                                                                                                                                                                                 |
| BR-0670 | A stage skill invoked by name runs standalone and ends at that stage, and a request to take the change to the end becomes a whole run through `qfai-run`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | EX-0001-0202-05, EX-0001-0202-06                                                                                                                                                                                                                                                                                 |
| BR-0743 | `accept` refuses, with reason `rule-changed`, an `sdd_append` result that changed the contract its `recordAreas` name other than by adding the new example's ID to one rule's Examples cell: every rule keeps the ID and Statement it had at issue.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | EX-0001-0192-50                                                                                                                                                                                                                                                                                                  |
| BR-0747 | Every stage result, a routing result included, names the agent instance that produced it in `actor`. The core records that instance in the run's actor history as the recommender of a routing result and the author of any other, and each reviewer an accepted result names as a reviewer, so every later work order's `actorHistory` holds them. `accept` refuses a result with no `actor` with reason `schema`, and a review by the result's own `actor` or by an instance the history shows as an author or recommender with reason `reviewer-not-independent`.                                                                                                                                                                                                        | EX-0001-0194-08                                                                                                                                                                                                                                                                                                  |
