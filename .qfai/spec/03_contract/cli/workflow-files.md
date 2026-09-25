# Workflow Files Contract

- Contract scope: the files `npx qfai workflow` writes and reads, the tracked
  evidence of a run, the plans the package ships, and the JSON Schemas the
  package ships for the workflow payloads
- Owning flow: `BF-0001`
- Used-by: `npx qfai workflow`, `qfai init` (the ignore lines of the run trees),
  and every stage skill a plan names (its Operations table)
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
  tracked summary or authorization files.
- `snapshot.json` records the sequence it reflects. A snapshot behind the
  journal is rebuilt, and deleting it loses nothing.
- `request.private.json` holds the one copy of the request text and of each
  free-text answer, and the run's random 32-byte digest key.
- The tree has no `state.json`, no `repairs/` and no `observations/`. Runs never
  use `.qfai/state.json`.
- Nothing under `.qfai/run/` is tracked. Conversation text and secrets stay
  here.

## Tracked tree

```text
.qfai/evidence/workflow/<runId>/         tracked
  summary.json
  authorizations/<authorizationId>.json
```

`qfai init` keeps this directory tracked with a negation under the ignored
`.qfai/evidence/*`, so a `decisions.md` row that cites an authorization resolves
from a fresh clone.

`summary.json`:

| Field              | Content                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------ |
| `runId`            | The run ID                                                                                                   |
| `qfaiVersion`      | The package version that wrote the run. The only version the file carries                                    |
| `route`            | The checked route                                                                                            |
| `completionTarget` | `qfai_done` or `working_tree`                                                                                |
| `state`            | The state when this tracked summary was last written; the runtime journal holds the current state            |
| `targetBindings`   | `{ slotId, flowId, storyIds }` per bound `new_story` slot. IDs only, no story text                           |
| `stages`           | `{ stageInstanceId, stageKind, outcome, testObservation, receiptDigests, reviewerRoles }` per stage instance |
| `authorizationIds` | The authorizations under `authorizations/`                                                                   |
| `debts`            | `{ findingCode, path, cause, owningFlow, detectingCommand, resolvingOwner, blockingExtent }` each            |
| `requestDigest`    | HMAC-SHA-256 of the request text under the run's digest key, lowercase hex                                   |
| `createdAt`        | When the run was created                                                                                     |
| `updatedAt`        | When the file was last written                                                                               |

- **First write.** Tracked evidence is first written at the run's first
  `proceed` authorization or its first accepted stage result, as
  `qfai-workflow.md#decline-audit` states. From then on `summary.json` is
  rewritten at every write operation that changes the run, except `finish`. An
  authorization file is written when recorded. Both use a temporary file and a
  rename. Before `qfai_done`, all tracked run changes and workflow evidence are
  committed. `finish` records `completed` only in the runtime journal and
  snapshot, so a committed summary may still say `ready`. `status` reads the
  journal for the current state. A `working_tree` completion uses the same
  runtime-only event without requiring a commit.
- **Keyed digest.** The request and every free-text answer appear only as
  HMAC-SHA-256 under the run's key. A bare hash of a short request could be
  confirmed by guessing it. The key stays in `request.private.json`, so the
  runtime tree can still prove a match.
- **Flow binding.** A flow bound from the proposal's `affectedFlowIds` has no
  slot, so it adds no `targetBindings` entry. The journal's `binding-recorded`
  event and the execution context's flow binding hold it.
- **No private input.** The tracked tree holds no conversation text, no secret
  or token, and no absolute local path. The one prose it carries is a question
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
  resolves to
  `.qfai/evidence/workflow/<runId>/authorizations/<authorizationId>.json`, and
  repeats its `answeredBy` in the row's Approach. No column is added to the
  table. The core checks the citation when it accepts the stage that appended
  the row (`qfai-workflow.md#story-tree-records`).

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
route: direct
stages:
  - id: edit
    kind: maintenance
    skill: qfai-maintain
    operation: non-normative-edit
    when: always
  - id: verify
    kind: verify
    skill: qfai-verify
    operation: verify-full
    when: always
    after: [edit]
```

| Key                  | Content                                                                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route`              | The route, equal to the file's base name                                                                                                                                            |
| `stages`             | A non-empty list                                                                                                                                                                    |
| `stages[].id`        | Unique within the plan                                                                                                                                                              |
| `stages[].kind`      | A stage kind from the table below                                                                                                                                                   |
| `stages[].skill`     | The kind's skill. A `test_fix` stage lists both of its skills                                                                                                                       |
| `stages[].operation` | The kind's operation                                                                                                                                                                |
| `stages[].when`      | A predicate                                                                                                                                                                         |
| `stages[].after`     | The IDs of the stages it depends on. Absent for a stage that depends on none                                                                                                        |
| `stages[].effects`   | Optional. The external effects the stage needs, each one of `push`, `pull-request`, `merge`, `deploy`, `production-migration` and `extra-spending`. The built-in plans declare none |

The file carries no `schema_version`, no `$id`, no version marker and no
internal identifier.

### Vocabulary

