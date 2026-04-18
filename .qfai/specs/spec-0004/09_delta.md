# 09 Delta

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0004 新規作成（旧 spec-0002 の統合）
- Tags: validate, traceability, waiver, consolidation

## Migration Record

| Old Spec  | Title         | Key Changes                                                                                                                                           |
| --------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| spec-0002 | qfai validate | Core functionality retained. IDs renumbered from 0002-XXXX to 0004-XXXX. US-0002-0015 (canonical entrypoint wiring) retained as implementation detail |

## Outdated Content Removed

- 旧 spec-0002 の AC-0002-0029, AC-0002-0030（canonical entrypoint / deprecation wrapper）は実装の内部詳細であり spec レベルのユーザーストーリーとしては除外
- phase guard を US-0004-0015 として明示化（旧 spec では暗黙的だった）

## Adopted

- Adopted: 旧 spec-0002 を spec-0004 として再番号付け
- Why: v2.0 のスペック番号体系に合わせるため（CLI コマンドごとに連番）

## Rejected

- Candidate: 旧番号（spec-0002）を維持する
- Reason: 新番号体系は CAP-0003..CAP-0007 に揃えるため変更が必要
- DO NOT: 旧 spec-0002 の番号でテスト/コード内の参照を残さないこと
- Temptation: 旧番号維持は変更が少ないが、番号体系の不整合が将来の混乱を招く

---

## Change Summary (v1.7.12)

- Change ID: DELTA-0002
- Date: 2026-04-01
- Primary: v1.7.12 validator convergence — Bundle C 対応
- Tags: validator-convergence, 3-layer, canonical-aggregator, truthful-state
- Discussion: D-001（3-layer evaluation model as canonical）, D-004（旧 4-axis テンプレート完全除去）

## v1.7.12 Added

### User Stories

| ID           | Title                                        | Rationale                                                                      |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------------------ |
| US-0004-0016 | Canonical UIX validator aggregation          | REQ-0011: runAllUixValidators() をレガシーラッパーから canonical aggregator 化 |
| US-0004-0017 | 3-layer テンプレートファミリーバリデータ整合 | REQ-0012: バリデータが新 3-layer ファイル名・スキーマを期待                    |
| US-0004-0018 | Truthful render-evidence state handling      | REQ-0013: プレースホルダー排除、truthful state 返却                            |
| US-0004-0019 | Browser QA truthful implementation           | REQ-0014: minimal runner で truthful 報告                                      |

### Acceptance Criteria

| ID           | Title                              | Linked US    |
| ------------ | ---------------------------------- | ------------ |
| AC-0004-0016 | Canonical UIX aggregator           | US-0004-0016 |
| AC-0004-0017 | 3-layer テンプレートファイル名期待 | US-0004-0017 |
| AC-0004-0018 | 旧 4-axis ファイル警告             | US-0004-0017 |
| AC-0004-0019 | Non-UI パック UIX スキップ         | US-0004-0017 |
| AC-0004-0020 | render-evidence truthful state     | US-0004-0018 |
| AC-0004-0021 | Browser QA truthful runner         | US-0004-0019 |

### Business Rules

| ID           | Title                              | AC-Refs                    |
| ------------ | ---------------------------------- | -------------------------- |
| BR-0004-0013 | 3-layer テンプレートファイル名期待 | AC-0004-0016, AC-0004-0017 |
| BR-0004-0014 | 存在しないファイル期待の禁止       | AC-0004-0017, AC-0004-0019 |
| BR-0004-0015 | Evidence state の truthful 性      | AC-0004-0020, AC-0004-0021 |
| BR-0004-0016 | canonical aggregator 義務          | AC-0004-0016               |
| BR-0004-0017 | 旧 4-axis ファイル migration error | AC-0004-0018               |

### Examples

| ID           | BR-Ref                     | Summary                                      |
| ------------ | -------------------------- | -------------------------------------------- |
| EX-0004-0014 | BR-0004-0013, BR-0004-0016 | UI-bearing パック + 新 3-layer 全完備 → pass |
| EX-0004-0015 | BR-0004-0017               | 旧 4-axis 残存 → migration error             |
| EX-0004-0016 | BR-0004-0014               | Non-UI パック → UIX skip                     |
| EX-0004-0017 | BR-0004-0015               | render-evidence skipped + 理由明示           |
| EX-0004-0018 | BR-0004-0015               | Browser QA 未実行 → not-run 報告             |

### Test Cases

| ID           | Level       | AC-Refs      | EX-Ref       | Summary                            |
| ------------ | ----------- | ------------ | ------------ | ---------------------------------- |
| TC-0004-0017 | integration | AC-0004-0016 | EX-0004-0014 | Canonical UIX aggregator 動作確認  |
| TC-0004-0018 | integration | AC-0004-0017 | EX-0004-0014 | 新 3-layer ファイル名期待の検証    |
| TC-0004-0019 | integration | AC-0004-0018 | EX-0004-0015 | 旧 4-axis ファイル migration error |
| TC-0004-0020 | integration | AC-0004-0019 | EX-0004-0016 | Non-UI パック UIX スキップ         |
| TC-0004-0021 | unit        | AC-0004-0020 | EX-0004-0017 | render-evidence truthful state     |
| TC-0004-0022 | unit        | AC-0004-0021 | EX-0004-0018 | Browser QA minimal runner truthful |

