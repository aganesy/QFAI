# ATDD Evidence: spec-0012

## Objective

spec-0012 rev11 で追加された acceptance obligations を runnable ATDD に反映し、`QFAI-ATDD-111/112` を解消する。対象は `US-0012-0077..0083`、`TC-0012-0272..0284`。`CON-API` obligation はなし。

## Inputs reviewed (files/paths)

- `.qfai/assistant/steering/manifest.md`
- `.qfai/assistant/steering/product.md`
- `.qfai/assistant/steering/structure.md`
- `.qfai/assistant/steering/tech.md`
- `.qfai/assistant/steering/test-layers.md`
- `.qfai/specs/spec-0012/01_Spec.md`
- `.qfai/specs/spec-0012/02_User-stories.md`
- `.qfai/specs/spec-0012/03_Acceptance-Criteria.md`
- `.qfai/specs/spec-0012/05_Examples.md`
- `.qfai/specs/spec-0012/06_Test-Cases.md`
- `.qfai/specs/spec-0012/09_delta.md`
- `.qfai/specs/spec-0012/10_Plan.md`
- `.qfai/contracts/api/README.md`
- `tests/e2e/qfai-traceability.md`
- `tests/integration/qfai-traceability.md`
- `packages/qfai/tests/e2e/**`
- `packages/qfai/tests/integration/**`
- `packages/qfai/src/core/index.ts`
- `packages/qfai/src/core/harness/measurement.ts`
- `packages/qfai/src/core/harness/panelScore.ts`
- `packages/qfai/src/core/prototyping/specCoverage.ts`
- `packages/qfai/src/core/prototyping/refSemantics.ts`

## Decisions made (with rationale)

- rev11 ATDD obligation は E2E 7件 / API 0件 / Integration 13件とした。API contract は実義務がないため test 追加なし。
- 既存の prototyping 系パターンに合わせ、source-inspection 型の acceptance test を採用した。rev11 は semantic closure の確認が主で、実装 source と core test 同期の検査が acceptance objective に一致するため。
- validate が参照する annotation source は root `tests/e2e|integration/qfai-traceability.md` なので、packages 側 test 追加と同時に root traceability を更新した。
- rejected option の再導入はない。`09_delta.md` の rev11 decision に沿い、public export 再公開や legacy grammar 許容は行っていない。

## Work performed (what changed, where)

- `tests/e2e/qfai-traceability.md`
  - `QFAI:SPEC-0012:US-0012-0077..0083` を追加。
- `tests/integration/qfai-traceability.md`
  - `QFAI:SPEC-0012:TC-0012-0272..0284` を追加。
- `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts`
  - rev11 E2E test を新規追加。
  - `index.ts` export closure、`measurement.ts` strict validation、`panelScore.ts` strict validation、`specCoverage.ts` / `refSemantics.ts` semantic closure、core test synchronization を検査。
- `packages/qfai/tests/integration/prototypingRev11Integration.test.ts`
  - rev11 Integration test を新規追加。
  - `TC-0012-0272..0284` の ID 対応を spec に合わせて調整し、実装 source / core tests との一致を検査。

## Commands executed + key outputs

