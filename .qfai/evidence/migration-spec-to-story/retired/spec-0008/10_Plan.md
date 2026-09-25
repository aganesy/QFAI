# 10 Plan

## Implementation approach

1. Define ATDD skill contract based on SKILL.md SSOT
2. Implement TestVolumeEstimator signal table generation
3. Implement layer-specific test generation (E2E -> US, API -> CON-API, Integration -> TC)
4. Implement annotation validation and forbidden reference enforcement
5. Implement stage gate enforcement (P0-P8)
6. Implement evidence file generation

### Story-tree layout

Every row of this change lands at P7, the cutover step that also carries the
skill rewrites. Nothing in this spec changes before then. The work is done in
this order:

1. **Scaffold options** in `packages/qfai/src/cli/commands/atddScaffold.ts`,
   `packages/qfai/src/cli/lib/args.ts` and
   `packages/qfai/src/cli/main.ts`. The argument parser accepts `--story` and
   `--flow` for `atdd scaffold`, and the main dispatch passes them to the
   command without requiring `--spec`.
   The command takes exactly one of `--story US-NNNN-NNNN` and
   `--flow BF-NNNN`. The ID is parsed with the story-tree ID grammar in
   `packages/qfai/src/core/storyTree/ids.ts` and resolved against the tree
   `packages/qfai/src/core/storyTree/tree.ts` reads. Neither option, both, a
   malformed ID, or an ID the tree does not define exits 2 before anything is
   written. `--spec` exits 2 with a message naming `--story` and `--flow`.
   Exit 1 is kept for a runtime failure reading or writing a file
   (BR-0008-0008, EX-0008-0014, `qfai-atdd-scaffold.md#story-tree-layout`).
   In the same step, `packages/qfai/src/cli/lib/exitCodes.ts` moves
   `atdd scaffold` out of the "other commands" row of the exit-code help into
   a row of its own: 0 for success, 1 for a runtime read or write failure,
   and 2 for a usage error or an ID the tree does not define.
2. **Skeleton targets** in `packages/qfai/src/core/atdd/scaffold.ts`. The TC
   entry becomes an AC or BF target. An AC skeleton goes to
   `<testsDir>/integration/<US-ID>/<AC-ID>.test.<ext>` carrying
   `QFAI:AC-NNNN-NNNN-NN`, and a flow skeleton to
   `<testsDir>/e2e/<BF-ID>.test.<ext>` carrying `QFAI:BF-NNNN` (BR-0008-0008,
   BR-0008-0013, EX-0008-0009, EX-0008-0015). Both homes come from
   `atddTestKindDirs`, the crosswalk the obligation families read, so each
   skeleton sits in the layer that discharges it. The existing create-only
   write and the dialect handling in `scaffoldDialect.ts` are kept.
3. **Escalation and placeholder** in `packages/qfai/src/core/atdd/scaffoldEscalation.ts`
   and `packages/qfai/src/core/validators/scaffoldPlaceholder.ts`. Cycles are
   counted per AC ID or BF ID, and `D-SCAFFOLD-PLACEHOLDER` is keyed the same
   way (BR-0008-0009, EX-0008-0010, `qfai-validate.md#atdd-scaffold-findings`).
   `D-SCAFFOLD-FOREIGN-HOME` is retired (N35): an ID shape fixes its home.
4. **The REMOVE row.** The `QFAI:SPEC-*` and `QFAI:CON-API` annotation
   obligations and the TC forbidden-reference rule leave
   `packages/qfai/src/core/atddTraceability.ts`. The directory-to-layer
   crosswalk stays in that file (P3-D14). The ledger rows the REMOVE row
   retires are tombstoned in the same commit.
5. **Skill text** in `packages/qfai/assets/init/.qfai/assistant/skill/qfai-atdd/`:
   - `SKILL.md`, `references/cross-spec-obligations.md` and
     `references/scaffolding.md` gate on
     `qfai validate --profile atdd --fail-on error --flow BF-NNNN` for the flow
     the invocation owns (BR-0008-0014, EX-0008-0016).
   - The coverage obligations become BF from E2E and AC from integration or API
     (BR-0008-0001, BR-0008-0003, EX-0008-0001, EX-0008-0002, EX-0008-0005).
   - The ATDD evidence file and the Coverage Depth Matrix are written per flow,
     to `.qfai/evidence/atdd-<BF-ID>.md` and
     `.qfai/evidence/coverage-depth-<BF-ID>.md`, with matrix rows keyed by the
     flow's US, AC and EX IDs (BR-0008-0007, EX-0008-0008, EX-0008-0018). The
     `test-design-analyst` card states the same file names.

An annotation naming an ID the tree does not define (BR-0008-0005,
EX-0008-0017) is reported by validate's undeclared-annotation family
(`qfai-validate.md#finding-families`). This spec adds no code for it and proves
it from the ATDD side.

**Architectural elements.** This spec introduces one: the command contract
`.qfai/contracts/cli/qfai-atdd-scaffold.md`, whose `#story-tree-layout`
section states the options, the rejections and exit codes, the skeleton homes
and the escalation key. Its usages:

