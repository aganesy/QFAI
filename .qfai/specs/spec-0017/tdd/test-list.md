# TDD Execution Ledger

Execution ledger for the TDD micro-cycle of this spec. `/qfai-implement` reads
this file, selects the first row with `Status = todo`, and drives the
Red/Green/Refactor cycle one row at a time.

## Producer

Rows are derived from `06_Test-Cases.md`: **one row per coverage-target TC**.
`/qfai-sdd` seeds them at Phase 2b. An empty table below is valid — it means
the spec has no coverage-target TC yet, not that the ledger is missing.

`US-*` and `CON-API-*` are **not** rows here. They are ATDD obligations,
traced by `QFAI:` annotations in the test tree per
`.qfai/assistant/catalog/test-layers.md`, and `/qfai-atdd` does not write to
this ledger.

Reseeding is a **delta**, never a regeneration: an unchanged TC's row keeps its
`TDD-ID`, `Status`, `Test file`, `Selector`, `DR-ID` and `Evidence`, and TCs
with no row yet are appended at `Status = todo`. Rewriting a row that has
already progressed would destroy the RED/GREEN evidence that proves its cycle.

The delta runs in both directions. A TC whose obligation changed has its row
returned to `todo` under the upstream-reset rule (driving `CR-*` / `DR-*` in
`DR-ID`, prior `Evidence` kept); a TC deleted upstream, or no longer a
coverage target, has its row retired the same way. Leaving a stale `done` row
hides re-implementation work, and leaving a `todo` row for a deleted TC feeds
`/qfai-implement` an obligation that no longer exists.

## Ledger

The **first** markdown table in this file is the ledger — `validateTddList`
reads it with `parseFirstMarkdownTable`. Keep it first; a table above it is
parsed as the ledger instead and raises eight
`TDDLIST_REQUIRED_COLUMN_MISSING` errors.

