# 10 Plan

**How-only.** This file states approach. It is validated as such:
`QFAI-PLAN-002` rejects status/progress headings, `QFAI-PLAN-003` rejects
update-history headings, and `QFAI-PLAN-004` rejects RC / Go-NoGo headings —
all at severity `error`. The four sections below are the allowed shape; keep
them and the gates are satisfied by construction.

Progress belongs in `tdd/test-list.md`, history in `09_delta.md`, and release
judgement nowhere in the spec pack.

## Implementation approach

The control core is split as `01_Spec.md` `## Design` states:

- a decision function that performs no I/O;
- a persistence layer that is the only writer;
- observers that are the only readers of the environment;
- a thin command adapter.

The contracts are CLI-WF (`.qfai/contracts/cli/qfai-workflow.md`) and CLI-WFFILE
(`.qfai/contracts/cli/workflow-files.schema.md`).

### Architectural elements

Each element is a module other code goes through. The usages below trace
behavioural obligations; rules, contract sections and interactions are not
independent production consumers. Count production modules that depend on an
element when it lands. The usual floor is three such consumers.

The pure `decide(snapshot, input, facts)` boundary in `01_Spec.md` `## Design`
is a narrow exception to that floor. `TC-0018-0001` observes it directly at
`L1`, before the command adapter exists, so the first TDD row introduces
`decide.ts` with fewer than three production consumers. U1 still wires the
command adapter through this function. Other helpers and the completed U1
adapter retain their own consumer review.

| Element                             | File                                                                                                                                                    | Usages                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Command adapter                     | `packages/qfai/src/cli/commands/workflow.ts`, with the known-command entry and usage in `cli/main.ts` and `--run` in `cli/lib/args.ts`                  | The seven operations of CLI-WF `## Command line` (BR-0018-0017); one JSON document per call (BR-0018-0018); request text only as a file under `.qfai/runs/` (BR-0018-0086); `qfai-run`, which calls every operation (BR-0018-0010)                                                                                                               |
| Decision function and state machine | `packages/qfai/src/core/workflow/decide.ts`                                                                                                             | The edge table (BR-0018-0077); compare-and-set at `accept` (BR-0018-0032); decision identity and `answer-conflict` (BR-0018-0060); completion from `ready` only (BR-0018-0022); the `write-scope` judgement over `scope.writeAreas` and `recordAreas` (BR-0018-0033, BR-0018-0123); the cumulative run change boundary (BR-0018-0127)            |
| Persistence                         | `packages/qfai/src/core/workflow/persistence.ts`: the journal, lock, snapshot, tracked summary and authorization files, and the keyed digest            | The journal as the canonical record (BR-0018-0073); one writing run per worktree and lock takeover (BR-0018-0069); integrity faults ending `failed` (BR-0018-0072); sanitized tracked evidence (BR-0018-0120)                                                                                                                                    |
| Payload parsers                     | `packages/qfai/src/core/workflow/parse.ts`                                                                                                              | The route proposal checked at `accept` (BR-0018-0008); agent-written approvals refused by shape (BR-0018-0059); the schema agreement of CLI-WFFILE `## Shipped schemas` (BR-0018-0121)                                                                                                                                                           |
| Plans and correspondence            | `packages/qfai/src/core/workflow/plans.ts`: the plan loader, the installed-copy comparison, and triggers (b) and (c)                                    | Built-in plans and load refusals (BR-0018-0099); a cause found at `start` (BR-0018-0096); the check at every write operation after an upgrade, which the CLI-WF `## Fail-closed` causes table names for `contract-undeclared` and `reviewer-missing`; `qfai init`'s upgrade report, which runs the same check (CLI-INIT `### Upgrade conflicts`) |
| Observers                           | `packages/qfai/src/core/workflow/observe.ts`: git through argv, the ledger row set, fingerprints, in-process validate, and the `recordAreas` derivation | Findings against the `start` baseline (BR-0018-0023); RED surviving a production change (BR-0018-0068); the ledger row-set check (BR-0018-0040, BR-0018-0041); the stage's own record areas (BR-0018-0123); path, type, mode and digest facts for the run change boundary (BR-0018-0127)                                                         |
| `workflow.mode` normalization       | `packages/qfai/src/core/config.ts`                                                                                                                      | The key and its default (BR-0018-0094); `off` and `shadow` creating no run (BR-0018-0091); an invalid mode refused at `start` (BR-0018-0095); `qfai init`'s mode line, which reads the key (BR-0003-0052); the config issue of CLI-VAL `## Workflow mode setting`                                                                                |

