# Workflow Files Contract

- Contract scope: the files `npx qfai workflow` writes and reads, the local
  records of a run, the plans the package ships, and the JSON Schemas the
  package ships for the workflow payloads
- Owning flow: `BF-0001`
- Used-by: `npx qfai workflow`, `qfai init` (the ignore lines of the run trees),
  and every step a plan names (its entry file under `.qfai/assistant/step/`)
- SSOT modules:
  - `packages/qfai/src/core/gitignore.ts` (the managed `.gitignore` block)
  - `packages/qfai/src/core/packLocator.ts` (`CANONICAL_TIMESTAMP_*`, the width
    of a run ID)
- Companion contracts: `.qfai/spec/03_contract/cli/qfai-workflow.md` for the
  operations that write these files and the payload fields;
  `.qfai/spec/03_contract/cli/qfai-init.md` for the ignore lines

The payload parsers and the plan loader live under
`packages/qfai/src/core/workflow/`, the five schemas under
`packages/qfai/assets/schemas/workflow/`, and the plans under
`packages/qfai/assets/defaults/workflows/`. The SSOT list names only files that
exist.

## Runtime tree

```text
.qfai/run/                               git-ignored as a whole
  .lock                                  held for one write operation
  inbox/<name>.json                      the start payload, written by the harness
  run-<17-digit timestamp>/
    journal/NNNNNN.json                  one event per file, written by the core only
    journal/.NNNNNN.tmp                  an event not yet published
    snapshot.json                        rebuilt from the journal; holds the execution context
    request.private.json                 request text, free-text answers and the run's digest key
    inbox/<name>.json                    later payloads, written by the harness
    work-orders/<workOrderId>.json
    results/<resultId>.json
    reports/<stageInstanceId>/<file>     per-stage copies of shared reports
```

- A run ID is `run-` and a 17-digit timestamp from `CANONICAL_TIMESTAMP_*`, the
  width discussion pack IDs use. The scan for runs reads only names of that
  form, so `inbox/` and `.lock` are never read as runs.
- Only the core writes under a run directory, except `inbox/`, which only the
  harness writes.
- An event file holds `sequence`, `prevHash`, `event`, `from` and `to` where the
  event is a transition, `operation`, `recordedAt`, and the references the event
  makes. `NNNNNN` is the sequence, six digits, from `000001`. The first event's
  `prevHash` is `null`.
- A `finish` event carries the in-process validate verdict and finding
  identities with trust level `cli_observed`. It carries no request text,
  free-text answer, secret or raw validator output. After a completed `finish`,
  recovery may rebuild `snapshot.json` from the journal but never rewrites the
  run's summary or authorization records.
- `snapshot.json` records the sequence it reflects. A snapshot behind the
  journal is rebuilt, and deleting it loses nothing.
- `request.private.json` holds the one copy of the request text and of each
  free-text answer, and the run's random 32-byte digest key.
- The tree has no `state.json`, no `repairs/` and no `observations/`. Runs never
  use `.qfai/state.json`.
- Nothing under `.qfai/run/` is tracked. Conversation text and secrets stay
  here.

## Run records

```text
.qfai/evidence/workflow/<runId>/         git-ignored, with the rest of .qfai/evidence/
  summary.json
  authorizations/<authorizationId>.json
```