- the options and their rejections: AC-0008-0010, BR-0008-0008, EX-0008-0014
- the flow skeleton: AC-0008-0015, BR-0008-0013, EX-0008-0015
- the escalation and placeholder keyed by AC or BF ID: AC-0008-0011,
  BR-0008-0009, EX-0008-0010

It consumes elements that land at P3 under spec-0001 and spec-0004:

| Consumed                                   | Used here for                                        |
| ------------------------------------------ | ---------------------------------------------------- |
| Story-tree ID grammar, `storyTree/ids.ts`  | Parsing `--story` and `--flow` values (EX-0008-0014) |
| Story-tree reader, `storyTree/tree.ts`     | A story's ACs and a flow's existence (EX-0008-0009)  |
| Flow scope, `--flow` on `qfai validate`    | The completion gate (EX-0008-0016)                   |
| `resolveTestKind` in `atddTraceability.ts` | Agreement between skeleton homes and obligations     |

`resolveTestKind(filePath, roots)` is the existing private path-to-kind
function exported at P3. `atddAcceptanceLayerFilter` already calls it and
keeps its `kind !== null` check. The obligation and misplaced-annotation
families (EX-0004-0072 to EX-0004-0075), the acceptance-file filter consumed
in `core/validate.ts`, and migration step 8 (EX-0018-0064) use that path
classifier. `resolveAtddHomeKind` keeps its separate TC `Level`-to-kind
purpose. The scaffold keeps reading `atddTestKindDirs` from the same file
rather than a map of its own.

**Alternatives rejected.**

- Keeping `--spec` beside `--story`: rejected by N19 and the user's answer Q2.
  `--spec` exits 2 on the story tree, with a message naming `--story` and
  `--flow`.
- A scaffold-owned directory map: two maps of the same crosswalk drift, and the
  first sign would be a filled skeleton failing the misplaced-annotation check.

## Test approach

- Unit tests: annotation parsing, volume estimation logic
- Integration tests: coverage obligation verification, forbidden reference detection
- E2E tests: full ATDD workflow from spec input to evidence output

### Story-tree layout

Every new case is L3 (Integration). No case lands at L1, L2 or L4. The E2E
story rows (TDD-0019 to TDD-0026) stay as they are.

| Case         | How it is proven                                                                                                                                                                                                                                                                                                        |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TC-0008-0019 | `runAtddScaffold` in-process on a `mkdtemp` story-tree fixture; one ledger row per rejection reason (no option, both options, malformed ID, undefined ID); each asserts exit 2 and an empty `<testsDir>`, and the no-option row also runs `--spec spec-NNNN` alone and asserts the message names `--story` and `--flow` |
| TC-0008-0020 | The same fixture; `--flow` writes one E2E skeleton, validate over it reports only `D-SCAFFOLD-PLACEHOLDER` keyed by the BF ID, and a second run leaves it byte-equal                                                                                                                                                    |
| TC-0008-0021 | Reads the shipped `SKILL.md`; asserts the `--flow` gate for the story tree and no `--spec` gate for that tree                                                                                                                                                                                                           |
| TC-0008-0022 | `qfai validate` on a fixture holding three undefined annotations and one defined control annotation; one ledger row reports the undefined BF, AC and EX annotations (one selector entry each), one accepts the defined annotation                                                                                       |
| TC-0008-0023 | Reads the shipped skill text and the `test-design-analyst` card; asserts the per-flow file names and no per-spec file name for the story tree                                                                                                                                                                           |

TC-0008-0013 and TC-0008-0014 keep their text until P7, then move to `--story`
with the scaffold (X2).

Boundary cases that get their own case, not a shared one:

- each of the four rejection reasons of the scaffold: no option (with
  `--spec spec-NNNN` alone as a second input to the same check), both
  options, the malformed `--story US-12`, and a well-formed `--flow` naming
  no flow
- a rerun over a filled skeleton and a rerun over a placeholder skeleton
- escalation across two skeletons, where only the unfilled one escalates
- an undefined ID beside a defined one, so the zero-finding side is proven too

The tests that pin today's wording change in the same P7 commit as the text
they read. Among them: `tests/assets/perSpecGateScope.test.ts`,
`tests/assets/atddDbContractObligationLists.test.ts`,
`tests/assets/coverageDepthMatrixHome.test.ts`,
`tests/integration/atddSkillSpec0008.test.ts` and the three
`tests/integration/atddScaffold*.test.ts` suites.

## NFR approach

For a project on the story tree:

- **NFR-0001 coverage completeness.** Every BF in scope has an E2E test and
  every AC an integration or API test. Validate's test-obligation family
  enforces it. Breach measurement: `qfai validate --profile atdd --fail-on error
--flow BF-NNNN` reports a test-obligation error for the flow.
- **NFR-0002 annotation consistency.** A skeleton carries the annotation its
  layer owes. Breach measurement: the TC-0008-0020 fixture reports a
  misplaced-annotation or undeclared-annotation finding against a fresh
  skeleton.