Two elements sit on a trust boundary, which `.agents/rules/minimal-implementation.md`
§ 2 keeps whatever else is trimmed:

- the command adapter is the process entry. It refuses an unknown flag and an
  `--in` path outside `.qfai/runs/`, and turns every failure into the CLI-WF
  output document;
- the payload parsers read file content the harness wrote. They require
  exactly `{ kind, ref }` entries in both route reference arrays, the closed
  kinds and field-specific allowances in CLI-WF, and no legacy string form.
  They parse into types that cannot hold an invalid value, so `decide.ts`
  carries no branch for one. The shipped route-proposal schema agrees with
  these shape refusals.

At `accept`, `decide.ts` uses the declared kind, never punctuation or an
observer-map key, to classify a reference. It treats a missing path-existence
fact as a failed observation for `path` and `evidence`, including an
extensionless root file. `observe.ts` supplies current path facts; a symbolic
`request` does not require one. U2's `qfai-run` routing reference emits the
same tagged shape in both arrays.

The observers reuse what the repository already has:

- `core/gitChanges.ts` for git reads;
- the existing ledger parser for the row set;
- `hashAssistantAssetText` for every digest of a tracked input;
- `validateProject()` for validate.

For `qfai_done`, `finish` reads Git's tracked state after the caller commits
the run's changes and workflow evidence. It returns `uncommitted` before any
completion event when a tracked file remains dirty. On success, persistence
appends `completed` to the runtime journal and updates the runtime snapshot;
it does not rewrite tracked `summary.json`. `status` derives the current state
from that journal. The same runtime-only completion step serves `working_tree`
without a commit requirement (BR-0018-0128, BR-0018-0129).

The `ajv` 8 validator is a `packages/qfai` devDependency for the schema
agreement test only, and its licence is checked when it is added. No runtime
dependency is added.

Shipped assets are written with the core:

- `qfai-run/` and `qfai-maintain/` under
  `packages/qfai/assets/init/.qfai/assistant/skills/`;
- the five plan files under
  `packages/qfai/assets/init/.qfai/assistant/process/workflows/`;
- the five schemas under `packages/qfai/assets/schemas/workflow/`.

### Implementation order

The batch lands in six units, in this order. All of them go to one draft pull
request. It is marked ready, and merged, only when every lane is green.

| Unit | What lands                                                                                                                                                                                                       | After  |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| U1   | The seven elements, the schemas with the devDependency, the plan assets, and their L1–L3 tests                                                                                                                   | -      |
| U2   | `qfai-run` and `qfai-maintain`; the six stage skills' `references/orchestrated-mode.md` with their Operations tables; spec-0001's shared stage-skill contract                                                    | U1     |
| U3   | Governance text in one change: the missing-test carve-out across spec-0001, spec-0011 and spec-0013; spec-0015's baselines and manifest entries; spec-0004's validator with spec-0013's triage format            | U2     |
| U4   | spec-0003's `qfai init` install, ignore lines, entry directive, provenance and upgrade report; in the same change, spec-0004's two layer reads in `validators/assistantAssets.ts` (`:616`, `:631`, BR-0004-0038) | U1, U3 |
| U5   | spec-0017's `windows-parity` job and `test:windows-parity` script, once its suite entries resolve                                                                                                                | U1, U4 |
| U6   | The ten journeys and their variants, which also discharge each stage spec's new-story E2E row                                                                                                                    | U1–U4  |

- U1 includes one contract step: the "Modules this surface adds" entries of
  CLI-WF and CLI-WFFILE move into their `- SSOT modules:` lists in the change
  that creates the files. `QFAI-CONTRACT-050` fails on a listed path that is not
  on disk.
- The plan-load tests of U1 turn green only once U2's Operations tables exist,
  because trigger (b) reads them.
- U5 does not wait for U6.