These records stay on the machine that ran the run. Nothing under
`.qfai/evidence/` is tracked, so no completion target asks for them to be
committed. A `decisions.md` row that an authorization approves states what was
approved itself ([Authorization record](#authorization-record)).

`summary.json`:

| Field              | Content                                                                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runId`            | The run ID                                                                                                                                                |
| `qfaiVersion`      | The package version that wrote the run. The only version the file carries                                                                                 |
| `route`            | The checked route                                                                                                                                         |
| `completionTarget` | `qfai_done` or `working_tree`                                                                                                                             |
| `state`            | The state when this summary was last written; the runtime journal holds the current state                                                                 |
| `targetBindings`   | `{ slotId, flowId, storyIds }` per bound `new_story` slot. IDs only, no story text                                                                        |
| `stages`           | `{ stageInstanceId, stageKind, outcome, testObservation, receiptDigests, reviewerRoles }` per stage instance                                              |
| `authorizationIds` | The authorizations under `authorizations/`                                                                                                                |
| `debts`            | `{ findingCode, path, cause, owningFlow, detectingCommand, resolvingOwner, blockingExtent }` each; `owningFlow` may be `null` in a run that binds no flow |
| `requestDigest`    | HMAC-SHA-256 of the request text under the run's digest key, lowercase hex                                                                                |
| `createdAt`        | When the run was created                                                                                                                                  |
| `updatedAt`        | When the file was last written                                                                                                                            |

- **First write.** Run records are first written at the run's first `proceed`
  authorization or its first accepted stage result, as
  `qfai-workflow.md#decline-audit` states. From then on `summary.json` is
  rewritten at every write operation that changes the run, except `finish`. An
  authorization file is written when recorded. Both use a temporary file and a
  rename. `finish` records `completed` only in the runtime journal and
  snapshot, so the summary may still say `ready`. `status` reads the journal for
  the current state. Both completion targets use that runtime-only event.
- **Keyed digest.** The request and every free-text answer appear only as
  HMAC-SHA-256 under the run's key. A bare hash of a short request could be
  confirmed by guessing it. The key stays in `request.private.json`, so the
  runtime tree can still prove a match.
- **Flow binding.** A flow bound from the proposal's `affectedFlowIds` has no
  slot, so it adds no `targetBindings` entry. The journal's `binding-recorded`
  event and the execution context's flow binding hold it.
- **No private input.** The run records hold no conversation text, no secret
  or token, and no absolute local path. The one prose they carry is a question
  and its options, as the question put them.

## Authorization record

`authorizations/<authorizationId>.json` holds one authorization.

| Field             | Kinds            | Content                                                                                                                                    |
| ----------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `authorizationId` | all              | 1 to 64 characters of `[A-Za-z0-9_-]`, minted by the core within that grammar, unique within the run                                       |
| `runId`           | all              | The run                                                                                                                                    |
| `kind`            | all              | `request_scope`, `human_decision` or `project_policy`                                                                                      |
| `capture`         | all              | `host_observed` or `agent_captured`. The core writes `agent_captured`                                                                      |
| `scopeDigest`     | all              | The scope digest when it was recorded, leaving out the IDs the story-authoring stage binds                                                 |
| `recordedAt`      | all              | ISO-8601 UTC                                                                                                                               |
| `requestDigest`   | `request_scope`  | As in `summary.json`                                                                                                                       |
| `policy`          | `project_policy` | `{ path, digest }` of the adopted policy, and the `effects` it allows, from the effect set in [Format](#format)                            |
| `questionId`      | `human_decision` | The question answered                                                                                                                      |
| `question`        | `human_decision` | `{ text, options, selection }` as the question put them                                                                                    |
| `answer`          | `human_decision` | `{ optionIds }`, or `{ valueDigest }` for a free-text value, keyed as the request is                                                       |
| `effect`          | `human_decision` | `proceed`, `replan` or `stop`                                                                                                              |
| `answeredBy`      | `human_decision` | Who answered, as the harness reported the operator                                                                                         |
| `operation`       | `human_decision` | `CREATE` on an answer to a `create` question, `CHANGE_REQUEST` on an answer to a story-authoring stage's change question, otherwise `null` |
| `target`          | `human_decision` | On a `create` answer: `{ kind: "new_story", slotId, story: { goal, covers, excludes, flowId } }` as the question showed it                 |

- There is no `approved` field and no confidence value.
- One authorization covers one new-story slot, or one story-authoring stage's
  change.
- The slot's binding to the created IDs is a journal event and a
  `targetBindings` entry in `summary.json`. The record itself is never rewritten.
- A `decisions.md` row cites a record as `<runId>/<authorizationId>`, which
  names `.qfai/evidence/workflow/<runId>/authorizations/<authorizationId>.json`
  on the machine that ran the run. The row's Approach also states, exactly as
  the record holds them:
  - who answered, the record's `answeredBy`;
  - when, the record's `recordedAt`;
  - what was approved, the label of each option `answer.optionIds` names, as
    `question.options` holds it.
- The row therefore reads the same where the record is absent. No column is
  added to the table. The core checks the row against the record when it
  accepts the stage that appended the row
  (`qfai-workflow.md#story-tree-records`).

## Plan files

The plans are built into the package. They are not an extension point: a
project does not add, remove or edit a plan, and QFAI adds no workflow language.

- One YAML file per route: `direct.yml`, `bugfix.yml`, `bounded-change.yml`,
  `feature.yml` and `discovery.yml`, under
  `packages/qfai/assets/defaults/workflows/`.
- The core loads them from the installed package. `qfai init` installs no copy,
  and the core never reads a plan file under the project's `.qfai/assistant/`.
- The execution context records a digest of each plan file the run loaded, so a
  package upgrade in the middle of a run is `tool-drift` at `finish`.

### Format

```yaml
route: bounded-change
stages:
  - id: sdd-delta
    kind: sdd_delta
    steps:
      - sdd-triage
      - { step: sdd-flow, when: proposed }
      - sdd-story
      - { step: sdd-contract, when: proposed }
      - { step: common-design-md, when: proposed }
      - sdd-gate
    when: always
  - id: acceptance
    kind: acceptance
    steps: [atdd-scaffold, { step: atdd-credentials, when: proposed }, atdd-author]
    when: acceptance_obligations_unmet
    after: [sdd-delta]
```

| Key                | Content                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route`            | The route, equal to the file's base name                                                                                                                                            |
| `stages`           | A non-empty list                                                                                                                                                                    |
| `stages[].id`      | Unique within the plan                                                                                                                                                              |
| `stages[].kind`    | A stage kind from the table below                                                                                                                                                   |
| `stages[].steps`   | A non-empty list of the steps the stage runs, in the order they run, none twice. An entry is a step name, or `{ step, when }` for a step with a step predicate of its own           |
| `stages[].when`    | A stage predicate                                                                                                                                                                   |
| `stages[].after`   | The IDs of the stages it depends on. Absent for a stage that depends on none                                                                                                        |
| `stages[].effects` | Optional. The external effects the stage needs, each one of `push`, `pull-request`, `merge`, `deploy`, `production-migration` and `extra-spending`. The built-in plans declare none |

A stage carries no `skill` and no `operation` key. What a stage runs is its
active steps: the entries whose step predicate holds, or that carry none, in
plan order.

The file carries no `schema_version`, no `$id`, no version marker and no
internal identifier.

### Vocabulary

| Stage kind       | Steps a stage of the kind may run                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `maintenance`    | `maintain-edit`                                                                                      |
| `diagnose`       | `implement-diagnose`                                                                                 |
| `sdd_append`     | `sdd-story`, `sdd-gate`                                                                              |
| `test_fix`       | `atdd-test-fix`, `implement-test-fix`                                                                |
| `regression_fix` | `implement-regression-fix`                                                                           |
| `sdd`            | `sdd-triage`, `sdd-flow`, `sdd-story`, `sdd-contract`, `common-design-md`, `sdd-cycle`, `sdd-gate`   |
| `sdd_delta`      | `sdd-triage`, `sdd-flow`, `sdd-story`, `sdd-contract`, `common-design-md`, `sdd-gate`                |
| `prototype`      | `prototyping-grill`, `prototyping-preflight`, `prototyping-loop`, `prototyping-handoff`              |
| `acceptance`     | `atdd-scaffold`, `atdd-credentials`, `atdd-author`                                                   |
| `implement`      | `implement-tdd`, `implement-checkpoint`, and `implement-seam` for a seam request                     |
| `verify`         | `verify-context`, `verify-qfai-gate`, `verify-repo-gate`                                             |
| `discussion`     | `discussion-research`, `discussion-interview`, `discussion-pack`, `discussion-oq`, `discussion-uiux` |

- A step is named `<owner>-<name>`. Its owner is the skill whose name is
  `qfai-` and that prefix, or `common` for a `common-*` step, as
  `assistant-steps.md` defines the step tree.
- The routing work order has kind `route`, executor `qfai-run` and operation
  `route`. No plan names it.
- `implement-seam` is never a plan step. The core issues a work order whose
  one step it is from an acceptance result's seam request.
- Stage predicates: `always`, `missing_example_needed`,
  `diagnosis_missing_test`, `test_defect_found`, `regression_found`,
  `acceptance_obligations_unmet`, `prototype_decision_needed`,
  `full_discussion_needed`.
- Step predicates: `proposed`, `test_defect_acceptance_layer` and
  `test_defect_example_layer`. A step with none always runs when its stage
  runs.
- `proposed` holds when the checked route proposal lists the step in
  `optionalSteps` (`qfai-workflow.md#route-proposal`).
- `test_defect_acceptance_layer` holds when the diagnosis's first matched ID is
  a BF or an AC, and `test_defect_example_layer` when it is an EX, as
  `.qfai/assistant/rule/test-layers.md` maps those layers. The `bugfix` plan's
  `test_fix` stage runs `atdd-test-fix` under the first and
  `implement-test-fix` under the second.
- `missing_example_needed` holds when the diagnosis is `missing-test` and no
  example of the bound flow states the case. When one does, the predicate is
  false and `acceptance_obligations_unmet` or the implement stage picks the
  example up.
- `acceptance_obligations_unmet` holds when a BF of the bound flow has no
  annotating test in the E2E layer, or an AC of it has none in the integration
  or API layer. Layers and annotations are read as
  `qfai-validate.md#what-counts-as-a-test` reads them: an item an exception row
  in force exempts counts as met, and an EX's coverage does not affect the
  predicate.
- `diagnosis_missing_test` holds whenever the diagnosis is `missing-test`,
  whether or not an example states the case. The `bugfix` plan's implement
  stage runs under it, so the case's test is written in either branch.
- How the core decides that a UI contract serves the bound flow, for
  `prototype_decision_needed`, is pending OQ-0194.
- Names no plan uses and the core refuses: `repair_prepare`, `sdd_reconcile`,
  `defect_reopen`, `configure`, `research` and `ledger_reconcile_needed`.
- None of these names reaches the operator.

### Load refusals

The core refuses a plan, as trigger (b), when:

- the file is missing, is not a YAML mapping, or has an unknown key;
- `route` differs from the base name;
- a kind, step, stage predicate or step predicate is outside the vocabulary;
- a stage runs a step its kind may not run, or runs `implement-seam`;
- a stage's `steps` is empty, holds a malformed entry or names a step twice;
- a stage's `effects` is not a list, or names an effect outside the set in
  [Format](#format);
- an `after` names a stage the plan lacks, or the stages form a cycle;
- a stage cannot be reached from a stage with no `after`;
- a stage of `direct`, `bugfix`, `bounded-change` or `feature` has no path to a
  `verify` stage, or such a plan ends in a stage that is not one. `discovery`
  ends by returning the run to routing;
- a step it names is not installed in the project: no file
  `.qfai/assistant/step/<name>/STEP.md`. The refusal names the step.

## Shipped schemas

Five JSON Schemas ship in the package:

| File                                                                  | Describes                                                      |
| --------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/qfai/assets/schemas/workflow/route-proposal.schema.json`    | The `proposal` of a routing result                             |
| `packages/qfai/assets/schemas/workflow/execution-context.schema.json` | The execution context in `snapshot.json`                       |
| `packages/qfai/assets/schemas/workflow/work-order.schema.json`        | A work order, as `next` returns it and `work-orders/` holds it |
| `packages/qfai/assets/schemas/workflow/stage-result.schema.json`      | The stage result `accept` takes                                |
| `packages/qfai/assets/schemas/workflow/authorization.schema.json`     | The authorization record                                       |

The route-proposal schema and the runtime parser require every entry in
`expectedBehaviorRefs` and `observedRefs` to be exactly `{ kind, ref }`. The
closed `kind` values are `request`, `flow-id`, `contract-id`, `path` and
`evidence`. The normative array allows the first four; the observed array
allows `path` and `evidence`. `ref` is a nonempty string. The parser also checks
the field-specific value rules in `qfai-workflow.md#route-proposal`. Neither
boundary accepts a legacy string entry, an unknown kind, or an extra entry key.
Such payloads are `invalid-input` with reason `schema`, before proposal checks.
Parser and schema verdicts agree on these shape cases.

The stage-result schema and the runtime parser hold a stage result closed and
complete in the same way: every field the schema requires, `actor` among them,
every field of the shape the schema gives it, the proposal of a routing result
included, and no key the schema does not declare. A payload that fails is
`invalid-input` with reason `schema` before the run reads it, naming each
faulty field. An `approved` or `authorization` key is refused as
`qfai-workflow.md#stage-result` states.

- They ship because `package.json#files` lists `assets/`. `qfai init` does not
  copy them into a project, and `qfai-run`'s reference shows each payload as a
  JSON example rather than citing a path under `node_modules/`.
- `$id` is `urn:qfai:workflow:<name>`, with no version segment. `$schema` is
  `https://json-schema.org/draft/2020-12/schema`, the version of a third-party
  specification.
- Descriptions are English. A schema carries no `contract` constant, because the
  operation already says which document it expects; no `commandId`; no
  `schemaVersion`; no private version marker; and no internal identifier.
- The start input and the decision input have no shipped schema.
- Runtime authority is the TypeScript parser under `core/workflow/`. Adopters
  get no new runtime dependency.
- Tests validate every payload example and fixture with both the parser and the
  schema, and the two verdicts must agree. The test validator is `ajv` 8
  through its draft 2020-12 build, a `packages/qfai` devDependency whose MIT
  licence is checked when it is added. It runs with `validateFormats: false`,
  and the parser owns timestamp checks. Strict mode must accept that option with
  no unknown-format error.

## Rules

Rule refs: BR-0671, BR-0672, BR-0673

| BR-ID   | Statement                                                                                                                                                                                                                                                                                                                                                              | Examples                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| BR-0545 | The `feature` plan is story authoring, then prototyping only when a visual decision is needed, then acceptance while acceptance obligations are unmet, then implement and a verify stage running `verify-context`, `verify-qfai-gate` and `verify-repo-gate`.                                                                                                          | EX-0001-0192-13                                                                     |
| BR-0546 | Every change route's last stage is a verify stage running `verify-context`, `verify-qfai-gate` and `verify-repo-gate`, and skipping a stage never skips a test obligation; an item that a `Test exception:` row in force exempts is not an unmet obligation.                                                                                                           | EX-0001-0192-14, EX-0001-0192-51, EX-0001-0192-52                                   |
| BR-0619 | The `direct` plan is a maintenance stage whose one step is `maintain-edit`, then a verify stage.                                                                                                                                                                                                                                                                       | EX-0001-0198-01                                                                     |
| BR-0631 | The plans load from the package's `assets/defaults/workflows/` and are never installed into a project. A plan with an unknown stage or step, a cycle or no path to verify is refused on load as trigger (b), as is a plan naming a step with no `.qfai/assistant/step/<name>/STEP.md` in the project, and a copy under the project's `.qfai/assistant/` is never read. | EX-0001-0199-09, EX-0001-0199-10, EX-0001-0199-11, EX-0001-0203-01                  |
| BR-0782 | Plan Stages Name Ordered Steps - A plan stage lists its steps in the order they run; an entry is a step name or `{ step, when }` with a step predicate of its own. The stage's active steps are the entries whose predicate holds, in plan order. A stage carries no `skill` and no `operation` key.                                                                   | EX-0001-0216-01, EX-0001-0216-02, EX-0001-0192-13, EX-0001-0192-14                  |
| BR-0649 | Shipped schemas, plans and skills carry no private version marker and no internal identifier, and the only version they name is `qfaiVersion`.                                                                                                                                                                                                                         | EX-0001-0201-15                                                                     |
| BR-0652 | The run records under `.qfai/evidence/workflow/` hold no conversation text, secret, token or absolute path, and request text and free-text answers appear there only as keyed digests.                                                                                                                                                                                 | EX-0001-0201-18, EX-0001-0195-11, EX-0001-0201-39                                   |
| BR-0653 | The five shipped schemas and the parser accept and refuse the same payloads, and the parser is the runtime authority.                                                                                                                                                                                                                                                  | EX-0001-0201-19                                                                     |
| BR-0654 | Runtime state lives only under the git-ignored `.qfai/run/`, and a run never writes `.qfai/state.json`.                                                                                                                                                                                                                                                                | EX-0001-0201-20                                                                     |
| BR-0744 | The `bugfix` plan runs its implement stage under `diagnosis_missing_test`, which holds whenever the diagnosis is `missing-test`, whether or not an example already states the case, so the case's test is written in either branch; a `regression` or `defective-test` diagnosis does not satisfy it.                                                                  | EX-0001-0193-13, EX-0001-0193-01, EX-0001-0193-03, EX-0001-0193-11, EX-0001-0194-06 |
| BR-0745 | `acceptance_obligations_unmet` holds when a BF of the bound flow has no annotating test in the E2E layer, or an AC of it has none in the integration or API layer, as `qfai-validate.md#what-counts-as-a-test` reads layers and annotations. An item an exception row in force exempts counts as met, and an EX's coverage does not affect it.                         | EX-0001-0192-51, EX-0001-0192-52                                                    |