| TDD-ID   | TC-Refs      | Layer       | Test file                                                 | Selector                                                                                | Status | DR-ID | Evidence |
| -------- | ------------ | ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------ | ----- | -------- |
| TDD-0001 | TC-0017-0001 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0001 (TDD-0001): the verdict derives its result from the serialized needs map   | todo   | -     | -        |
| TDD-0002 | TC-0017-0002 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0002 (TDD-0002): a failed need and a cancelled need each drive the verdict to 1 | todo   | -     | -        |
| TDD-0003 | TC-0017-0003 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0003 (TDD-0003): no need is outside the verdict derivation and edge 1 is cited  | todo   | -     | -        |
| TDD-0004 | TC-0017-0004 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0004 (TDD-0004): all-succeeded and all-skipped are both accepting               | todo   | -     | -        |
| TDD-0005 | TC-0017-0005 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0005 (TDD-0005): an unrecognized need state fails closed                        | todo   | -     | -        |
| TDD-0006 | TC-0017-0006 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0006 (TDD-0006): a documentation-only change executes at most four instances    | todo   | -     | -        |
| TDD-0007 | TC-0017-0007 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0007 (TDD-0007): unneeded legs stay declared and are skipped, never removed     | todo   | -     | -        |
| TDD-0008 | TC-0017-0008 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0008 (TDD-0008): a resolvable base ref narrows the lane set with no annotation  | todo   | -     | -        |
| TDD-0009 | TC-0017-0009 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0009 (TDD-0009): a shallow clone and an unreachable base ref both fail open     | todo   | -     | -        |
| TDD-0010 | TC-0017-0010 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0010 (TDD-0010): assistant-tree Markdown is not documentation-only              | todo   | -     | -        |
| TDD-0011 | TC-0017-0011 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0011 (TDD-0011): a path in no recognized directory selects everything           | todo   | -     | -        |
| TDD-0012 | TC-0017-0012 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0012 (TDD-0012): the lint lane carries no selection condition                   | todo   | -     | -        |
| TDD-0013 | TC-0017-0013 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0013 (TDD-0013): a condition on a dependency makes the required job skippable   | todo   | -     | -        |
| TDD-0014 | TC-0017-0014 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0014 (TDD-0014): zero own-CI jobs lack a reachable permission block             | todo   | -     | -        |
| TDD-0015 | TC-0017-0015 | Unit        | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0015 (TDD-0015): reachability and declaration are two different measurements    | todo   | -     | -        |
| TDD-0016 | TC-0017-0016 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0016 (TDD-0016): exactly two permission blocks depart from minimal scope        | todo   | -     | -        |
| TDD-0017 | TC-0017-0017 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0017 (TDD-0017): removing both blocks exits 1 naming the workflow and the job   | todo   | -     | -        |
| TDD-0018 | TC-0017-0018 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0018 (TDD-0018): restoring either one of the two blocks returns exit 0          | todo   | -     | -        |
| TDD-0019 | TC-0017-0019 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0019 (TDD-0019): every checkout step refuses to persist credentials             | todo   | -     | -        |
| TDD-0020 | TC-0017-0020 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0020 (TDD-0020): deleting the flag from one checkout step exits 1               | todo   | -     | -        |
| TDD-0021 | TC-0017-0021 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0021 (TDD-0021): full history is job-scoped, never a workflow default           | todo   | -     | -        |
| TDD-0022 | TC-0017-0022 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0022 (TDD-0022): every action reference is a full-SHA pin                       | todo   | -     | -        |
| TDD-0023 | TC-0017-0023 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0023 (TDD-0023): a planted floating reference exits 1 and is named              | todo   | -     | -        |
| TDD-0024 | TC-0017-0024 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0024 (TDD-0024): a readable pin trailer stays legal and no guard is widened     | todo   | -     | -        |
| TDD-0025 | TC-0017-0025 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0025 (TDD-0025): a durable repository artifact names the pin bump owner         | todo   | -     | -        |
| TDD-0026 | TC-0017-0026 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0026 (TDD-0026): no root bump configuration, and the owner is recorded anyway   | todo   | -     | -        |
| TDD-0027 | TC-0017-0027 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0027 (TDD-0027): the frozen-lockfile literal appears once, in one definition    | todo   | -     | -        |
| TDD-0028 | TC-0017-0028 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0028 (TDD-0028): no toolchain job restates a preamble step inline               | todo   | -     | -        |
| TDD-0029 | TC-0017-0029 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0029 (TDD-0029): the shared definition keeps its four-step order and re-shim    | todo   | -     | -        |
| TDD-0030 | TC-0017-0030 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0030 (TDD-0030): no workflow-level Node version literal survives                | todo   | -     | -        |
| TDD-0031 | TC-0017-0031 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0031 (TDD-0031): the shared definition never enters the shipped asset tree      | todo   | -     | -        |
| TDD-0032 | TC-0017-0032 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0032 (TDD-0032): the build is produced once and downloaded by the rebuild legs  | todo   | -     | -        |
| TDD-0033 | TC-0017-0033 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0033 (TDD-0033): a cost claim with no captured numbers does not satisfy it      | todo   | -     | -        |
| TDD-0034 | TC-0017-0034 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0034 (TDD-0034): a recorded regression with the rebuilds kept is accepting      | todo   | -     | -        |
| TDD-0035 | TC-0017-0035 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0035 (TDD-0035): an asserted regression with no numbers is not accepting        | todo   | -     | -        |
| TDD-0036 | TC-0017-0036 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0036 (TDD-0036): the required-context job keeps its name and unconditionality   | todo   | -     | -        |
| TDD-0037 | TC-0017-0037 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0037 (TDD-0037): a rename or an added dependency condition is reported          | todo   | -     | -        |
| TDD-0038 | TC-0017-0038 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0038 (TDD-0038): no verification-set item is weakened by continue-on-error      | todo   | -     | -        |
| TDD-0039 | TC-0017-0039 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0039 (TDD-0039): the report upload skips on cancellation and ages out sooner    | todo   | -     | -        |
| TDD-0040 | TC-0017-0040 | Unit        | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0040 (TDD-0040): retention 7 passes, retention 8 and an unconditional run fail  | todo   | -     | -        |
| TDD-0041 | TC-0017-0041 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0041 (TDD-0041): layer separation adds no workflow file and no check name       | todo   | -     | -        |
| TDD-0042 | TC-0017-0042 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0042 (TDD-0042): the aggregate verdict check name is immutable                  | todo   | -     | -        |
| TDD-0043 | TC-0017-0043 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0043 (TDD-0043): selection creates, removes and renames no check name           | todo   | -     | -        |
| TDD-0044 | TC-0017-0044 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0044 (TDD-0044): the hygiene lane exits 0 over the hardened own tree            | todo   | -     | -        |
| TDD-0045 | TC-0017-0045 | Unit        | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0045 (TDD-0045): the own-tree hygiene rule set is closed at exactly five        | todo   | -     | -        |
| TDD-0046 | TC-0017-0046 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0046 (TDD-0046): a green run names every rule it evaluated                      | todo   | -     | -        |
| TDD-0047 | TC-0017-0047 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0047 (TDD-0047): an unevaluated rule is absent, not implied by the green run    | todo   | -     | -        |
| TDD-0048 | TC-0017-0048 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0048 (TDD-0048): each planted violation exits 1 naming file, job and rule       | todo   | -     | -        |
| TDD-0049 | TC-0017-0049 | Unit        | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0049 (TDD-0049): hygiene findings use the bare lint namespace                   | todo   | -     | -        |
| TDD-0050 | TC-0017-0050 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0050 (TDD-0050): the lane scans both roots and reports shipped paths as such    | todo   | -     | -        |
| TDD-0051 | TC-0017-0051 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0051 (TDD-0051): a shipped-only violation exits 1 naming the shipped path       | todo   | -     | -        |
| TDD-0052 | TC-0017-0052 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0052 (TDD-0052): shipped coverage never precedes the shipped hardening          | todo   | -     | -        |
| TDD-0053 | TC-0017-0053 | Unit        | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0053 (TDD-0053): the shipped third-party rule is allow-list membership          | todo   | -     | -        |
| TDD-0054 | TC-0017-0054 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0054 (TDD-0054): an unsanctioned third-party reference exits 1                  | todo   | -     | -        |
| TDD-0055 | TC-0017-0055 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0055 (TDD-0055): the lane is invoked from an aggregate pull requests execute    | todo   | -     | -        |
| TDD-0056 | TC-0017-0056 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0056 (TDD-0056): the lane is absent from the release-only aggregate             | todo   | -     | -        |
| TDD-0057 | TC-0017-0057 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0057 (TDD-0057): the expected-context declaration is read from the tree         | todo   | -     | -        |
| TDD-0058 | TC-0017-0058 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0058 (TDD-0058): a declared context resolving to no job exits 1                 | todo   | -     | -        |
| TDD-0059 | TC-0017-0059 | Integration | packages/qfai/tests/scripts/workflowHygiene.test.ts       | TC-0017-0059 (TDD-0059): skippable-through-a-dependency and a shrunk set both exit 1    | todo   | -     | -        |
| TDD-0060 | TC-0017-0060 | Integration | packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts  | TC-0017-0060 (TDD-0060): every runner project declares the full knob set                | todo   | -     | -        |
| TDD-0061 | TC-0017-0061 | Integration | packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts  | TC-0017-0061 (TDD-0061): the declared starting value is ten on both axes                | todo   | -     | -        |
| TDD-0062 | TC-0017-0062 | Integration | packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts | TC-0017-0062 (TDD-0062): the three slice surfaces hold one set of seven names           | todo   | -     | -        |
| TDD-0063 | TC-0017-0063 | Integration | packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts | TC-0017-0063 (TDD-0063): the deleted project name no longer resolves                    | todo   | -     | -        |
| TDD-0064 | TC-0017-0064 | Integration | packages/qfai/tests/scripts/sliceSurfaceAlignment.test.ts | TC-0017-0064 (TDD-0064): the two missing per-slice scripts exist and are used           | todo   | -     | -        |
| TDD-0065 | TC-0017-0065 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0065 (TDD-0065): the adopted worker value matches the recorded measurement      | todo   | -     | -        |
| TDD-0066 | TC-0017-0066 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0066 (TDD-0066): a slower or flakier higher value keeps the lower one           | todo   | -     | -        |
| TDD-0067 | TC-0017-0067 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0067 (TDD-0067): revising the declared starting value needs the sign-off        | todo   | -     | -        |
| TDD-0068 | TC-0017-0068 | Integration | packages/qfai/tests/scripts/vitestWorkspaceKnobs.test.ts  | TC-0017-0068 (TDD-0068): the runner workspace carries zero retry settings               | todo   | -     | -        |
| TDD-0069 | TC-0017-0069 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0069 (TDD-0069): one tuning change per pull request, behind three green runs    | todo   | -     | -        |
| TDD-0070 | TC-0017-0070 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0070 (TDD-0070): a rerun-to-green rate above one in twenty reopens it           | todo   | -     | -        |
| TDD-0071 | TC-0017-0071 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0071 (TDD-0071): exactly one workflow is triggered by a pull request            | todo   | -     | -        |
| TDD-0072 | TC-0017-0072 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0072 (TDD-0072): the folded run uses the local binary, not the published one    | todo   | -     | -        |
| TDD-0073 | TC-0017-0073 | Integration | packages/qfai/tests/scripts/ownWorkflowTopology.test.ts   | TC-0017-0073 (TDD-0073): the folded run joins the enumerated verification set           | todo   | -     | -        |
| TDD-0074 | TC-0017-0074 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0074 (TDD-0074): deleting the copy with no shipped-set gate is rejected         | todo   | -     | -        |
| TDD-0075 | TC-0017-0075 | Integration | packages/qfai/tests/assets/actionPinBumpOwner.test.ts     | TC-0017-0075 (TDD-0075): the gate is present at or before the deletion                  | todo   | -     | -        |
| TDD-0076 | TC-0017-0076 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0076 (TDD-0076): the mapping file exists in both trees and is cross-linked      | todo   | -     | -        |
| TDD-0077 | TC-0017-0077 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0077 (TDD-0077): the mapping file header disclaims the layer-policy loader      | todo   | -     | -        |
| TDD-0078 | TC-0017-0078 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0078 (TDD-0078): the mapping file does not read as activating routing           | todo   | -     | -        |
| TDD-0079 | TC-0017-0079 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0079 (TDD-0079): the vocabulary warning count is unchanged after it lands       | todo   | -     | -        |
| TDD-0080 | TC-0017-0080 | Unit        | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0080 (TDD-0080): the built-in layer token set is unmodified                     | todo   | -     | -        |
| TDD-0081 | TC-0017-0081 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0081 (TDD-0081): authoring in the asset tree passes both mirror gates           | todo   | -     | -        |
| TDD-0082 | TC-0017-0082 | Integration | packages/qfai/tests/assets/layerCiLaneMapping.test.ts     | TC-0017-0082 (TDD-0082): a root-only edit is reverted and fails the tracked-tree diff   | todo   | -     | -        |