### Alternatives considered

- **`decide.ts` split into one file per operation.** Not taken. `Owning module`
  names one file per ledger row, and the implement stage reads it as the row's
  production write set. A split would re-seed most rows for a size nobody has
  measured. The ~50-line limit applies to functions, not files.
- **Shipping no JSON Schema, with the parser as the only definition.** Not taken
  (DR-0018-0003): the requirements name a shipped schema.
- **One unit for the whole batch, or one per spec.** Not taken. One unit loses
  the order the delivery constraints need, and one per spec splits the
  missing-test carve-out and the triage pair, which must land together.

### Left out of this plan

- The host wrappers, ignore lines, entry directive and upgrade report: spec-0003.
- The triage authorization check: spec-0004.
- Each stage skill's `orchestrated-mode.md` content: that skill's spec.
- The routing and review manifest entries: spec-0015.
- The `windows-latest` job: spec-0017.
- A UI contract, surface typing and product-surface review (DR-0018-0001).
- An `exec` operation or a command registry.
- Automation support on Copilot.

## Test approach

Levels follow `.qfai/assistant/catalog/test-layers.md#layer-derivation-procedure-normative`.
The oracle of a case decides its layer, and the decision function of `01_Spec.md`
`## Design` is the interface an `L1` case observes.

### What each layer proves

| Layer | What it proves                                                                                                                                                                                                                                              | Where                                                                                                 |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `L1`  | The verdict and events `decide(snapshot, input, facts)` returns: the state machine, every refusal, authorizations and their staleness, `recordAreas`, the cumulative run change boundary, routing checks, completion, and the eval's scoring and derivation | `packages/qfai/tests/unit/workflow/`, one module per business rule                                    |
| `L2`  | `EBUSY`, `EPERM` and `EACCES` mapped to `io-error` through a write function the test injects                                                                                                                                                                | `packages/qfai/tests/unit/workflow/`                                                                  |
| `L3`  | Real files, git, the lock, the ledger read with the existing parser, validate run in process, the built CLI's stdout and exit code, shipped assets, the seed fixtures and the README claim                                                                  | `packages/qfai/tests/integration/workflow/`, one module per business rule where the rule is the CLI's |
| E2E   | The ten journeys and their variants, each on a temp repository made by `qfai init`, driven through the seven operations with scripted stage results                                                                                                         | `packages/qfai/tests/e2e/`                                                                            |

- A test module holds the cases of one business rule. Cases of two rules never
  share a module.
- `runChangeBoundary.test.ts` covers the three independent L1 cases for stage
  records, core evidence and out-of-run `scope-dependency` repair. The last
  case has separate ledger rows for approval, missing approval, an unlisted
  path and digest drift. Its facts use the same `start` snapshot at the next
  write operation, `resume` and `finish`.
- `commitBeforeCompletion.test.ts` checks the `uncommitted` verdict for a
  tracked stage change, summary and authorization file separately. The built
  CLI integration cases drive each completion target through `finish` and
  `status`, comparing tracked summary bytes with the runtime journal and
  snapshot (BR-0018-0128, BR-0018-0129).
- The integration and E2E suites run the built CLI, so their CI legs build
  `dist/` first.
- The E2E journeys assert a clean fixture validate before they judge `finish`,
  so a new finding on a fresh init tree reads as a fixture failure.

### Order in which the rows go green

The implementation units above are the order of work. The rows go green in five
tiers:

| Tier | What goes green                                                                                                                                                                                                                                                       | Proven by                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | The core: decision function, persistence, observers, parsers and the command adapter (U1), except the plan-load cases                                                                                                                                                 | this spec's `L1`, `L2` and `L3` rows                         |
| 2    | The stage assets a journey passes through: the installed plans and entry directive, each plan-dispatched skill's Operations table, the manifest roles, the shared baseline (U2 to U4); and this spec's plan-load cases, TC-0018-0019, 0020, 0065, 0094, 0164 and 0186 | each owning spec's `L3` rows, and this spec's plan-load rows |
| 3    | The journeys that need no other spec's assets: US-0018-0006, US-0018-0008 and US-0018-0010 (U6)                                                                                                                                                                       | this spec's E2E rows                                         |
| 4    | Every other journey, with its variants and its stage-story annotations (U6)                                                                                                                                                                                           | this spec's E2E rows                                         |
| 5    | The stage specs' own E2E rows, closed by the tier-4 tests                                                                                                                                                                                                             | the stage specs' E2E annotations                             |