- **NFR-0003 forbidden references.** On the story tree the directory fixes the
  layer, and a BF or AC annotation in the wrong layer is an error (N04). The
  NFR is restated at landing as "zero `QFAI:AC-`/`QFAI:EX-` annotations in
  E2E test files; zero `QFAI:BF-` outside E2E". Breach measurement: a
  misplaced-annotation finding in a scaffolded tree.
- **NFR-0004 evidence completeness.** One evidence file and one matrix per
  flow. Breach measurement: TC-0008-0023 finds a per-spec file name for the
  story tree, or a flow run leaves no `atdd-<BF-ID>.md`.

## Dependencies

- Requires: spec artifacts (US/TC/CON-API declarations) from `/qfai-sdd`
- Consumed by: `/qfai-implement` for unit/component TDD cycle

### Story-tree layout

- Requires, from P3: the ID grammar and the tree reader (spec-0001), `--flow`
  and the test-obligation families (spec-0004), and the layer-kind export in
  `atddTraceability.ts`.
- Requires, from P6: the `skill/` and `agent/` directories of the assistant
  tree.
- Consumed by: `/qfai-implement` (spec-0011), which writes the EX tests, and
  migration step 8 (spec-0018), which rewrites old annotations into the forms
  these skeletons carry.

## Risk mitigation

- Coverage obligation definitions may evolve as contract schema changes
- Mitigation: Use SKILL.md as SSOT and adapt obligation parsing accordingly

### Story-tree layout

| Risk                                                                                                                       | Likelihood / impact | Mitigation                                                                                                                  | Trigger to act                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| The scaffold home disagrees with the obligation crosswalk                                                                  | low / high          | Homes come from `atddTestKindDirs`; TC-0008-0020 runs validate over the written skeleton                                    | A scaffolded skeleton raises a misplaced-annotation error                                                         |
| A test pinning the `--spec` gate or a per-spec evidence name is left on the old wording                                    | med / med           | The pinned tests change in the P7 commit that rewrites the skill text; each rewritten test keeps a negative assertion       | `grep -rn "fail-on error --spec" packages/qfai/assets/init/.qfai/assistant/skill/qfai-atdd` is non-empty after P7 |
| The new `todo` integration cases and E2E rows raise `QFAI-ATDD-111` and `QFAI-ATDD-112` on this repository's dogfood lanes | high / med          | No pin (user answer P3-C1). This change also runs `/qfai-atdd` and `/qfai-implement`, and their tests land before it merges | A dogfood lane reports either code for spec-0008 when the change is made ready to merge                           |
| The ledger's `Owning module` cells name `skill/` paths, which exist only from P6; the older `skills/` cells go stale at P6 | high / low          | Cells name the path the module has when the row's work lands. The P6 rename commit repoints the older cells                 | `grep -rn "assistant/skills/" .qfai/specs/*/tdd/test-list.md` is non-empty after the P6 commit                    |

## CHG-006 (2026-05-27) — v1.9.2 Second-Wave (atdd scaffold)

- How (REQ-0157 / US-0008-0007): `qfai atdd scaffold --spec spec-NNNN` は spec の test*cases を列挙し、各 TC につき `tests/atdd/spec-NNNN/<TC-ID>.test.*`を生成する。ファイル内容は project の test-framework primitives import +`// TODO: implement assertion for <TC-ID>` + 関連 US-\* / CON-API-\_ の comment 参照。
- Idempotency: 書き込み前に既存ファイルを読み、TODO marker がもう存在しない (= operator が埋めた) 場合は skip。TODO marker が残るか、ファイル不在の場合のみ (再)生成する。
- Placeholder lifecycle: `qfai validate` は TODO marker を grep し `D-SCAFFOLD-PLACEHOLDER` (warning) を emit。validate cycle count を per-placeholder で追跡し、`atdd.scaffoldEscalateCycles` (既定 3 / DR-0272) 到達時に severity を error へ昇格する。

## CHG-007 (2026-08-05) — worker-scoped credential-reuse guidance

- How (REQ-0024 / US-0008-0008): author one reference artifact under the shipped `/qfai-atdd` skill's `references/` directory (sibling of the existing depth checklist) holding the seven session-reuse rules, the companion caller-injected-environment rule, and the credential-class script-naming rule. Cross-link it from the skill entry point so the rules are reachable without reading the whole skill.
- Nothing else is built. There is no validator, no finding-code registration, no config key, no CLI flag and no annotation token in this change — the deliverable is prose. Do not add a `D-*` / `R-*` code to make the rules enforceable; enforcement was not requested and would grow the vocabulary NFR-0015 freezes.
- Backend agnosticism is asserted, not assumed: the test carries a deny-list of browser-backend names plus install-command and version-pin shapes, and includes a planted-name fixture so the zero-match assertion is falsifiable.
- Distributed-surface care: the artifact ships under `assets/`, so it must carry no internal spec / capability / decision / open-question identifier and no version marker beyond the canonical package version. Authoring it only in the repository-root mirror would be reverted by the asset sync.
- Scope containment: the artifact's own scope statement names E2E / API / Integration. It must not describe a unit or component obligation — that boundary is a recorded rejection, not a simplification.