## v1.7.12 Design Decisions

- D-001 採用: 3-layer evaluation model を canonical とし、旧 4-axis モデルを廃止
- D-004 採用: 旧 4-axis テンプレートの完全除去。検出時は migration error を発行
- `runAllUixValidators()` をレガシー互換ラッパーから canonical aggregator に昇格
- render-evidence / Browser QA のプレースホルダー排除、truthful state 導入

## v1.7.12 新 3-layer テンプレートファミリー

| Filename                            | Purpose                       |
| ----------------------------------- | ----------------------------- |
| 11_design_taste_interview.md        | taste interview validation    |
| 20_design_eval_invariant.md         | invariant layer validation    |
| 21_design_eval_trend_derived.md     | trend-derived validation      |
| 22_design_eval_product_specific.md  | product-specific validation   |
| 23_design_eval_aggregate.md         | aggregate/rubric completeness |
| 24_design_eval_dynamic_overrides.md | dynamic overrides validation  |

---

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: REQ-0113~0117 追加（canonical/legacy separation, IssueCategory, prototypingRecommendation, DDP removal, new UIX validators）
- adopted: US-0004-0020~0022, AC-0004-0022~0024, BR-0004-0018~0020, EX-0004-0019~0020, TC-0004-0023~0026 追加
- rationale: v1.7.13 実装（canonical/legacy validator 分離、prototypingRecommendation 新規登録）の仕様反映

### v1.7.13 補完 (2026-04-04)

- adopted: BR-0004-0021~0026, EX-0004-0022~0023, TC-0004-0028~0030 追加
- rationale: コミット履歴分析で特定された設計意図の補完（phase1 ratchet, validator enumeration, VIS-002 downgrade, AUD-021, barrel isolation, CRIT-005 read-order）

### v1.7.13 収束 (2026-04-05)

- adopted: REQ-0117 拡張（canonical validator リストを完全化: 5→12 modular validators）, REQ-0118 追加（Surface Type Detection Module）
- adopted: US range 更新 US-0004-0001..US-0004-0023
- rationale: 実装分析で特定された未文書化の v1.7.13 変更:
  - REQ-0117 が列挙していなかった 7 バリデータ（classification, scoringReady, strategy, screenContract, trend, threeLayer + canonical aggregator）を追加
  - `detection/surfaceType.ts` の明示的分類ブロック優先ルールを REQ-0118 として新規登録

## v1.7.14 (2026-04-07) — Current-Only SSOT & Legacy Complete Removal

- adopted: REQ-0119（Legacy Validator 完全削除）, REQ-0120（IssueCategory 簡素化）, REQ-0121（Strict Classification Validation）, REQ-0122（Strategy Semantic Validation）追加
- adopted: DR-0004-0003~0005 追加
- adopted: REQ-0117 更新（rollout.ts をバリデータリストから削除: 12→11 modular validators）
- rationale: v1.7.14 の破壊的変更を仕様に反映:
  - **Legacy validator 完全削除**: legacy/ ディレクトリ、legacyStatusDir.ts、migration/ ディレクトリ、uix/rollout.ts を production ソースツリーから完全除去。compatibility テストファイルも全削除（DR-0115）
  - **IssueCategory "compatibility" 削除**: "canonical" | "change" のみとし、全バリデータの category 出力を "canonical" に統一（DR-0108）
  - **Strict classification validation**: classification.ts が分類ブロック内の意味的矛盾を hard error として検出（ui_bearing vs primary_surface 矛盾、invalid/duplicate secondary surfaces 等）（DR-0111）
  - **Strategy semantic validation**: strategy.ts が canonical strategy decision enum を強制。selection_required 状態機械を検証（DR-0114）
  - **rollout.ts 削除**: phase-1 ratchet mechanism（DR-0101）のインフラ完全削除。migration/rollout の概念を validation pipeline から排除

### v1.7.14 Full-Harness Validator Rules (2026-04-08)

- adopted: REQ-0123（Full-Harness Iteration Integrity Validators QFAI-PROT-290~294）追加
- rationale: full-harness インシデントレポートに基づく iteration integrity validator の追加:
  - **QFAI-PROT-290**: iterationCount==1 + converged → warning（single-pass convergence は通常ありえない）
  - **QFAI-PROT-291**: scoringTrace.length ≠ iterationCount → warning（trace count 不整合）
  - **QFAI-PROT-292**: terminationReason==max-iterations but count < maxIterations → warning（終了条件矛盾）
  - **QFAI-PROT-293**: iterationCount > maxIterations → warning（上限超過）
  - **QFAI-PROT-294**: non-increasing scoringTrace → info（改善が見られない）
  - **Taxonomy range 拡張**: fullHarness reserved range 281-283 → 281-294, TAXONOMY_RANGE_MAX 283 → 294
  - **validate.ts**: PROT-290~294 description を issue code description map に追加