## Schema

Required columns, in the order used above:

| Column    | Description                                                  |
| --------- | ------------------------------------------------------------ |
| TDD-ID    | `TDD-NNNN`, unique within this spec                          |
| TC-Refs   | Test cases from `06_Test-Cases.md` this row implements       |
| Layer     | `Unit`, `Component`, `Integration`, `API` or `E2E`           |
| Test file | Project-root-relative path to the test module                |
| Selector  | Test selector/description for targeted execution             |
| Status    | `todo` / `red` / `green` / `refactor` / `done` / `exception` |
| DR-ID     | Decision Record ID for exception rows (`-` otherwise)        |
| Evidence  | RED/GREEN command+result pairs proving the TDD cycle         |

See `.qfai/assistant/skills/qfai-sdd/references/spec-traceability-rules.md`
for the full rules.

## Seeding notes (spec-0017, CHG-007)

- 82 rows, one per test case in `06_Test-Cases.md`, all at `Status = todo`. The eleven
  coverage-target rows — TDD-0002, TDD-0004, TDD-0005, TDD-0010, TDD-0011, TDD-0015, TDD-0040,
  TDD-0045, TDD-0049, TDD-0053 and TDD-0080 — are the `Unit` ones, and each is required to be here
  or `TDDLIST_TC_NOT_COVERED` fires at `error`. The 71 `Integration` rows are seeded as well, which
  matches the existing instances in this repository and keeps `/qfai-implement` able to drive the
  whole set from one ledger.