- Tier 2 waits on tier 1 in two ways:
  - this spec's plan-load cases go green only once U2's Operations tables exist,
    because trigger (b) reads them;
  - the tier-2 rows of spec-0001, spec-0003 and spec-0015 that read this spec's
    plans, `qfai-run` or plans-and-correspondence module go green only after U1.
- A tier-1 `L3` case that needs `start` to succeed builds its own minimal project
  and runs no `qfai init`: the package's plans, one stub skill per skill a plan
  names, with an Operations table covering the pairs the plans use, and a manifest
  holding the required reviewers. One shared fixture helper builds it. This covers
  TC-0018-0009, 0017, 0029, 0111, 0124, 0161, 0173, 0183, 0189 and 0237, which stay
  in tier 1 because the fixture holds the Operations tables U2 would ship.
- A case that runs `qfai init` reads the shipped skills and belongs to tier 2:
  TC-0018-0178, 0194, 0218 and 0219.
- The `windows-parity` job (U5) runs once tier 1 and spec-0003's init suite are
  green. It does not wait for the journeys.
- The routing eval runs last, after every skill description, reference and plan
  it reads has landed.

### Which journey discharges which stage story

Each stage story is discharged by a spec-0018 journey that carries the stage
story's annotation beside its own. The E2E row is the stage spec's, so this spec
adds no story or row for it.

| Stage story  | Discharged by                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------------- |
| US-0001-0010 | US-0018-0001, handover variant: the deterministic half only; the model's pickup is release evidence |
| US-0003-0029 | Every journey's `qfai init`; the upgrade half is held by spec-0003's `L3` rows                      |
| US-0004-0040 | US-0018-0001: `finish` validates the CREATE row's `Authorization-Ref`                               |
| US-0008-0009 | US-0018-0001: acceptance with a seam round trip                                                     |
| US-0008-0010 | US-0018-0003, run with an `E2E` or `Integration` defective row                                      |
| US-0010-0013 | US-0018-0004, discussion variant                                                                    |
| US-0011-0009 | US-0018-0001                                                                                        |
| US-0011-0010 | US-0018-0002 and US-0018-0003                                                                       |
| US-0011-0011 | US-0018-0002, regression variant                                                                    |
| US-0011-0012 | US-0018-0003, run with a `Unit` defective row                                                       |
| US-0012-0144 | US-0018-0001, prototype variant                                                                     |
| US-0013-0015 | US-0018-0001                                                                                        |
| US-0013-0016 | US-0018-0002                                                                                        |
| US-0013-0017 | US-0018-0001                                                                                        |
| US-0014-0021 | US-0018-0007                                                                                        |

US-0018-0003 therefore runs once per test-fix owner, which proves the layer
split of CLI-WFFILE `### Vocabulary` end to end.

### Kinds that never share a case

A case with several boundaries observes only its first failing assert. Each of
these has its own case, or its own ledger row inside a matrix case:

- each refusal code, and each member of `reasons[]` under `invalid-input` and
  `proposal-refused`;
- each fail-closed cause, and each blocker;
- each integrity fault: `torn-event`, `sequence-gap` and `hash-mismatch`;
- each crash state of the write steps;
- each `unmet[]` condition of `finish`, and each completion target;
- each edge of the state table, and each refused state-and-operation pair;
- each capability of the report, and each exit class;
- each rewritten seed.

Every code, reason and cause a case names is one the contract names. Tests hold
the literal values and parse no contract.

### Fault seeds and the routing eval

- The 24 fault seeds map to their cases through `06_Test-Cases.md`
  `## Fault seed index`. FAULT-023's init half is spec-0003's. Four cases differ
  only in setup by platform, and run in both the Linux and the Windows jobs.
- The deterministic halves of the eval are ordinary rows on every pull request:
  the seed fixtures, the token vocabulary, the safety derivation and scoring, the
  recompute of the safety-relevant list, the eval-record shape, the README claim,
  and the guard that no workflow references the runner.