## v1.7.15 Adopted

- adopted: REQ-0124..REQ-0135（12 new validator rules QFAI-PROT-295..306, PROT-308..309）追加
- adopted: PROT-290..292 severity を warning→error に昇格
- adopted: US-0004-0023..US-0004-0025, AC-0004-0025..AC-0004-0032, BR-0004-0027..BR-0004-0038, EX-0004-0028..EX-0004-0040, TC-0004-0035..TC-0004-0053 追加
- adopted: DR-0004-0006..DR-0004-0008 追加
- adopted: taxonomy range 拡張 281-294 → 281-321
- rationale: v1.7.15 は破壊的変更リリース。full-harness evidence の truthfulness を error-level enforcement で保証する:
  - **QFAI-PROT-295**: reviewer placeholder → error
  - **QFAI-PROT-296**: weightedTotal mismatch → error
  - **QFAI-PROT-297**: commitSha missing → error
  - **QFAI-PROT-298**: limitations missing → error
  - **QFAI-PROT-299**: completed + terminationReason missing → error
  - **QFAI-PROT-300**: plateau + insufficient iterations → error
  - **QFAI-PROT-301**: calibrationRef empty → error
  - **QFAI-PROT-302**: identical commitSha across iterations → warning
  - **QFAI-PROT-303**: reviewerLog summary too short → warning
  - **QFAI-PROT-304**: reviewerLogs count mismatch → error
  - **QFAI-PROT-305**: zero-seeded specCoverage → error
  - **QFAI-PROT-306**: synthetic mockPaths pass → error
  - **QFAI-PROT-308**: converged + iterationCount<2 → error (strengthened from PROT-290)
  - **QFAI-PROT-309**: iteration reviewer placeholder → error

### v1.7.15 Traceability Chain

```text
US-0004-0023 → AC-0004-0025, AC-0004-0030, AC-0004-0032 → BR-0004-0027..BR-0004-0038 → EX-0004-0028..EX-0004-0040 → TC-0004-0035..TC-0004-0053
US-0004-0024 → AC-0004-0026, AC-0004-0027 → BR-0004-0028..BR-0004-0030 → EX-0004-0029..EX-0004-0031 → TC-0004-0037..TC-0004-0042
US-0004-0025 → AC-0004-0028..AC-0004-0031 → BR-0004-0031..BR-0004-0037 → EX-0004-0032..EX-0004-0038 → TC-0004-0043..TC-0004-0051
```

## v1.7.15 Rejected

- RJ-v1715-001: Downgrade PROT-295..306 to warning
  - DO NOT downgrade any of PROT-295..306, PROT-308..309 to warning severity
  - Temptation: keep CI green during transition period by making new rules warnings first
  - Reason: v1.7.15 is a breaking-change release. Warning-level rules do not enforce truthfulness — they merely inform. The entire purpose of these rules is to prevent synthetic/fabricated evidence from passing CI gates

- RJ-v1715-002: Allow waivers for PROT-295..309 error rules
  - DO NOT allow waivers to suppress these error-level findings
  - Temptation: unblock stalled PRs that fail on new validator rules
  - Reason: these rules enforce evidence truthfulness at the structural level. Waiving them defeats the purpose of the v1.7.15 hardening effort. Fix the evidence, not the gate

## v1.7.15 rev2 — Adopted

- AD-v1715r2-001: REQ-0136 追加（14 項目 error 昇格 rev2: evidence category empty / DB no observation / uiFidelity screen-level / iteration evidenceRefs / old schema detection）
- AD-v1715r2-002: REQ-0137 追加（validator tests fixture rev2 改定）
- AD-v1715r2-003: DR-0004-0009 追加（新 rule ID for semantic changes）
- AD-v1715r2-004: US-0004-0026..0027, AC-0004-0033..0038, BR-0004-0039..0040, EX-0004-0041..0043, TC-0004-0054..0062 追加

## v1.7.15 rev2 — Rejected

- RJ-v1715r2-001: Reuse existing rule IDs for semantic changes
  - DO NOT reuse existing rule IDs when detection target changes semantically
  - Temptation: keep rule count low by overloading existing IDs
  - Reason: overloaded IDs break waiver targeting and CI filtering

## 2026-04-18 ATDD audit correction

- adopted: EX-0004-0013 / TC-0004-0016 を placeholder から GitHub annotation escape の具体例へ更新
- adopted: 06_Test-Cases.md の Test Case Table に TC-0004-0023..0027, TC-0004-0029..0034, TC-0004-0054..0062 を追記し、TDD ledger と整合させた
- adopted: REQ-0117 / BR-0004-0022 / EX-0004-0024 / TC-0004-0031 を実装実態に合わせて canonical validator count=12 に補正
- removed: BR-0004-0021 に紐づく stale EX-0004-0022 / TC-0004-0028（phase1 ratchet）。rollout.ts 削除後の production 実装に存在しないため再採用しない
- rationale: spec-0004 と tests/e2e / tests/integration の ATDD coverage 監査で、placeholder・削除済み機能・Test Case Table 欠落が実装と乖離していたため
