# 10 Plan

## Implementation approach

1. Define ATDD skill contract based on SKILL.md SSOT
2. Implement TestVolumeEstimator signal table generation
3. Implement layer-specific test generation (E2E -> US, API -> CON-API, Integration -> TC)
4. Implement annotation validation and forbidden reference enforcement
5. Implement stage gate enforcement (P0-P8)
6. Implement evidence file generation

### Intent-driven entry (CAP-0018)

This change introduces no architectural element. It writes `qfai-atdd`'s own
`references/orchestrated-mode.md` in the table format CLI-WFFILE owns.

Units and work. The order across the batch is spec-0018 `10_Plan.md` `### Implementation order`. Everything here is **U2**:

- `packages/qfai/assets/init/.qfai/assistant/skills/qfai-atdd/references/orchestrated-mode.md`,
  holding:
  - the entry check (BR-0008-0013);
  - the Operations table, `author-acceptance-tests` and `test-fix`
    (BR-0008-0014);
  - RED only at the intended assertion (BR-0008-0015);
  - cross-spec debts (BR-0008-0016);
  - the seam request (BR-0008-0017);
  - the layer decision never cached (BR-0008-0018);
  - the test-fix record and layers (BR-0008-0019, 0020, 0021).
- One citation line in `qfai-atdd/SKILL.md`, from 797 to 798 lines. Every other
  edit to it is in place.

Left out: the core's refusals of a seam, RED and ledger check (spec-0018); the
unit-layer `test_fix` (spec-0011).

## Test approach

- Unit tests: annotation parsing, volume estimation logic
- Integration tests: coverage obligation verification, forbidden reference detection
- E2E tests: full ATDD workflow from spec input to evidence output

### Intent-driven entry (CAP-0018)

Every case this change adds reads a shipped skill file, so it is `L3`. No code is
written for this spec, so there is no `L1` or `L2` case.

| Layer | What it proves                                                                                                              | Test module, one per BR, under `packages/qfai/tests/integration/atdd/orchestrated/` | TCs                        |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------- |
| `L3`  | The entry check and the one `SKILL.md` citation line                                                                        | `stageSkillHandover.test.ts` (BR-0008-0013)                                         | TC-0008-0019               |
| `L3`  | The Operations table is exactly `author-acceptance-tests` and `test-fix`                                                    | `operationsTable.test.ts` (BR-0008-0014)                                            | TC-0008-0020               |
| `L3`  | Only an assertion failure is `expected_red`                                                                                 | `redAtAssertion.test.ts` (BR-0008-0015)                                             | TC-0008-0021               |
| `L3`  | A pass with cross-spec obligations is `accepted_with_debt`, one debt each                                                   | `crossSpecDebts.test.ts` (BR-0008-0016)                                             | TC-0008-0022               |
| `L3`  | The seam round trip returns to the same stage instance                                                                      | `seamRoundTrip.test.ts` (BR-0008-0017)                                              | TC-0008-0023               |
| `L3`  | The layer decision is made from the current spec and ledger                                                                 | `layerDecisionNotCached.test.ts` (BR-0008-0018)                                     | TC-0008-0024               |
| `L3`  | A test fix leaves `Status`, `TC-Refs`, `Layer` and `Boundary` alone and appends a re-verify round                           | `testFixLedgerRow.test.ts` (BR-0008-0019)                                           | TC-0008-0025               |
| `L3`  | A change of meaning goes to `qfai-sdd` as `needs_repair`                                                                    | `testFixMeaningChange.test.ts` (BR-0008-0020)                                       | TC-0008-0026               |
| `L3`  | ATDD takes a test fix only for an acceptance-layer row                                                                      | `testFixLayers.test.ts` (BR-0008-0021)                                              | TC-0008-0027               |
| E2E   | The two stories, discharged by spec-0018 journeys (spec-0018 `10_Plan.md` `### Which journey discharges which stage story`) | the spec-0018 journey modules                                                       | US-0008-0009, US-0008-0010 |

Each row's ledger `Test file` names its module above, the per-BR split
`catalog/test-layers.md` `## Test-file granularity` asks for.

Cases that stand alone:

- No case here is matrix-shaped. Each reads one file and takes one ledger row.
- The failure-kind case (TC-0008-0021) is separate from the seam case
  (TC-0008-0023). A test that cannot reach its assertion is a seam request, not a
  RED.