- The runner is not run in CI. The maintainer runs it against each host at
  release, and its record is what the README claim check reads.
- A run is void once any input it reads changes. The record carries the digests
  of the seed file, the vocabulary and the safety list, which shows that.
- The eval measures English routing only.
- A failing case outside the safety list does not block. The verdict lists it,
  and the user accepts or rejects that list at release (`OQ-0018-0013`).
- One input is still open: the case comparing the recompute with the recorded
  safety-relevant list (`OQ-0018-0015`). It is written once the list is
  recorded.
- Parser and schema must agree on every payload example and fixture. `ajv` runs
  with `validateFormats: false` as a devDependency only.

### Findings carried on purpose

Every push goes to one draft pull request, which is merged only when every lane
is green. Each push lists the findings it is expected to show in the batch
evidence, and its CI log is checked against that list.

| Finding                                                                                  | Why it is expected                                                                | Until                               |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------- |
| `QFAI-ATDD-111` for this spec's stories and the stage stories                            | The E2E journeys do not exist yet                                                 | The tier-4 journeys land            |
| `QFAI-ATDD-112` for this spec's `L3` cases                                               | The integration tests do not exist yet                                            | ATDD writes them                    |
| The `qfai init` cases red after the U1 push: TC-0018-0178, 0194, 0218 and 0219           | `qfai init` installs stage assets U2 to U4 ship                                   | The U4 push                         |
| The plan-load cases red after the U1 push: TC-0018-0019, 0020, 0065, 0094, 0164 and 0186 | Trigger (b) reads Operations tables that U2 ships                                 | The U2 push                         |
| Acceptance tests failing at their assertion                                              | ATDD takes RED before implement turns them green                                  | The implement stage of the same row |
| A dogfood pin that moves                                                                 | A push that fixes or adds findings changes a pinned count, and is re-pinned there | The push that moves it              |

## NFR approach

- NFR-0001, NFR-0002, NFR-0015, NFR-0016 and NFR-0017: held by the existing
  guards and asset tests through BR-0018-0115 to BR-0018-0119, covering the entry
  skill's size, the asset ceiling, the distributed surface, the canonical launcher
  and the operator-facing language. A breach shows as a failing line-budget case
  in `packages/qfai/tests/assets/assets.test.ts`, a failing
  `canonicalQfaiLauncher.test.ts` or `cliMessageLanguage.test.ts`, or a
  distributed-surface guard exiting non-zero.
- NFR-0004: every measured run records the token and effort fields, `null` where
  the host exposes nothing (BR-0018-0109). A breach shows as a failing measurement
  schema case in which a `0` stands in for an unavailable field.
- NFR-0005: every safety case passes. The token vocabulary is closed
  (BR-0018-0105), the safety list is derived by its rule and recorded before the
  eval (BR-0018-0107), and scoring is per case (BR-0018-0108). A breach shows as
  an untyped token failing the vocabulary case, the recompute case disagreeing
  with the recorded list, or a safety case failing in the release eval record.
- NFR-0007: no stage is typed after the first prompt, because `qfai-run` drives
  every work order itself (BR-0018-0010). A breach shows as a journey that needs
  a stage invocation between `start` and `finish`.
- NFR-0009: fault seeds run on every pull request with no network and no paid
  model (BR-0018-0104), and the routing eval stays manual (BR-0018-0106). A breach
  shows as a fault-seed case missing from the `test` job, or the workflow guard
  finding the eval runner referenced under `.github/workflows/`.
- NFR-0010: an interrupted event write resumes from the journal or stops with a
  named integrity error (BR-0018-0072, BR-0018-0073). A breach shows as a
  crash-state case ending anywhere other than `failed` with its fault named, or
  resuming to success.
- NFR-0011: journal publish, the lock and path identity behave the same on
  Windows (BR-0018-0070, BR-0018-0071), run by the `windows-parity` job. A breach
  shows as that job failing. It turns `ci-pass` red and blocks no merge, because
  `build` is the only required check (OC-73); spec-0017's plan holds that risk.