| Stage kind       | Skill                                                                | Operation                                       |
| ---------------- | -------------------------------------------------------------------- | ----------------------------------------------- |
| `maintenance`    | `qfai-maintain`                                                      | `non-normative-edit`                            |
| `diagnose`       | `qfai-implement`                                                     | `diagnose-only`                                 |
| `sdd_append`     | `qfai-sdd`                                                           | `defect-example-seeding`                        |
| `test_fix`       | `qfai-atdd` or `qfai-implement`, by the diagnosis's first matched ID | `test-fix`                                      |
| `regression_fix` | `qfai-implement`                                                     | `regression-fix`                                |
| `sdd`            | `qfai-sdd`                                                           | `new-story`                                     |
| `sdd_delta`      | `qfai-sdd`                                                           | `update-or-applicability-check`                 |
| `prototype`      | `qfai-prototyping`                                                   | `existing-runtime-contract`                     |
| `acceptance`     | `qfai-atdd`                                                          | `author-acceptance-tests`                       |
| `implement`      | `qfai-implement`                                                     | `implement`, and `seam-only` for a seam request |
| `verify`         | `qfai-verify`                                                        | `verify-full`                                   |
| `discussion`     | `qfai-discussion`                                                    | `resolve-unsettled-product-scope`               |

- The routing work order has kind `route`, skill `qfai-run` and operation
  `route`. No plan names it.
- A `test_fix` stage goes to `qfai-atdd` when the diagnosis's first matched ID
  is a BF or an AC, and to `qfai-implement` when it is an EX, as
  `.qfai/assistant/rule/test-layers.md` maps those layers.
- `seam-only` is never a plan stage. The core issues it from an acceptance
  result's seam request.
- Predicates: `always`, `missing_example_needed`, `test_defect_found`,
  `regression_found`, `acceptance_obligations_unmet`,
  `prototype_decision_needed`, `full_discussion_needed`.
- `missing_example_needed` holds when the diagnosis is `missing-test` and no
  example of the bound flow states the case. When one does, the predicate is
  false and `acceptance_obligations_unmet` or the implement stage picks the
  example up.
- Names no plan uses and the core refuses: `repair_prepare`, `sdd_reconcile`,
  `defect_reopen`, `configure`, `research` and `ledger_reconcile_needed`.
- None of these names reaches the operator.

### The Operations table

Each skill a plan names declares the operations it serves in its
`.qfai/assistant/skill/<name>/references/orchestrated-mode.md`. The core reads
that declaration when it checks trigger (b).

```markdown
## Operations

| Operation       | What the work order asks                      |
| --------------- | --------------------------------------------- |
| `diagnose-only` | Reproduce, find the cause, change no code     |
| `implement`     | The TDD cycle over the examples no test marks |
```

- The heading is exactly `## Operations`. The core reads the first table under
  it, up to the next heading, and nothing inside a fenced code block.
- The first column is headed `Operation`. Each of its cells holds exactly one
  backticked operation ID from [Vocabulary](#vocabulary).
- Every other column is the skill's own. The core does not read it.
- The skill serves exactly the operations its table lists.
- A missing heading, a missing table, a first column headed otherwise, or a cell
  holding anything but one vocabulary ID is trigger (b), as is a
  `(skill, operation)` pair a plan uses and the table omits.
- `qfai-run` has no such file. The `(qfai-run, route)` pair of the routing work
  order is built in.

### Load refusals

The core refuses a plan, as trigger (b), when:

- the file is missing, is not a YAML mapping, or has an unknown key;
- `route` differs from the base name;
- a kind, skill, operation or predicate is outside the vocabulary, or a skill or
  operation does not belong to its kind;
- a stage's `effects` is not a list, or names an effect outside the set in
  [Format](#format);
- an `after` names a stage the plan lacks, or the stages form a cycle;
- a stage cannot be reached from a stage with no `after`;
- a stage of `direct`, `bugfix`, `bounded-change` or `feature` has no path to a
  `verify` stage with operation `verify-full`, or such a plan ends in a stage
  that is not one. `discovery` ends by returning the run to routing;
- a skill it names is not installed in the project, or that skill's Operations
  table is missing, malformed or omits a pair the plan uses
  ([The Operations table](#the-operations-table)).

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

| BR-ID   | Statement                                                                                                                                                                                                                                                             | Examples                         |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| BR-0545 | The `feature` plan is story authoring, then prototyping only when a visual decision is needed, then acceptance, implement and a full verify.                                                                                                                          | EX-0001-0192-13                  |
| BR-0546 | Every change route's last stage is a full verify, and skipping a stage never skips a test obligation.                                                                                                                                                                 | EX-0001-0192-14                  |
| BR-0619 | The `direct` plan is a maintenance stage by `qfai-maintain`, then a full verify.                                                                                                                                                                                      | EX-0001-0198-01                  |
| BR-0631 | The plans load from the package's `assets/defaults/workflows/` and are never installed into a project. A plan with an unknown stage, a cycle or no path to verify is refused on load as trigger (b), and a copy under the project's `.qfai/assistant/` is never read. | EX-0001-0199-09, EX-0001-0199-10 |
| BR-0649 | Shipped schemas, plans and skills carry no private version marker and no internal identifier, and the only version they name is `qfaiVersion`.                                                                                                                        | EX-0001-0201-15                  |
| BR-0652 | Tracked evidence under `.qfai/evidence/workflow/` holds no conversation text, secret, token or absolute path, and request text and free-text answers appear there only as keyed digests.                                                                              | EX-0001-0201-18                  |
| BR-0653 | The five shipped schemas and the parser accept and refuse the same payloads, and the parser is the runtime authority.                                                                                                                                                 | EX-0001-0201-19                  |
| BR-0654 | Runtime state lives only under the git-ignored `.qfai/run/`, and a run never writes `.qfai/state.json`.                                                                                                                                                               | EX-0001-0201-20                  |