- `Layer` uses the capitalized word form (`Unit` / `Integration`) per the layer crosswalk in
  `.qfai/assistant/catalog/test-layers.md`; `06_Test-Cases.md#Level` uses the lowercase word form
  that the layer-policy check accepts. The two spellings are the same layer.
- Every `TC-*` — including the `Unit` rows — is still discharged from the ATDD integration scan
  root for `QFAI-ATDD-112` until the scanner supports per-level routing. That root resolves to the
  tracked repository-root `tests/integration/` annotation ledger — settled at review round 8 and
  recorded in `08_Open-questions.md` under `OQ-0017-0006` (`resolved`); the `Test file` values below follow
  `16_Traceability-ledger.md` § `Planned bindings` and `10_Plan.md` § `Test approach`, and every
  one of them is to be created.
- `Test file` groups rows by the artifact whose obligation they verify rather than by spec, per
  `.qfai/assistant/catalog/test-layers.md` § `Test-file granularity`: workflow topology, the
  hygiene lane and its declaration check, the runner workspace knobs, the slice surfaces, the
  layer-to-CI-lane mapping, and the decision-record obligations whose only durable artifact is
  `07_Decisions.md`.
- Rows whose oracle is a governance record — sequencing edges, measurement records, sign-off — are
  filed against `packages/qfai/tests/assets/actionPinBumpOwner.test.ts` because that is the test
  file `16_Traceability-ledger.md` already binds to `07_Decisions.md`. They assert that the record
  exists and says what the rule requires; they do not simulate a merge.