- NFR-0012 and NFR-0013: stdout is one JSON document on every path (BR-0018-0018),
  and request text never reaches a shell (BR-0018-0086). A breach shows as a CLI
  case whose stdout does not parse, or the static ban on `exec`, `execSync` and
  `shell: true` in the workflow sources finding one.
- NFR-0014: tracked evidence holds no conversation text, secret or absolute path
  (BR-0018-0120). A breach shows as the tracked-evidence scan finding the request
  text or the temporary root path.
- NFR-0006, NFR-0008 and NFR-0018: measured, not tested. Token reduction and the
  question count are compared across the three systems at the release step, and
  the routing eval is rerun after a model, skill-description or host-behaviour
  change. No claim is made before those figures exist (OC-80). A breach shows as
  a release reached without the comparison record, or a claim made with no figure
  behind it.
- The two skills and the plans are written in the asset tree and mirrored by
  `pnpm sync:ssot` (OC-70). A breach shows as `ci:gate:ssot` reporting a
  tracked-tree difference.

## Risk mitigation

| Risk                                                                                                                                                                                                                                                                                  | Likelihood / impact | Mitigation                                                                                                                                                                                                                                                   | Trigger to act                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A repository gate passes on an agent's report rather than an observation: tests and lint are accepted from `verify.json` (D10)                                                                                                                                                        | med / high          | Only validate is `cli_observed`. Tests and lint count only from this run's verify stage copy of `verify.json`, with an independent `qa-gatekeeper` PASS (BR-0018-0019 to BR-0018-0021)                                                                       | A `finish` that completes with no independent `qa-gatekeeper` PASS in the actor history, or that accepts a `verify.json` not copied from this run's verify stage instance |
| A `host_observed` claim is trusted when nothing produces one                                                                                                                                                                                                                          | low / high          | A submitted `host_observed` is recorded as `agent_captured` or `agent_reported` and gates nothing (CLI-WF `## Fingerprints and receipts`; FAULT-008)                                                                                                         | A receipt or an authorization recorded as `host_observed` in any journal                                                                                                  |
| A run blocked on upstream drift cannot apply the approved Change Request itself                                                                                                                                                                                                       | high / low          | The run halts `blocked` on `scope-dependency`. The owning stage, invoked by name outside the run, raises the Change Request and applies it once approved, and `resume` then reissues the stage (BR-0018-0125)                                                | A run blocked on `scope-dependency` whose Change Request is approved and still has `Applied at` `-`                                                                       |
| No host has a recorded routing eval at the release commit, so the README claims none (D17)                                                                                                                                                                                            | med / med           | The paid eval is planned on both hosts. The claimed hosts equal the hosts with a passing record for the package version (BR-0018-0110, BR-0018-0111)                                                                                                         | The release commit is reached with a host lacking its record, or a model version, skill description or host invocation behaviour changes after the record (NFR-0018)      |
| An unexpected CI failure hides among the findings an intermediate push is expected to show                                                                                                                                                                                            | med / high          | Every push goes to one draft pull request. Each push lists its expected findings in the batch evidence, and its CI log is checked against that list. The pull request is marked ready, and merged, only when every lane is green                             | A CI log showing a finding not on that push's list, or any lane red when the pull request is marked ready                                                                 |
| The push carrying this batch fails the CI backlog check because a `full` count drops below its pin: `discussion-20260418170937652` is pinned at 2 and measures 0 once a newer pack is the latest, and six specs lose their `QFAI-ATDD-131` entry to their first coverage-depth matrix | high / med          | That push re-pins `full` with `--profile full --pin`. The re-pin strikes the `discussion-20260418170937652` entry and the `QFAI-ATDD-131` entries of spec-0001, 0004, 0010, 0011, 0012 and 0015 in the same change. No pin is raised to absorb a new finding | `scripts/check-dogfood-backlog.mjs` reporting a count below or above its pin                                                                                              |

## Authoring rules

- Do not add a "Status", "Progress", "TODO", "Remaining", "Done" or "WIP"
  heading. The ledger owns that, and duplicating it creates a second answer that
  drifts.
- Do not add a changelog or revision-history heading — `09_delta.md` is that
  record.
- A risk with no `Trigger to act` is a worry, not a mitigation: name the
  observation that says the mitigation is now needed.
