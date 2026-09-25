# CLI Contract: `qfai workflow`

- Contract scope: the `npx qfai workflow` command surface — seven operations,
  their input and output, the run state machine and the final gate — and the
  operator-facing screens of the free-text entry that are built on it
- Owning spec: `spec-0018`
- Used-by: `spec-0003` (init installs the plans and the entry directive),
  `spec-0004` (validate resolves a triage row's authorization), `spec-0013`
  (`/qfai-sdd` Stage 1 and defect row seeding), `spec-0014` (`/qfai-verify`
  receipts)
- SSOT modules:
  - `packages/qfai/src/cli/lib/args.ts` (flag parser; `--in` and `--root` keep
    their meaning, `--run` is added)
  - `packages/qfai/src/cli/lib/exitCodes.ts` (`EXIT_CODES`; this surface adds no
    code)
  - `packages/qfai/src/core/gitChanges.ts` (the read-only git access the core
    reuses)
  - `packages/qfai/src/core/validate.ts` (`validateProject()`, which `start` and
    `finish` call in process)
- Modules this surface adds: the `workflow` command under
  `packages/qfai/src/cli/commands/` and the control core under
  `packages/qfai/src/core/workflow/`. The SSOT modules list names only files on
  disk, because `QFAI-CONTRACT-050` fails on any other.
- Companion contracts:
  - `.qfai/contracts/cli/workflow-files.schema.md` (CLI-WFFILE) — the run trees,
    the tracked evidence, the authorization record, the plan files and the
    shipped schemas
  - `.qfai/contracts/cli/qfai-init.md` (CLI-INIT) — what `qfai init` installs
    for this surface, and its mode line
  - `.qfai/contracts/cli/qfai-validate.md` (CLI-VAL) — the triage authorization
    check and the mode config issue

Each section ends with a `Realizes:` line naming the requirements of
`discussion-20260923171450572` it states. A requirement named nowhere here or in
a companion contract is a `spec-0018` business rule.

## Command line

`workflow` is a known command. It has exactly seven operations, and there is no
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
  `.qfai/runs/`. The `start` payload is written to `.qfai/runs/inbox/<name>.json`
  and every later payload to `.qfai/runs/<runId>/inbox/<name>.json`. Anything
  else is refused `invalid-input` with reason `in-path`. There is no stdin
  input and no inline JSON argument.
- The core copies the request into `request.private.json` and leaves the inbox
  file in place, so a retry after a lost response re-reads the same path.
- An unknown operation, an eighth operation name, `exec` and an unknown flag are
  refused through the existing parser, exit 2, with the JSON error document of
  [Output](#output) on stdout.
- `npx qfai workflow --help` prints the seven operations, one line each, as text.
  It is the one invocation whose stdout is not a JSON document.

Realizes: `discussion-20260923171450572#REQ-0014`,
`discussion-20260923171450572#REQ-0022`, `discussion-20260923171450572#REQ-0023`,
`discussion-20260923171450572#NFR-0013`, `discussion-20260923171450572#NFR-0014`,
`discussion-20260923171450572#NFR-0016`.

## Modes

The mode in force is `workflow.mode` in `qfai.config.yaml`: `active`, `shadow`
or `off`. An absent key means `active`. The key, and the config issue an invalid
value raises, are in CLI-INIT and CLI-VAL.

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

Realizes: `discussion-20260923171450572#REQ-0059`.

## Operations

### `start`

1. Reads the mode. Under `shadow` or `off` it returns as [Modes](#modes) says.
2. Takes the lock and scans `.qfai/runs/` for directories named
   `run-<17 digits>`, and nothing else. A non-terminal run is refused
   `run-active`, naming that run and its state. A run written by a newer package
   is refused `newer-record`.
3. Parses the start input and checks the capability report.
4. Recomputes triggers (b) and (c) of [Fail-closed](#fail-closed) with the module
   `qfai init` also uses, and never reads the conflict list init recorded.
5. Runs `validateProject()` in process, profile `full`, the whole project and the
   project's `failOn`, and keeps each finding identity as the `cli_observed`
   baseline of [Completion](#completion).
6. Fixes the tool and policy for the run: the package version as `qfaiVersion`,
   the digest of the running CLI entry file, the digests of the watched paths, and
   the git identity (branch, worktree real path, `HEAD`). It snapshots the
   tracked index and working tree and the nonignored untracked paths as the
   [run change boundary](#run-change-boundary) defines.
7. Creates `.qfai/runs/<runId>/` without `recursive`. On `EEXIST` it takes the
   next millisecond. It copies the request, publishes `run-created` and
   `capture-request`, and returns the run in state `routing`.

A check that fails before step 7 leaves no run directory behind. `start` starts
no AI and spawns no process.

### `next`

- In `routing`, returns the routing work order. Its executor is `qfai-run`.
- In `ready`, issues the next work order of the plan and moves the run to
  `running`. Before issuing an SDD work order for a new capability, it checks
  that the matching CREATE `human_decision` has a persisted `authorizationId`.
  If the ID is missing, it moves the run to `awaiting_input` with a new
  `create` question for that slot, returns no work order and emits no
  `work-order-issued` event. When every stage of the plan is accepted, it
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
4. The payload checks of [Stage result](#stage-result), then the guards of
   [State machine](#state-machine).
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
byte the same before and after. It takes no lock and ignores unpublished temporary
files. The journal, not tracked `summary.json`, supplies the current state. It
reports the current stage and work order, the open questions as stored, the cause
or blocker with its owner, the debts and the mode in force. A terminal run
reports its terminal state.

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
4. Ledger state is reconciled by the ledger owner's rules and never rewritten to
   match the run.
5. The edges of [State machine](#state-machine) that `resume` fires are applied.
6. It returns the classed receipts and the work order `next` would return from
   the smallest valid checkpoint.

`resume` never starts a host session.

### `finish`

The only operation that judges completion. See [Completion](#completion).

Realizes: `discussion-20260923171450572#REQ-0015`,
`discussion-20260923171450572#REQ-0016`, `discussion-20260923171450572#REQ-0017`,
`discussion-20260923171450572#REQ-0018`, `discussion-20260923171450572#REQ-0019`,
`discussion-20260923171450572#REQ-0020`, `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0027`, `discussion-20260923171450572#REQ-0030`.

## Payloads

Field names are exact. An unknown key in any payload is refused `invalid-input`
with reason `schema`. Paths are project-relative and use `/`. The shipped schemas
that encode these payloads are named in CLI-WFFILE.

### Start input

| Field              | Content                                                                           |
| ------------------ | --------------------------------------------------------------------------------- |
| `request`          | `{ text }`, the request as the operator wrote it. Stored only in the runtime tree |
| `completionTarget` | `qfai_done`, or `working_tree` when the operator said not to commit               |
| `harness`          | `{ host, capabilities }`, the capability report                                   |

### Execution context

The run records it in `snapshot.json`: the run ID; `qfaiVersion`; the digests of
the policy, the manifests and the plans; the harness and its reported
capabilities; the request digest; the normalized goal; the request kind; the
scope; the spec binding; the allowed effects; the current stage instance, attempt
and work order; the dependency snapshot; the budgets used; and the history of
authors, recommenders and reviewers. It carries no private version counter and no
`schemaVersion`.

### Route proposal

The `proposal` of a routing result.

| Field                  | Content                                                                                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requestKind`          | `change`, `read_only`, `plan_only`, `verify_only`, `resume`, `cancel` or `explicit_stage`                                                                                                |
| `candidateRoute`       | `direct`, `bugfix`, `bounded-change`, `feature`, `discovery`, or `null` for a kind other than `change`                                                                                   |
| `goal`                 | The goal in one sentence                                                                                                                                                                 |
| `expectedBehaviorRefs` | Tagged normative references: `request`, `spec-id`, `contract-id` or `path`                                                                                                               |
| `observedRefs`         | Tagged observed references: `path` for code or files and `evidence` for test or log artifacts; kept apart from normative references                                                      |
| `affectedSpecIds`      | Spec IDs                                                                                                                                                                                 |
| `riskSignals`          | Members of `data-loss`, `breaking-public-contract`, `authorization-loosened`, `authorization-restored`, `secret-egress`, `production-effect`, `requirement-dropped`, `out-of-scope-work` |
| `unresolvedQuestions`  | Question inputs ([Questions and decisions](#questions-and-decisions))                                                                                                                    |
| `newCapabilities`      | `{ goal, covers, excludes, evidence }` per capability the plan needs and no spec owns                                                                                                    |
| `proposedWriteScope`   | Write areas: project-relative paths or globs                                                                                                                                             |
| `protectedTargets`     | Paths the run must not write                                                                                                                                                             |
| `requiredStages`       | Stage kinds, in plan order                                                                                                                                                               |
| `rationale`            | A short auditable reason, never a transcript                                                                                                                                             |
| `confidence`           | Optional number. Advisory; it lifts no gate                                                                                                                                              |

Each reference is exactly `{ kind, ref }`, with a nonempty string `ref` and a
closed `kind`. `request` has `ref: "request"`; `spec-id` names a canonical
`spec-NNNN`; `contract-id` names a contract ID in the contract index.
`path` and `evidence` name project-relative file paths, without a glob or
root escape. `evidence` is observed-only and is checked as a path, so naming
a missing test or log cannot bypass `unknown-path`. A `kind` allowed in
one reference array is not inferred from the spelling of `ref` or from an
observer fact. A bare string or an unknown or disallowed `kind` is refused
`invalid-input` with reason `schema` before proposal checks. There is no
legacy string fallback. The checked plan retains both typed arrays separately.

The core checks the proposal and refuses it `proposal-refused`, listing every
failed check in `reasons[]`:

| Reason                | Refused when                                                                                                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unknown-path`        | A `path` or `evidence` reference has no current path-existence fact or that fact is false; the reason names the exact `ref`                                                                                                                    |
| `unknown-id`          | A `spec-id` or `contract-id` reference resolves to nothing                                                                                                                                                                                     |
| `inactive-spec`       | An affected spec's lifecycle is not active                                                                                                                                                                                                     |
| `broken-reference`    | An item reference inside an existing spec or contract resolves to nothing                                                                                                                                                                      |
| `protected-surface`   | A write area lies inside `.git/`, `.qfai/runs/`, `.qfai/evidence/workflow/`, `.qfai/decisions/` or `.qfai/evidence/decisions/`, matches `.qfai/evidence/change-request-*.md` or `.qfai/evidence/decision-*.md`, or overlaps a protected target |
| `scope-escape`        | A write area resolves outside the project root, or `requestKind` is not `change`                                                                                                                                                               |
| `unresolved-approval` | A risk signal needing the operator is neither answered nor opened as a question                                                                                                                                                                |
| `stage-set`           | `requiredStages` omits a stage the plan runs `always`, omits `verify` on a change route, or names a stage the plan lacks                                                                                                                       |

No write area can name an authoritative authorization or decision record: the
`protected-surface` paths are closed to the proposal and to `recordAreas` alike.
An approved Change Request is applied by the owning skill invoked by name,
outside a run, because applying it writes the protected record's `Applied at`.
Approval cells copied into a spec's `09_delta.md` are not authorization records.

A checked proposal becomes the run's plan. Its write scope is the
`request_scope` authorization. `authorization-restored` asks nothing and raises
the review profile of the run's `qfai-implement` and `qfai-atdd` work orders to
`implementation-heavy`, as [Work order](#work-order) states.

### Work order

| Field                                                | Content                                                                                                                                                                                                                           |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runId`, `workOrderId`, `stageInstanceId`, `attempt` | Identity. `workOrderId` is stable until a result for it is accepted                                                                                                                                                               |
| `stageKind`, `operation`                             | From the plan. One fixed operation per work order                                                                                                                                                                                 |
| `executor`                                           | `{ skill }`                                                                                                                                                                                                                       |
| `target`                                             | `{ kind: "spec", specId }` or `{ kind: "new_capability", slotId }`. Absent from the `route` and `discussion` work orders, which bind no spec and no new capability; never absent from any other                                   |
| `scope`                                              | `{ digest, writeAreas, protectedTargets, allowedEffects, nonGoals }`                                                                                                                                                              |
| `recordAreas`                                        | The stage's own records for the bound spec, which the core derives from the stage kind, as below. Held apart from `scope`: `scope.digest` covers `scope` only, and the announcement shows `scope` only                            |
| `inputs`                                             | `{ path, digest }` per input                                                                                                                                                                                                      |
| `ledger`                                             | `{ specId, rowIds, rowSetDigest }`. Row IDs only; the run never copies a row's status                                                                                                                                             |
| `checkpointRef`, `parentWorkOrderId`                 | Where a long stage resumes, and the acceptance work order a seam-only order returns to                                                                                                                                            |
| `requiredGates`, `requiredReviewerRoles`             | Gate IDs and reviewer roles                                                                                                                                                                                                       |
| `actorHistory`                                       | Every author, recommender and reviewer the run has recorded                                                                                                                                                                       |
| `authorizationRefs`                                  | What authorizes the work                                                                                                                                                                                                          |
| `priorStageReceiptRefs`                              | `{ ref, validity }` per receipt the work builds on, `validity` one of `valid`, `stale`, `unknown`. After a replan they show which receipts stay valid and which went stale, and `ledger.rowIds` names the obligations that remain |
| `settled`                                            | The checked proposal's routing result ID, and every answered question as `{ questionId, text, chosen }`, `chosen` the option labels or the value. Runtime only: the tracked summary copies none of it                             |
| `expectedSequence`                                   | The sequence the result must carry                                                                                                                                                                                                |

`recordAreas` holds the records a stage is defined to write for the spec its work
order binds. Each is named for that spec, never as a pattern over every spec:

| Stage kind                                                               | `recordAreas`                                                                                                       |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `implement`, `regression_fix`, and `test_fix` served by `qfai-implement` | The bound spec's `tdd/test-list.md`; `.qfai/evidence/implement-<specId>.md`                                         |
| `acceptance`, and `test_fix` served by `qfai-atdd`                       | The bound spec's `tdd/test-list.md`; `.qfai/evidence/atdd-<specId>.md`; `.qfai/evidence/coverage-depth-<specId>.md` |
| `sdd_append`                                                             | The bound spec's `tdd/test-list.md`, `06_Test-Cases.md` and `09_delta.md`; `.qfai/evidence/sdd-<specId>.md`         |
| `prototype`                                                              | `.qfai/evidence/prototyping/grilling.md`, only when the target is UI-bearing; none otherwise                        |
| Every other kind                                                         | None: its writes are the checked scope or git-ignored output                                                        |

- `recordAreas` never holds a path the `protected-surface` check of
  [Route proposal](#route-proposal) closes, including authoritative
  authorization and decision records and `.qfai/evidence/workflow/`. Nor does
  it hold a spec pack's
  `01` to `05`, `07`, `08` or `10`: a stage that needs one of those names it
  in the proposal's write scope, where the operator sees it.
- For `sdd_append` this refuses any change to an AC or a BR with `write-scope`,
  which is how DR-0297's "AC and BR do not change" is enforced.
- `recordAreas` lifts no ledger check: a move off `done` and a row added by any
  stage but `sdd_append` are still refused ([Ledger row-set check](#ledger-row-set-check)).

`requiredReviewerRoles` are the `always_required` reviewers of the review profile
`.qfai/assistant/manifest/agent-routing.yml` gives the executor skill, as
`.qfai/assistant/manifest/review-profiles.yml` defines it. In a run whose routing
result carries `authorization-restored`, a work order whose executor is
`qfai-implement` or `qfai-atdd` takes the `implementation-heavy` profile
instead: `completion-reviewer`, `qa-gatekeeper` and `implementation-reviewer`.
Every other work order keeps its skill's profile.

`scope.allowedEffects` holds each external effect the stage declares in its
plan (CLI-WFFILE `### Format`, `stages[].effects`) that the run's
`project_policy` authorization also names. An effect the stage declares and no
`project_policy` names is left out. The stage runs without it, the core performs
no external effect itself, and the completion report lists the effect as not
requested.

An orchestrated `/qfai-sdd` work order always carries a target, so a missing
target never means every capability. A valid binding satisfies
`/qfai-implement`'s hard-required `primarySpecId`.

## Run change boundary

`start` fixes the branch, worktree real path and `HEAD`. It also records the
starting state of each dirty tracked path in the index and working tree, and
each nonignored untracked path, including its path, file type, mode and digest.
The core compares current path content, type and mode with that starting state.
It includes commits since `start` by comparing the current `HEAD` with the
fixed `HEAD`, as well as current index, working-tree and nonignored untracked
changes. Committing a path already dirty at `start` without changing its
content, type or mode does not make it a run change.

For that cumulative comparison, the authorized set is the union of all issued
work orders' `scope.writeAreas` and `recordAreas`, plus the core's own tracked
`.qfai/evidence/workflow/<runId>/` tree. The core evidence tree grants no stage
write permission. A stage result's `changedFiles` remains limited to that work
order's `scope.writeAreas` and `recordAreas`; it cannot list the core evidence
tree or another work order's areas as its own change.

When a `scope-dependency` blocker is repaired outside the run, `resume` admits
only the approved Change Request's authoritative record and changed paths named
by that blocker's findings and authorized by the Change Request. It records
each admitted path and its current digest as a bounded adjustment to the
starting state, while retaining the original snapshot for audit. It rechecks
the approval, paths and digests on later `resume` calls and at `finish`. A
missing approval, a different digest or any other out-of-scope change fails
closed until the scope is replanned and authorized. The same adjusted starting state
and authorized set govern `finish`.

Realizes: `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0030`, `discussion-20260923171450572#REQ-0032`,
`discussion-20260923171450572#REQ-0061`.

### Stage result

| Field                                                           | Content                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resultId`                                                      | Chosen by the harness; 1 to 64 characters of `[A-Za-z0-9._-]`. The idempotency key                                                                                                                                                                                                            |
| `workOrderId`, `stageInstanceId`, `attempt`, `expectedSequence` | Must name the outstanding work order                                                                                                                                                                                                                                                          |
| `outcome`                                                       | `accepted`, `accepted_with_debt`, `needs_repair`, `awaiting_input`, `blocked` or `unrun`                                                                                                                                                                                                      |
| `testObservation`                                               | `pass`, `expected_red`, `fail`, `unrun` or `not_applicable`. Reported apart from `outcome`                                                                                                                                                                                                    |
| `changedFiles`                                                  | `{ path, digest }` for each path this stage changed that git does not ignore. Each must lie in this work order's `scope.writeAreas` or `recordAreas`                                                                                                                                          |
| `artifactRefs`                                                  | `{ path, digest }` each. A file the stage wrote that git ignores, such as a report or a review record, is named here: it is not a changed file and is outside the `write-scope` check. Its real path must lie under the project's real root and name a regular file                           |
| `gateResults`                                                   | `{ gateId, verdict }` each. No command ID                                                                                                                                                                                                                                                     |
| `reviewResults`                                                 | `{ role, agentInstance, verdict, reportRef }` each                                                                                                                                                                                                                                            |
| `debts`                                                         | `{ findingCode, path, cause, owningSpec, detectingCommand, resolvingOwner, blockingExtent }` each. `resolvingOwner` is a skill a built-in plan names, or `operator`                                                                                                                           |
| `questions`                                                     | Question inputs, with `outcome: awaiting_input`                                                                                                                                                                                                                                               |
| `notRun`                                                        | `{ kind: "not_applicable", reason }` or `{ kind: "reused", receiptRef }`                                                                                                                                                                                                                      |
| `red`                                                           | `{ testId, failureKind }`, `failureKind` one of `assertion`, `collection`, `import`, `startup`, `timeout`                                                                                                                                                                                     |
| `seam`                                                          | `{ targetTestId, observation }` on a seam-only result                                                                                                                                                                                                                                         |
| `seamRequest`                                                   | `{ targetTestId }` on an acceptance result that needs a seam first                                                                                                                                                                                                                            |
| `testFix`                                                       | `{ citedBefore, citedAfter, reviewRef, rerunRef }` on a `test_fix` result                                                                                                                                                                                                                     |
| `regressionFix`                                                 | `{ testId, rerunRef, reviewRef }` on a `regression_fix` result: the GREEN re-run of the same test and its independent review                                                                                                                                                                  |
| `diagnosis`                                                     | `{ verdict, reproductionRef, matchedRowIds }`, `verdict` one of `missing-test`, `defective-test`, `regression`, `expectation-differs`. `matchedRowIds` names the ledger rows the next work order binds. The cause candidates and the impact are content of the record `reproductionRef` names |
| `bindings`                                                      | `{ slotId, capabilityId, specId }` per new capability SDD created                                                                                                                                                                                                                             |
| `delegation`                                                    | `{ status, attempt }`, `status` `saturated` or `unavailable`                                                                                                                                                                                                                                  |
| `measurement`                                                   | Tokens in, out and cached; the total over every sub-agent; resident tool-definition size; reference bytes read; wall-clock time; questions put; rework count. Each a number or `null` when the host does not expose it, never `0` in its place                                                |
| `proposal`                                                      | On a routing result only                                                                                                                                                                                                                                                                      |

`accept` refuses a result `invalid-input`, naming each failed check in
`reasons[]`:

| Reason                     | Refused when                                                                                                                                                                                                                                                                                 |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `schema`                   | The payload does not parse, has an unknown key, or tries to carry an authorization                                                                                                                                                                                                           |
| `work-order`               | The result names a work order other than the outstanding one                                                                                                                                                                                                                                 |
| `result-id-reused`         | The result ID is recorded with a different payload digest                                                                                                                                                                                                                                    |
| `digest-mismatch`          | A submitted digest differs from the core's own of the file                                                                                                                                                                                                                                   |
| `write-scope`              | A changed file lies in neither `scope.writeAreas` nor `recordAreas`. A diagnose-only work order has neither                                                                                                                                                                                  |
| `unbound-capability`       | The result creates a capability or spec that no approved slot is bound to                                                                                                                                                                                                                    |
| `red-not-assertion`        | `expected_red` with a failure kind other than `assertion`. Such a failure is `unrun` or `blocked`                                                                                                                                                                                            |
| `seam-passed`              | A seam-only result observes `pass` at its target test                                                                                                                                                                                                                                        |
| `test-fix-meaning`         | `citedAfter` differs from `citedBefore`. The fix belongs to `qfai-sdd`, and the run is unchanged. The `test_fix` stage reaches SDD by returning `needs_repair` with a finding whose `resolvingOwner` is `qfai-sdd`                                                                           |
| `test-fix-receipt`         | A test fix without its review or re-run receipt                                                                                                                                                                                                                                              |
| `regression-fix-receipt`   | A regression fix without its `regressionFix` re-run or review receipt                                                                                                                                                                                                                        |
| `blocked-repairable`       | A `blocked` result lists a finding the run can repair: one inside the checked write scope whose `resolvingOwner` is a skill, or one whose `owningSpec` names no spec, or claims another spec while its `path` lies inside the checked write scope. Such a finding is returned `needs_repair` |
| `reviewer-not-independent` | A reviewer instance is in the actor history as the author or recommender of what it reviewed                                                                                                                                                                                                 |
| `ledger-done-moved`        | A bound ledger row moved off `done` ([Ledger row-set check](#ledger-row-set-check))                                                                                                                                                                                                          |
| `ledger-row-added`         | A ledger row was added by a stage other than `sdd_append`                                                                                                                                                                                                                                    |
| `debt-owner-missing`       | A debt without a resolving owner                                                                                                                                                                                                                                                             |
| `skip-unexplained`         | A stage not run with no reason                                                                                                                                                                                                                                                               |
| `reuse-stale`              | A reuse whose receipt is not `valid`                                                                                                                                                                                                                                                         |
| `authorization-kind`       | An authorization of a kind other than the three, or one derived from mode or confidence                                                                                                                                                                                                      |

The core never judges whether a rewritten assertion changes what a test means.
The independent review does.

A `delegation` of `saturated` keeps the work order outstanding as a new attempt
and returns `retry: { attempt, nextDelaySeconds }`. The core never sleeps.

A `needs_repair` result lists the findings to repair in `debts`, with the same
fields, and the core routes each finding to its `resolvingOwner`. These entries
are routing data, not open debts of the run: only the debts of an `accepted` or
`accepted_with_debt` result count toward `debt-open` at `finish`. The re-run of
the stage that detected a finding is what shows it repaired.

A `blocked` result lists what blocks it in `debts`, with the same fields. These
entries are routing data too, never debts of the run. A finding inside the
checked write scope may appear on a `blocked` result only with `resolvingOwner`
`operator`. A finding owned by a skill there is
repairable, and `accept` refuses the result with reason `blocked-repairable`. A
finding's `owningSpec` must name a spec that exists, and one naming another spec
must have its `path` outside the checked write scope, or the result is refused
the same way. How the core names the blocker is in
[State machine](#state-machine).

An acceptance result that cannot reach its assertion carries
`seamRequest: { targetTestId }` with outcome `needs_repair`. The core issues a
seam-only work order to `qfai-implement` whose `parentWorkOrderId` names the
acceptance work order, and once that result is accepted it returns to the same
acceptance stage instance as a new attempt. The round trip stays inside the run.

A `blocked` or `unrun` seam-only result blocks the run as any result does, and
the parent acceptance attempt stays open. Once `resume` clears the cause, `next`
reissues the seam-only work order as a new attempt. A `needs_repair` seam-only
result routes by its `debts`, as any `needs_repair` result does.

Realizes: `discussion-20260923171450572#REQ-0004`,
`discussion-20260923171450572#REQ-0011`, `discussion-20260923171450572#REQ-0012`,
`discussion-20260923171450572#REQ-0013`, `discussion-20260923171450572#REQ-0025`,
`discussion-20260923171450572#REQ-0034`, `discussion-20260923171450572#REQ-0035`,
`discussion-20260923171450572#REQ-0036`, `discussion-20260923171450572#REQ-0037`,
`discussion-20260923171450572#REQ-0038`, `discussion-20260923171450572#REQ-0039`,
`discussion-20260923171450572#REQ-0040`,
`discussion-20260923171450572#REQ-0045`, `discussion-20260923171450572#REQ-0047`,
`discussion-20260923171450572#REQ-0048`, `discussion-20260923171450572#NFR-0004`.

## Questions and decisions

The core opens every question. A question input from a routing or stage result
becomes a stored question the core names:

| Field            | Content                                                                                                         |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| `questionId`     | Minted by the core                                                                                              |
| `kind`           | `decision`, `fact` or `create`                                                                                  |
| `text`           | Stored as `qfai-run` put it to the operator, and returned verbatim by `status` and `next`                       |
| `options`        | `{ optionId, label, description, effect }` each, `effect` one of `proceed`, `replan`, `stop`                    |
| `selection`      | `{ min, max }`, how many options may be chosen                                                                  |
| `recommendation` | An `optionId`, on a `decision` or `create` question only. A `fact` question carries none                        |
| `effect`         | On a `fact` question with no options: the effect of any value                                                   |
| `capability`     | On a `create` question: `{ goal, covers, excludes }` as the question showed it, and the `slotId` the core mints |

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

Realizes: `discussion-20260923171450572#REQ-0008`,
`discussion-20260923171450572#REQ-0009`, `discussion-20260923171450572#REQ-0018`,
`discussion-20260923171450572#REQ-0028`, `discussion-20260923171450572#REQ-0032`,
`discussion-20260923171450572#REQ-0039`, `discussion-20260923171450572#REQ-0042`.

## Authorizations

| Kind             | Recorded when                                               | Satisfies                                                       |
| ---------------- | ----------------------------------------------------------- | --------------------------------------------------------------- |
| `request_scope`  | The routing result is accepted and its plan checked         | The normal change the request allowed, within the checked scope |
| `human_decision` | `decision` records an answer                                | The question it answers, and only that                          |
| `project_policy` | The project adopted a policy, referenced by path and digest | An external effect the policy names                             |

- Each records `capture`: `host_observed` or `agent_captured`. No producer of
  `host_observed` exists, so every record the core writes is `agent_captured`, and
  a submitted `host_observed` is recorded as `agent_captured`.
- `mode`, a confidence value and an agent-written approval are not
  authorizations.
- An `ask-user` item of a skill's Default Autopilot Policy is satisfied only by a
  `human_decision` answering it. A `hard-required` input is satisfied by
  `request_scope` or by the run's binding. An `auto-decide` item needs none.
  `--auto` satisfies nothing.
- Push, pull request, merge, deploy, a production migration and extra spending
  each need a `project_policy` naming the effect. A `request_scope` authorizes
  none of them, even when the request names one.
- A routing-time CREATE approval is a `human_decision` bound to a
  `new_capability` slot. It is stale when the scope digest it was given under
  changes, when the approved capability text changes, or when a replan widens the
  scope. It never goes stale by the clock. The scope digest leaves out the IDs
  SDD binds, so binding the created spec does not make it stale.
- An apparent CREATE approval with the right slot and `proceed` effect but no
  persisted `authorizationId` does not authorize SDD dispatch. At issue time,
  the core opens a new `create` question for that slot and moves the run from
  `ready` to `awaiting_input`; it issues no SDD work order. SDD Stage 1 does
  not ask the question again.
- The core judges staleness when it issues and when it accepts an SDD work order.
  A stale approval sends the run to `awaiting_input` with a new `create`
  question. `/qfai-sdd` Stage 1 judges it too, before it persists any triage row.
  The validator does not.
- When the SDD result reports `bindings`, the core appends a binding event and
  writes the binding into the tracked summary.

The record's fields and where it is tracked are in CLI-WFFILE.

Realizes: `discussion-20260923171450572#REQ-0010`,
`discussion-20260923171450572#REQ-0013`, `discussion-20260923171450572#REQ-0041`,
`discussion-20260923171450572#REQ-0042`, `discussion-20260923171450572#REQ-0044`.

## State machine

States: `created`, `routing`, `ready`, `running`, `awaiting_input`, `blocked`,
`interrupted`, `completed`, `cancelled`, `failed`. The last three are terminal and
take no further event.

| From                     | To               | Event                               | Fired by                                                                                                                               |
| ------------------------ | ---------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `created`                | `routing`        | `capture-request`                   | `start`; or `resume`, for a run a crash left in `created`                                                                              |
| `routing`                | `ready`          | `plan-accepted`                     | `accept` of a routing result whose proposal is checked and opens no question                                                           |
| `routing`                | `awaiting_input` | `unsettled-material-input`          | `accept` of a routing result with unresolved questions or new capabilities                                                             |
| `routing`                | `blocked`        | `missing-capability`                | `accept` of a routing result with outcome `blocked`, or a cause found at that `accept`                                                 |
| `ready`                  | `running`        | `dispatch-work-order`               | `next`, or `resume`, issuing a work order                                                                                              |
| `ready`                  | `awaiting_input` | `material-decision`                 | `next`, before an SDD work order, when the matching CREATE approval lacks a persisted `authorizationId`; opens a new `create` question |
| `ready`                  | `routing`        | `required-plan-revision`            | `next` or `resume`, when the routing receipt is no longer `valid`                                                                      |
| `ready`                  | `completed`      | `validated-final-result-and-target` | `finish`, when every condition holds                                                                                                   |
| `running`                | `ready`          | `accept-nonfinal-result`            | `accept` of a result with outcome `accepted`, `accepted_with_debt` or `needs_repair`                                                   |
| `running`                | `awaiting_input` | `material-decision`                 | `accept` of a result with outcome `awaiting_input`, or a stale approval at `accept`                                                    |
| `running`                | `blocked`        | `unrun-or-unresolved-dependency`    | `accept` of an `unrun` or `blocked` result, an unavailable delegation, a budget at its cap, or a cause found                           |
| `running`                | `interrupted`    | `observed-session-interruption`     | `resume`, when the outstanding work order has no accepted result                                                                       |
| `running`                | `routing`        | `scope-or-obligation-revision`      | `accept` of a result that needs a new plan: a diagnose verdict `expectation-differs`, or a repair owned by a stage outside the plan    |
| `awaiting_input`         | `ready`          | `valid-answer-no-replan`            | `decision` with effect `proceed`                                                                                                       |
| `awaiting_input`         | `routing`        | `answer-changes-scope`              | `decision` with effect `replan`                                                                                                        |
| `blocked`                | `ready`          | `blocker-cleared-and-revalidated`   | `resume`, when the named cause or blocker no longer holds                                                                              |
| `interrupted`            | `ready`          | `reconciled-resume`                 | `resume`, in the same call that fired `observed-session-interruption`                                                                  |
| `interrupted`            | `blocked`        | `reconciled-with-blocker`           | `resume`, when reconciliation leaves a cause or blocker                                                                                |
| every non-terminal state | `cancelled`      | `authorized-stop`                   | `decision` with a `stop` input or an answer with effect `stop`                                                                         |

- There is no edge from `running` to `completed`: a run in `running` has an
  outstanding work order, which is an unmet condition. A `finish` whose
  conditions are unmet leaves the state as it was.
- `failed` has no edge and no event. An operation that finds `torn-event`,
  `sequence-gap` or `hash-mismatch` derives `failed` on read, from any
  non-terminal state, and writes nothing to a journal it cannot trust. Nothing
  else leads to `failed`: a budget at its cap, an unavailable delegation and an
  identity or scope break are `blocked`.
- A cause found on a run in `running` or `routing` moves it to `blocked` over the
  edges above. Found on a run in `ready` or `awaiting_input`, the operation is
  refused `fail-closed`, naming the cause, and the state is unchanged. A `stop` is
  never refused on that ground.
- Guards on every event: `expected-sequence-matches`, `lock-owned`,
  `authority-in-scope`, `input-dependencies-valid`, and
  `no-unresolved-blocking-debt-on-completion` on `completed`.
- The journal also carries events that change no state: `run-created`,
  `work-order-issued`, `question-opened`, `authorization-recorded`,
  `binding-recorded`, `receipt-recorded` and `retry-scheduled`.
- Budgets are constants of the core: three replans per run, three automatic
  repairs per cause (a finding code and its path), and three retries of a
  saturated delegation per work order, at 30, 60 and 120 seconds. Reaching one
  moves the run to `blocked` with blocker `budget-exhausted` and never counts as a
  pass.
- Ledger and phase transitions stay governed by their own contracts.

A blocked run names exactly one cause from [Fail-closed](#fail-closed) or one
blocker — `stage-blocked`, `delegation-unavailable`, `budget-exhausted` or
`scope-dependency` — together with who can clear it: `operator`, or the skill that
owns the work.

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

Realizes: `discussion-20260923171450572#REQ-0026`,
`discussion-20260923171450572#REQ-0031`, `discussion-20260923171450572#REQ-0032`,
`discussion-20260923171450572#REQ-0033`, `discussion-20260923171450572#REQ-0039`,
`discussion-20260923171450572#REQ-0040`.

## Fail-closed

A fail-closed cause stops automatic chaining. It never rewrites the project's
configuration.

| `cause`                  | Trigger                                                                                                                                                                                                                                                    | Found at                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `policy-drift`           | (a) A digest fixed at `start` of `qfai.config.yaml`, `.qfai/assistant/constitution/**`, `.qfai/assistant/manifest/**` or `.qfai/assistant/process/workflows/**` changed, including inside the [run change boundary](#run-change-boundary)'s authorized set | Write operations, `resume`, `finish`            |
| `contract-undeclared`    | (b) A plan fails to load; the installed plan differs from the built-in one; a skill a plan names is missing; or a `(skill, operation)` pair a plan uses is absent from that skill's `## Operations` table in `references/orchestrated-mode.md`             | `start`; write operations after an upgrade      |
| `reviewer-missing`       | (c) A blocking reviewer the shipped `agent-routing.yml` requires for a phase a plan dispatches is absent from the project's copy                                                                                                                           | `start`; write operations                       |
| `unsupported-capability` | An unknown host, a declared capability gap, or a failed first delegation                                                                                                                                                                                   | `start` (refusal); first delegation (`blocked`) |
| `invariant-violation`    | The branch or worktree identity fixed at `start` changed, or the cumulative change escaped the [run change boundary](#run-change-boundary)                                                                                                                 | Write operations, `resume`, `finish`            |
| `invalid-mode`           | `workflow.mode` holds a value other than the three                                                                                                                                                                                                         | `start`                                         |

- Policy drift is exactly (a), (b) or (c). A project customization that keeps
  every required role is not drift, and `active` stays in force.
- Journal integrity is not a cause. It derives `failed`.
- A submitted input that breaks a rule is a refusal, not a cause.
- Found at `start`, a cause is a `fail-closed` refusal that leaves no run. The
  message names the cause and a stage skill that works when invoked by name.
  For `reviewer-missing` it also names `qfai init --force` when the shipped
  routing entry is absent from the project's manifest, since `--force` adds it.
  Otherwise it names the manifest file and the reviewer the project dropped,
  which `--force` does not restore.
- Found later, it acts as [State machine](#state-machine) says. `resume` clears
  it once the cause no longer holds, and a `stop` ends the run. Meanwhile a new
  `start` is refused `run-active`, naming the blocked run.
- At `finish`, drift is an unmet condition, not a refusal ([Completion](#completion)).

Realizes: `discussion-20260923171450572#REQ-0059`,
`discussion-20260923171450572#REQ-0065`.

## Host capability report

The start input's `harness` names the host, `claude-code` or `codex`, and reports
each required capability as `true` or `false`:

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

Realizes: `discussion-20260923171450572#REQ-0058`.

## Journal, lock and crash states

Every write operation takes these steps, in this order:

1. Create `.qfai/runs/.lock` exclusively (`wx`), holding the owner stamp: pid,
   hostname, worktree real path, run ID, operation, start time and a random owner
   token.
2. Read and verify the journal: every `journal/NNNNNN.json` from `000001`
   parses, the sequence has no gap, and each event's `prevHash` is the SHA-256 of
   the previous event file's bytes as written.
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

- A published event file that does not parse is `torn-event`, a missing sequence
  number is `sequence-gap`, and a `prevHash` that does not match is
  `hash-mismatch`. Each stops the run, and none is corrected to success.
- Recovery or replay of a completed `finish` may rebuild the runtime snapshot
  from the journal. It never rewrites tracked evidence. `summary.json` keeps
  its last recorded state even if the runtime journal says `completed`.
- The hash chain detects accidental corruption and mix-ups, not tampering by an
  agent with the same write access.
- The lock is taken over only when its owner is on this host, its pid is not
  alive, and its run holds no pending temporary event or that event has been
  discarded. Never on the lock's age. Otherwise the call is refused `lock-held`,
  naming the owner's run, operation and start time.
- The lock lives for one write operation. One writing run per worktree follows
  from the `run-active` check at `start`, not from a lock held between calls.
- `EBUSY`, `EPERM` and `EACCES` while writing are refused `io-error`, naming the
  system error, with no retry loop. Every write operation is idempotent and
  compare-and-set, so the harness re-invoking it is the retry.
- A run whose `qfaiVersion` is newer than the running package is refused
  `newer-record` by every operation. A record the core cannot parse is reported as
  `legacy`, is never reported as a success, and is not counted as a non-terminal
  run.

Realizes: `discussion-20260923171450572#REQ-0026`,
`discussion-20260923171450572#REQ-0027`, `discussion-20260923171450572#REQ-0068`,
`discussion-20260923171450572#NFR-0010`, `discussion-20260923171450572#NFR-0011`.

## Fingerprints and receipts

- Every digest of a tracked input is SHA-256 after CRLF normalization
  (`hashAssistantAssetText`), so a Windows and a Linux checkout agree.
- The obligation fingerprint of a ledger row covers the spec ID, the row ID,
  `Layer`, `Boundary`, `TC-Refs`, and the text of the AC, BR, US and EX items and
  contract sections it references. It leaves out `Status`, `Evidence`, selectors
  and implementation files.
- The oracle fingerprint is the test file content recorded at RED, kept apart
  from the obligation fingerprint.
- A receipt's dependencies are a set of `(path, digest)` over the actual inputs,
  glob membership lists, config and lockfile, spec lifecycle, contract owners,
  the selected discussion pack, and the tool, policy and skill digests. Never a
  modification time or a size.
- Each dependency is classed `normative`, `historical_observation` or
  `current_verification`. A RED receipt holds its obligation fingerprint as
  `normative` and its oracle fingerprint as `historical_observation`, so a later
  production change leaves it `valid`. A GREEN or verify receipt holds the
  production and test files it ran as `current_verification`.
- `accept` checks that every `artifactRefs` real path stays under the project's
  real root and names a regular file. It refuses a missing or escaping file as
  `invalid-input` with reason `schema`, before reading it. It recomputes the
  digest of every submitted `changedFiles` and `artifactRefs` entry.
- A result naming a shared report, such as `verify.json`, has that file copied to
  `reports/<stageInstanceId>/` with its digest. Every later read uses the copy.
- Each receipt records its trust level: `cli_observed` for what the core ran
  itself, `agent_reported` for what a result submitted. A submitted
  `host_observed` is recorded as `agent_reported`.

Realizes: `discussion-20260923171450572#REQ-0029`,
`discussion-20260923171450572#REQ-0030`, `discussion-20260923171450572#REQ-0060`,
`discussion-20260923171450572#REQ-0063`, `discussion-20260923171450572#NFR-0011`.

## Ledger row-set check

When it issues a work order bound to a spec, the core records the row set of
that spec's `tdd/test-list.md`, read with the existing ledger parser: each row ID,
its status and its digest. At `accept` it reads the ledger again and refuses:

- a row that moved off `done` (`ledger-done-moved`);
- a row added by any stage but `sdd_append` (`ledger-row-added`).

A regression fixed against a `done` row leaves the row `done`, with its status
untouched.

The digest covers the row's cells and serves `resume`'s reconciliation. `accept`
refuses only the two changes above. Any other cell edit, such as a test fix
changing `Test file` or `Selector`, is the stage owner's and is judged by review.

Realizes: `discussion-20260923171450572#REQ-0034`,
`discussion-20260923171450572#REQ-0046`, `discussion-20260923171450572#REQ-0047`.

## Completion

`finish` judges the run against the completion target fixed at `start`.

For `qfai_done`, every tracked run change and tracked workflow evidence file
must be committed before `finish` can succeed. The core checks this condition
before publishing the completion event. A successful `finish` then
appends `completed` to the runtime journal and updates its runtime snapshot;
it writes no tracked file. `working_tree` uses the same runtime-only completion
event, but does not require a commit. Tracked `summary.json` keeps the state it
had at its last write. `status` derives the current state from the journal.

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
only another spec can resolve therefore keeps the run from completing until that
spec repairs it.

Every condition has a fixed `owner`. This extends the rule that a blocked run
names `operator` or the skill that owns the work ([State machine](#state-machine)).

| `condition`                        | `owner`                                                                                                                                                         |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `work-order-outstanding`           | The skill the outstanding work order was issued to                                                                                                              |
| `stage-unaccepted`                 | The skill of the stage with no accepted result, as CLI-WFFILE `### Vocabulary` maps its stage kind; for `test_fix`, the skill the defective row's layer selects |
| `verify-missing`, `verify-foreign` | `qfai-verify`, the skill of the verify stage                                                                                                                    |
| `debt-open`                        | The debt's `resolvingOwner`                                                                                                                                     |
| Every other condition              | `operator`                                                                                                                                                      |

A run with no accepted verify stage is reported as `verify-missing` only, never
also as `stage-unaccepted`.

The two targets:

| Target         | Met when                                | Reported as                                                                          |
| -------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `working_tree` | Every condition but `uncommitted` holds | `target: "working_tree"`, with `deliveryUnmet[]` naming what `qfai_done` still needs |
| `qfai_done`    | Every condition holds                   | `target: "qfai_done"`                                                                |

A `working_tree` result is never reported as `qfai_done`. A met target moves the
runtime run from `ready` to `completed`, exit 0. An unmet one leaves the state as
it was, exit 1. `finish` implies no push, pull request, merge or deploy.

Realizes: `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0037`, `discussion-20260923171450572#REQ-0060`,
`discussion-20260923171450572#REQ-0061`, `discussion-20260923171450572#REQ-0062`,
`discussion-20260923171450572#REQ-0063`.

## Output

Every operation writes exactly one JSON document to stdout, on success and on
every error path. Logs and progress go to stderr, and nothing on stderr is needed
to act. While an operation runs, stdout stays empty.

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
- `error` is `{ code, message }`. `reasons[]` of `{ reason, subject }` is added on
  `proposal-refused` and `invalid-input`, and `cause` on `fail-closed` and
  `io-error`.
- `message` is one English sentence in the operator's words: what happened and
  what to do next. It carries no request shape and no internal identifier.
  `qfai-run` relays it in the operator's working language.
- Tests assert codes, reasons and causes, never message text.

The refusal codes form a closed set. They are not validate findings and stay out
of the emitted rule codes.

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
| `io-error`          | `EBUSY`, `EPERM` or `EACCES` while writing, named in `cause`                                               |

Realizes: `discussion-20260923171450572#REQ-0022`,
`discussion-20260923171450572#REQ-0026`, `discussion-20260923171450572#NFR-0012`,
`discussion-20260923171450572#NFR-0017`.

## Exit codes

From `EXIT_CODES`, with their existing meanings. No code is added.

| Exit | When                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0    | The operation was processed, whatever state results: `blocked`, `awaiting_input` and `cancelled` included; a replayed `accept` or `decision`; `status` of a failed run; `start` under `off` or `shadow` |
| 1    | `finish` with an unmet target, drift found at `finish` included; a write operation on a journal failing integrity; `io-error`                                                                           |
| 2    | Every other refusal                                                                                                                                                                                     |

Exit 0 from `status` or `next` means the query was served, never that the run is
complete.

Realizes: `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0022`.

## Boundaries

- The core runs no repository command. It reads git read-only through argv with
  no shell, and runs validate in process.
- No request text, agent output or file content reaches a shell command line.
  Request text is stored verbatim and never evaluated.
- Identity is the resolved real path. On a case-insensitive file system, two paths
  that differ only in case are one identity. The core carries no file-system
  probe. A path whose real path leaves the project root is outside every write
  area.
- Paths are written project-relative with `/`. No absolute path reaches the
  tracked evidence.
- Every command this surface names in shipped text is `npx qfai workflow …`.
- Runtime state never uses `.qfai/state.json`, and the run never copies the
  execution ledger.

Realizes: `discussion-20260923171450572#REQ-0012`,
`discussion-20260923171450572#REQ-0023`, `discussion-20260923171450572#REQ-0024`,
`discussion-20260923171450572#NFR-0011`, `discussion-20260923171450572#NFR-0013`,
`discussion-20260923171450572#NFR-0014`, `discussion-20260923171450572#NFR-0016`.

## Decline audit

Tracked evidence is first written at the run's first `proceed` authorization or
its first accepted stage result — one whose outcome is `accepted` or
`accepted_with_debt`. A run that ends before either writes nothing tracked.

- A CREATE declined at routing ends before either. Nothing is written outside
  `.qfai/runs/<runId>/`, and the decline stays in that run's journal. It stays
  auditable only while the project keeps `.qfai/runs/`.
- A CREATE declined when SDD Stage 1 puts the question again comes after tracked
  evidence began, so it is tracked like every other answer.

Realizes: `discussion-20260923171450572#REQ-0024`,
`discussion-20260923171450572#REQ-0042`, `discussion-20260923171450572#NFR-0014`.

## Operator-facing screens

A screen is one thing the operator or the harness sees at one moment: a message
the host shows, a question it puts, or the output of one command. The screens are
built on the sections above and do not restate them. spec-0018 anchors its
acceptance criteria on the task IDs below.

Rules for every screen:

- A host screen is keyed `host:<name>`, a command screen by its command line.
- A host screen is relayed in the operator's working language. Its acceptance
  asserts the structure and the JSON it is built from — the target field, the
  question ID, the cause, the count of questions — and never a literal word. Five
  tokens are the exception, because the operator types or reads them verbatim:
  `continue`, `stop`, `off`, `shadow` and `active`.
- No route identifier or stage kind reaches the operator. Stages are named in
  plain words.
- Every question takes the form `.agents/rules/user-questions.md` sets out,
  including its plain-text fallback.
- A command screen's `loading` state is stdout staying empty until its one
  document.

### `host:request-entry`

Request entry and route announcement. Source: SCR-001. Actor: the operator, on a
host whose capability report passes, in mode `active`.

| Task                           | Observable result                                                                                                                                     |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `request-entry.announce`       | A change request yields one announcement: the goal, the stages in order and the write scope. It asks nothing                                          |
| `request-entry.no-stage-typed` | On a clear routine change the operator types no `/qfai-*` after the first prompt, and the run reaches `finish`                                        |
| `request-entry.continue`       | `continue` resumes the valid run without reclassifying it. With several candidates, one structured choice lists them by goal and last completed stage |
| `request-entry.other-kind`     | An explanation, a plan only or a verification only is handled as that kind, with no write authorization                                               |

| State            | Observable                                                                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`        | The announcement. Its write scope is the `request_scope`. It lists no skipped stage; their reasons are in the run evidence                          |
| `loading`        | The host's own activity indicator. `qfai-run` shows nothing until the core returns a checked plan                                                   |
| `empty`          | The text is not a change request. No run, no announcement, no question                                                                              |
| `error`          | `proposal-refused`. `qfai-run` revises the proposal itself; the operator sees nothing unless `host:decision-question` or `host:halt-notice` follows |
| `awaiting_input` | One question: `host:create-question`, or a fact on `host:decision-question`. The announcement follows the answer                                    |
| `shadow`         | The proposed stages and the reason, and a statement that nothing was written. No run exists                                                         |
| `off`            | No run. Stage skills are invoked by name                                                                                                            |

Transitions: `empty` → `loading` when the text is a change request; `loading` →
`default` when the plan is checked; `loading` → `awaiting_input` when routing
opens a question; `awaiting_input` → `default` when the answer's effect is
`proceed`; `loading` → `error` on `proposal-refused`; `error` → `loading` when
`qfai-run` submits a revised proposal; `default` → `host:completion-report` after
`finish`.

Realizes: `discussion-20260923171450572#REQ-0001`,
`discussion-20260923171450572#REQ-0002`, `discussion-20260923171450572#REQ-0003`,
`discussion-20260923171450572#REQ-0011`, `discussion-20260923171450572#REQ-0036`,
`discussion-20260923171450572#REQ-0059`, `discussion-20260923171450572#NFR-0007`.

### `host:create-question`

New-capability approval. Source: SCR-002. Actor: the operator.

| Task                               | Observable result                                                                                                                                                                |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create-question.answer`           | One single-select `create` question names the capability, what it covers and what it leaves out. The answer is recorded through `decision`, and `/qfai-sdd` Stage 1 asks nothing |
| `create-question.decline`          | Declining ends the run `cancelled`. No capability is created, SDD does not start, and nothing is written outside `.qfai/runs/<runId>/`                                           |
| `create-question.no-question-mode` | Under a no-question mode the question is not put. The run stays `awaiting_input` with the capability named                                                                       |

| State     | Observable                                                                                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | Two options, each saying what follows, and a recommendation on a line of its own citing the evidence that no capability covers the goal. A lexical miss alone is not that evidence |
| `loading` | The answer is being recorded. Nothing else is shown                                                                                                                                |
| `empty`   | The plan needs no new capability. The question never appears                                                                                                                       |
| `error`   | `decision` refuses the answer. The run stays `awaiting_input`, and the question is put again with the reason in one sentence                                                       |
| `stale`   | A recorded approval went stale. A new `create` question is put as a material decision on `host:decision-question`                                                                  |

Transitions: `empty` → `default` when routing opens the question; `default` →
`loading` when the operator answers; `loading` → `host:request-entry` when the
effect is `proceed`; `loading` → `host:halt-notice` when it is `stop`; `loading` →
`error` on a refusal; `error` → `default` when the question is put again.

This is the only question the entry adds on a feature run, and the announcement
does not repeat it.

Realizes: `discussion-20260923171450572#REQ-0004`,
`discussion-20260923171450572#REQ-0018`, `discussion-20260923171450572#REQ-0033`,
`discussion-20260923171450572#REQ-0042`, `discussion-20260923171450572#REQ-0044`.

### `host:decision-question`

Material decision or missing fact. Source: SCR-003. Actor: the operator.

| Task                           | Observable result                                                                                                                                              |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `decision-question.material`   | A material risk puts one `decision` question: what was found, each option with its effect, how many may be chosen, and a recommendation where one is permitted |
| `decision-question.fact`       | One missing fact is asked as a value with no recommendation: a choice where the candidates can be listed, a plain request where they cannot                    |
| `decision-question.round`      | Independent pending questions are put together in one round; a dependent one waits for its answer                                                              |
| `decision-question.sdd-create` | When SDD Stage 1 finds the CREATE authorization unapproved, mismatched or stale, SDD asks nothing; this screen puts a new `create` question                    |

| State              | Observable                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`          | The finding in at most two sentences, the options with their effects, the selection count, and the recommendation where permitted                                                                 |
| `loading`          | The answer is being recorded                                                                                                                                                                      |
| `empty`            | Nothing material was found. A bugfix restoring an existing authorization check asks nothing, and its `qfai-implement` and `qfai-atdd` work orders carry the `implementation-heavy` review profile |
| `error`            | `decision` refuses the answer. The run stays `awaiting_input`, and the question is put again                                                                                                      |
| `no_question_mode` | The question is not put. The run stays `awaiting_input` or ends `blocked`, and `host:halt-notice` names the open decision                                                                         |

Transitions: `empty` → `default` when a question opens; `default` → `loading` when
the operator answers; `loading` → `empty` when the effect is `proceed`; `loading` →
`host:request-entry` (`loading`) when it is `replan`; `loading` →
`host:halt-notice` when it is `stop`; `loading` → `error` on a refusal; `error` →
`default` when the question is put again.

Realizes: `discussion-20260923171450572#REQ-0008`,
`discussion-20260923171450572#REQ-0009`, `discussion-20260923171450572#REQ-0012`,
`discussion-20260923171450572#REQ-0018`, `discussion-20260923171450572#REQ-0039`,
`discussion-20260923171450572#REQ-0042`, `discussion-20260923171450572#REQ-0044`.

### `host:halt-notice`

Run halted: blocked, fail-closed, stopped or failed. Source: SCR-004. Actor: the
operator.

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

Realizes: `discussion-20260923171450572#REQ-0026`,
`discussion-20260923171450572#REQ-0031`, `discussion-20260923171450572#REQ-0032`,
`discussion-20260923171450572#REQ-0037`, `discussion-20260923171450572#REQ-0040`,
`discussion-20260923171450572#REQ-0053`, `discussion-20260923171450572#REQ-0058`,
`discussion-20260923171450572#REQ-0059`.

### `host:completion-report`

Completion report after `finish`. Source: SCR-005. Actor: the operator.

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

Transitions: `empty` → `loading` when the last stage is accepted and `finish` is
called; `loading` → `default`, `working_tree` or `error` by the `finish` result;
`error` → `loading` when the owners clear the conditions and `finish` runs again.

Realizes: `discussion-20260923171450572#REQ-0010`,
`discussion-20260923171450572#REQ-0021`, `discussion-20260923171450572#REQ-0060`,
`discussion-20260923171450572#REQ-0061`.

### `host:stage-skill-handover`

A stage skill selected with no work order. Source: SCR-006. Actor: the operator,
and the stage skill the host selected.

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

Realizes: `discussion-20260923171450572#REQ-0051`,
`discussion-20260923171450572#REQ-0053`, `discussion-20260923171450572#NFR-0007`.

### `npx qfai workflow start`

Source: SCR-007. Actor: `qfai-run` through the harness, or an operator by hand.

| Task           | Observable result                                                           |
| -------------- | --------------------------------------------------------------------------- |
| `start.create` | A new run under `.qfai/runs/<runId>/`, its ID and state; no process spawned |

| State     | Observable                                                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | `ok`, the run in state `routing`                                                                                                             |
| `empty`   | Mode `off` or `shadow`: `ok`, the mode, `run: null`, exit 0, nothing written                                                                 |
| `error`   | `lock-held`, `run-active` (naming the run), `invalid-input`, `newer-record` or `fail-closed` (naming the cause). No run directory is written |

Realizes: `discussion-20260923171450572#REQ-0015`,
`discussion-20260923171450572#REQ-0027`, `discussion-20260923171450572#REQ-0059`,
`discussion-20260923171450572#REQ-0068`.

### `npx qfai workflow next`

Source: SCR-008. Actor: `qfai-run` through the harness.

| Task          | Observable result                                                |
| ------------- | ---------------------------------------------------------------- |
| `next.issue`  | One work order                                                   |
| `next.repeat` | A work order not yet answered is returned again with the same ID |

| State     | Observable                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `default` | `ok` and the work order                                                                                   |
| `empty`   | `ok`, `workOrder: null`, and the open question or the cause the run waits on                              |
| `error`   | `unknown-run`, `run-terminal`, `fail-closed`, or an integrity code with the run derived `failed` (exit 1) |

`next` has no secondary task.

Realizes: `discussion-20260923171450572#REQ-0013`,
`discussion-20260923171450572#REQ-0016`, `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0034`.

### `npx qfai workflow resume`

Source: SCR-009. Actor: `qfai-run` through the harness, in a new session told to
`continue`.

| Task              | Observable result                                                        |
| ----------------- | ------------------------------------------------------------------------ |
| `resume.continue` | The classed receipts and the work order of the smallest valid checkpoint |

| State     | Observable                                                                                        |
| --------- | ------------------------------------------------------------------------------------------------- |
| `default` | `ok`, the work order, and the receipts as `valid`, `stale` and `unknown`                          |
| `empty`   | `ok`, `workOrder: null`: the run waits on a question, or stays `blocked` naming the cause         |
| `error`   | `unknown-run`, `identity-mismatch`, `newer-record`, `run-terminal`, or an integrity code (exit 1) |

A stale material approval takes the run to `awaiting_input`, and
`host:decision-question` asks again. `resume` never starts a host session.

Realizes: `discussion-20260923171450572#REQ-0008`,
`discussion-20260923171450572#REQ-0020`, `discussion-20260923171450572#REQ-0029`,
`discussion-20260923171450572#REQ-0030`, `discussion-20260923171450572#REQ-0032`.

### `npx qfai workflow accept`

Source: SCR-010. Actor: `qfai-run` through the harness.

| Task            | Observable result                                                               |
| --------------- | ------------------------------------------------------------------------------- |
| `accept.apply`  | The verdict and the run's new state, with `outcome` and `testObservation` apart |
| `accept.replay` | The same result ID returns the same verdict and writes nothing                  |

| State     | Observable                                                                                                                                                                              |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | `ok`, the verdict, the new state, one new transition event                                                                                                                              |
| `empty`   | The result ID was already accepted: the stored verdict, exit 0, nothing written                                                                                                         |
| `error`   | `stale-sequence`, `invalid-input` with its reasons, `proposal-refused`, `lock-held`, `run-terminal`, or an integrity code. No state changes, and the journal is byte for byte as it was |

`accept` never returns a completion verdict.

Realizes: `discussion-20260923171450572#REQ-0017`,
`discussion-20260923171450572#REQ-0028`, `discussion-20260923171450572#REQ-0035`.

### `npx qfai workflow decision`

Source: SCR-011. Actor: `qfai-run` through the harness, relaying the operator's
answer or stop.

| Task              | Observable result                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `decision.record` | The question, the options offered, the answer, who gave it and how it was captured; a `human_decision` |
| `decision.stop`   | A `stop` moves any non-terminal run to `cancelled`, and nothing further is written                     |

| State              | Observable                                                                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default`          | `ok`, the recorded answer and the new state                                                                                                           |
| `already_recorded` | The same question and answer, or a repeated `stop`: the stored verdict, exit 0. `qfai-run` does not put the question again                            |
| `empty`            | No open question and no stop. `qfai-run` does not call `decision`; a call anyway is the `error` state                                                 |
| `error`            | `no-open-question`, `answer-conflict`, `invalid-input` (`option` or `authorization-kind`), `stale-sequence` or `run-terminal`. The state is unchanged |

Realizes: `discussion-20260923171450572#REQ-0018`,
`discussion-20260923171450572#REQ-0028`, `discussion-20260923171450572#REQ-0032`,
`discussion-20260923171450572#REQ-0041`.

### `npx qfai workflow status`

Source: SCR-012. Actor: `qfai-run` through the harness, or the operator by hand.

| Task            | Observable result                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `status.report` | State, current stage and work order, open questions, cause or blocker, debts and the mode; nothing written |

| State            | Observable                                                                                |
| ---------------- | ----------------------------------------------------------------------------------------- |
| `default`        | The run in `running` or `ready`, with its stage and work order                            |
| `awaiting_input` | The open question, verbatim as `qfai-run` put it                                          |
| `blocked`        | The cause or blocker and who can clear it, as `host:halt-notice` names them               |
| `empty`          | No run in this worktree: `run: null` and the mode, exit 0                                 |
| `error`          | `unknown-run`; or a journal failing integrity, reported as `failed` with its code, exit 0 |

A terminal run reports its terminal state.

Realizes: `discussion-20260923171450572#REQ-0019`,
`discussion-20260923171450572#REQ-0021`, `discussion-20260923171450572#REQ-0059`,
`discussion-20260923171450572#NFR-0012`.

### `npx qfai workflow finish`

Source: SCR-013. Actor: `qfai-run` through the harness.

| Task           | Observable result                                                       |
| -------------- | ----------------------------------------------------------------------- |
| `finish.judge` | The target and every unmet condition, from validate the core ran itself |

| State     | Observable                                                                                         |
| --------- | -------------------------------------------------------------------------------------------------- |
| `default` | The target met, `qfai_done` or `working_tree`; the run moves from `ready` to `completed`           |
| `loading` | Validate is running in process. Progress goes to stderr                                            |
| `empty`   | No accepted verify stage: `verify-missing`, exit 1, state unchanged                                |
| `error`   | The unmet conditions, each once, exit 1, state unchanged. A terminal run is refused `run-terminal` |

Realizes: `discussion-20260923171450572#REQ-0021`,
`discussion-20260923171450572#REQ-0060`, `discussion-20260923171450572#REQ-0061`,
`discussion-20260923171450572#REQ-0062`, `discussion-20260923171450572#REQ-0063`.

### `npx qfai init`

Mode and upgrade report, on a fresh install and on an upgrade. Source: SCR-014.
Actor: the operator adopting or upgrading QFAI. The lines and the exit code are
CLI-INIT's.

| Task            | Observable result                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `init.fresh`    | The entry is installed, and the summary names the mode in force: `active` with no key set                                           |
| `init.upgrade`  | Unmodified shipped assets are updated; the mode is `active`                                                                         |
| `init.conflict` | A user-modified asset or manifest is never overwritten; each conflicting file is named with its difference and the trigger it trips |
| `init.rerun`    | Nothing is duplicated, and the summary says the tree is current                                                                     |

| State     | Observable                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | The existing summary, plus one line naming the mode in force                                                                                                                 |
| `loading` | The tree is being written                                                                                                                                                    |
| `empty`   | A rerun with nothing to change                                                                                                                                               |
| `error`   | The conflict form of the mode line: each file once, then one line saying `active` is configured and will not start until they are resolved. The plain mode line is not shown |

Init asks no mode question.

Realizes: `discussion-20260923171450572#REQ-0024`,
`discussion-20260923171450572#REQ-0059`, `discussion-20260923171450572#REQ-0064`,
`discussion-20260923171450572#REQ-0065`.