- TC-0008-0027 holds the layer boundary: one `L3` test case among `L1` and `L2`
  cases makes an `Integration` row ATDD's.
- The kept failures are TC-0008-0021 (a non-assertion failure is never
  `expected_red`) and TC-0008-0026 (a change of meaning). No other failure is
  declared by this spec.

What existing guards hold, so no case is written for it:

- The workflow core's refusals at `accept`: `red-not-assertion`, `seam-passed`,
  `test-fix-meaning`, `test-fix-receipt` and `debt-owner-missing`. They are
  spec-0018's fault seeds.
- That a `blocked` seam-only result leaves the acceptance attempt open, and that
  `next` reissues the seam-only work order after `resume`. That is the core's.
  TC-0008-0023 already requires RED only after an accepted seam result.
- `discussion-20260923171450572#NFR-0003`: the 800-line asset budget holds
  `SKILL.md`, and review of the diff holds the one added line.
- No internal identifier in the shipped reference: the distributed-surface
  guards.

Order: the reference is a tier-2 stage asset, and the two E2E rows close at
tier 5, in the order spec-0018 `10_Plan.md` `### Order in which the rows go green`
sets.

Findings carried on purpose. Pushes go to one draft pull request that is merged
only when every lane is green, and each push lists its expected findings in the
batch evidence (spec-0018 `10_Plan.md` `### Findings carried on purpose`).

| Finding                                           | Why it is expected                                                                                                    | Until                            |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `QFAI-ATDD-111` naming US-0008-0009, US-0008-0010 | The journeys that discharge them do not exist yet. The finding is project-wide and charged to `.qfai/specs/spec-0001` | spec-0018's tier-4 journeys land |
| `QFAI-ATDD-112` naming TC-0008-0019..0027         | The integration tests do not exist yet. Charged the same way                                                          | ATDD writes them                 |

## Dependencies

- Requires: spec artifacts (US/TC/CON-API declarations) from `/qfai-sdd`
- Consumed by: `/qfai-implement` for unit/component TDD cycle

## NFR approach

- The legacy floors NFR-0001..NFR-0004 of `01_Spec.md` `## Applicable NFR` (coverage, annotation
  consistency, forbidden references, evidence completeness) are unchanged by the intent-driven
  entry, and their existing measurements stand.

### Intent-driven entry (CAP-0018)

- **`discussion-20260923171450572#NFR-0003`: `qfai-atdd/SKILL.md` grows by the one citation line
  only, from 797 to 798 of 800.** Met by putting every orchestrated-mode rule in
  `references/orchestrated-mode.md`. Breach: a pull-request diff that adds any other line to the
  file, or the asset line-budget check failing on it.
- **NFR-0002 and NFR-0015 for the new reference.** Met by the existing guards. Breach: the asset
  line-budget check on the reference, or one of the four distributed-surface guards reporting an
  internal identifier or a private version marker in it.

## Risk mitigation

- Coverage obligation definitions may evolve as contract schema changes
- Mitigation: Use SKILL.md as SSOT and adapt obligation parsing accordingly

### Intent-driven entry (CAP-0018)

| Risk                                                                                                               | Likelihood / impact | Mitigation                                                                                                                                                           | Trigger to act                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A `test_fix` changes the test file but writes no re-verify record, so the row reads as stale and `finish` is unmet | med / high          | The re-run is appended to the row's evidence section as a re-verify record in the form the ledger validator already reads (BR-0008-0019, DR-0008-0004)               | `QFAI-TDDLIST-009` on a row a `test_fix` touched, or `finish` listing that finding as `new` |
| A seam-only result also makes the assertion pass, landing implementation before RED                                | low / high          | The core refuses a seam-only result that passes its target test, and the acceptance stage takes RED at the assertion before it hands on the full work (BR-0008-0017) | A `seam-passed` refusal in a run's journal                                                  |
| The new stories' E2E rows wait on spec-0018 journeys that do not exist yet                                         | high / low          | spec-0018's plan orders the journeys, and the stage E2E rows close at its last tier                                                                                  | A stage E2E row still `todo` after the spec-0018 journey that discharges it is GREEN        |

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