| Command | Outcome | Key output |
| --- | --- | --- |
| `pnpm -C packages/qfai test:e2e && pnpm -C packages/qfai test:integration` | PASS | rev11 追加分を含む focused E2E / Integration green |
| `npx qfai validate --fail-on error --format github` | PARTIAL | `QFAI-ATDD-111/112` 消滅、残り 31 errors は pre-existing / out-of-scope |
| `pnpm check-types` | PASS | type check green |
| `node scripts/verify-pack.mjs` | PASS | pack verification green |
| `pnpm exec prettier -c tests/e2e/qfai-traceability.md tests/integration/qfai-traceability.md packages/qfai/tests/e2e/prototypingRev11E2E.test.ts packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | PASS | changed files formatting green |
| `pnpm lint` | FAIL (pre-existing) | unrelated existing failures in `prototypingSkillE2E.test.ts`, `validatePipelineIntegration.test.ts` |
| `pnpm -C packages/qfai test` | FAIL (pre-existing) | existing timeout in `tests/integration/specAutoDiscovery.test.ts > TC-0014-0028` |
| `pnpm format:check` | FAIL (pre-existing) | repo-wide existing format issues |

## Test volume estimate

| Layer | Raw count | Signal | Evidence | Notes |
| --- | ---: | ---: | --- | --- |
| E2E | 7 | 7 | `.qfai/specs/spec-0012/02_User-stories.md` | `US-0012-0077..0083` |
| API | 0 | 0 | `.qfai/contracts/api/README.md` | spec-0012 rev11 に contract obligation なし |
| Integration | 13 | 13 | `.qfai/specs/spec-0012/06_Test-Cases.md` | `TC-0012-0272..0284` |

## Coverage Depth Matrix

| Obligation | Layer | Implemented in | Depth | Rationale |
| --- | --- | --- | --- | --- |
| `US-0012-0077` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | public export omission と rev11 breaking-change comment を source で直接確認 |
| `US-0012-0078` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | 8 category refs、canonical screen contract ref、`validatePanelScore` 呼び出しを検査 |
| `US-0012-0079` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | empty axes / evidenceRefs / non-concrete evidenceRef rejection root を検査 |
| `US-0012-0080` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | `01_Spec.md` only の declaration source 制約を検査 |
| `US-0012-0081` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | `isSpecDeclarationRef` grammar と consumer import を検査 |
| `US-0012-0082` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | measurement / panelScore core tests の negative synchronization を検査 |
| `US-0012-0083` | E2E | `packages/qfai/tests/e2e/prototypingRev11E2E.test.ts` | D3 | specCoverage / refSemantics core tests の semantic closure synchronization を検査 |
| `TC-0012-0272..0276` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | export removal、measurement strict validation、validation ordering を検査 |
| `TC-0012-0277..0278` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | panelScore strict validation source を検査 |
| `TC-0012-0279..0281` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | specCoverage / refSemantics semantic closure を検査 |
| `TC-0012-0282..0284` | Integration | `packages/qfai/tests/integration/prototypingRev11Integration.test.ts` | D3 | core test existence / describe synchronization を検査 |

## Coverage obligations checklist

| Obligation set | Required | Implemented | Status |
| --- | --- | --- | --- |
| E2E `US-0012-0077..0083` | 7 | 7 | PASS |
| API `CON-API-*` | 0 | 0 | PASS |
| Integration `TC-0012-0272..0284` | 13 | 13 | PASS |
| Forbidden layer references | none found | none found | PASS |
| Unknown references | none found | none found | PASS |

## Work Orders Summary

| Step | Role (sub-agent) | Task title | Input (refs) | Output (refs) | Status (PASS/REVISE) |
| ---- | ---------------- | ---------- | ------------ | ------------- | -------------------- |
| 1 | `test-design-analyst` | rev11 obligations and depth analysis | spec-0012 US/TC set, `test-layers.md`, existing tests | `#test-volume-estimate`, `#coverage-depth-matrix` | PASS |
| 2 | `qa-strategist` | layer ownership and signal review | spec-0012, contracts, traceability reports | `#test-volume-estimate`, `#coverage-obligations-checklist` | PASS |
| 3 | `acceptance-test-engineer` | implement rev11 acceptance tests | traceability registries, prototyping test patterns | changed files listed in `#work-performed-what-changed-where` | PASS |
| 4 | `devops-ci-engineer` | runtime and gate evidence capture | changed files, validate + repo gates | `#commands-executed--key-outputs`, `#execution-logs` | PASS |
| 5 | `qa-gatekeeper` | coverage depth and scope-local gate review | full ATDD diff and outputs | `#final-status-passfail--who-confirmed` | PASS |
| 6 | `completion-reviewer` | independent completion review | ATDD diff, traceability, evidence, gate outputs | `#final-status-passfail--who-confirmed` | PASS |

## Execution logs

- focused suites:
  - `pnpm -C packages/qfai test:e2e && pnpm -C packages/qfai test:integration`
  - result: PASS
- validate:
  - `npx qfai validate --fail-on error --format github`
  - result: FAIL globally, but `QFAI-ATDD-111/112` resolved; remaining errors are `QFAI-SKILLS-001`, `QFAI-REVIEW-003/005/007`, `QFAI-PROT-150/171`
- repo gates:
  - `pnpm check-types` -> PASS
  - `node scripts/verify-pack.mjs` -> PASS
  - changed-files `prettier -c` -> PASS
  - `pnpm lint` -> FAIL (pre-existing)
  - `pnpm -C packages/qfai test` -> FAIL (pre-existing timeout)
  - `pnpm format:check` -> FAIL (pre-existing repo-wide formatting issues)
- format self-check:
  - evidence updated to README-aligned heading structure and table schema

## Gaps / Open risks

- repo-global gate は未解消の既存 failures が残るため、今回は scope-local completion として扱う。
- `completion-reviewer` は内容面を PASS としたが、4ファイルがまだ未コミットである点を merge 前の手続き上の注意として指摘した。
- `TC-0012-0276` の ordering assertion は string index ベースで、実装の大幅な整形変更には比較的弱い。
- source-inspection 型 ATDD はこの repo の既存パターンに整合するが、runtime behavior を直接実行するテストではないため rationale を残す。

## Final status (PASS/FAIL) + who confirmed

- `qa-gatekeeper`: PASS (scope-local)
- `completion-reviewer`: PASS (content complete; merge 前に 4 files を commit することを推奨)
- Final ATDD judgment: PASS (scope-local)
- DR-IDs referenced: none
- Rejected option reintroduced: none
- Confirmation:
  - required E2E `US-*` coverage: complete
  - required Integration `TC-*` coverage: complete
  - required API `CON-API-*` coverage: not applicable
  - no forbidden references introduced
