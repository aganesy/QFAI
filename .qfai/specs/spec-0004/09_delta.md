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
- Date: 2026-07-18
- Primary: v1.7.12 validator convergence — Bundle C 対応
- Tags: validator-convergence, 3-layer, canonical-aggregator, truthful-state
- Discussion: D-001（3-layer evaluation model as canonical）, D-004（旧 4-axis テンプレート完全除去）

## v1.7.12 Added

### User Stories

| ID           | Title                                     | Rationale                                                        |
| ------------ | ----------------------------------------- | ---------------------------------------------------------------- |
| US-0004-0016 | Canonical UIX validator aggregation       | REQ-0011: runAllUixValidators() をレガシーラッパーから canonical aggregator 化 |
| US-0004-0017 | 3-layer テンプレートファミリーバリデータ整合 | REQ-0012: バリデータが新 3-layer ファイル名・スキーマを期待      |
| US-0004-0018 | Truthful render-evidence state handling   | REQ-0013: プレースホルダー排除、truthful state 返却              |
| US-0004-0019 | Browser QA truthful implementation        | REQ-0014: minimal runner で truthful 報告                        |

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

| ID           | Title                                  | AC-Refs                    |
| ------------ | -------------------------------------- | -------------------------- |
| BR-0004-0013 | 3-layer テンプレートファイル名期待     | AC-0004-0016, AC-0004-0017 |
| BR-0004-0014 | 存在しないファイル期待の禁止           | AC-0004-0017, AC-0004-0019 |
| BR-0004-0015 | Evidence state の truthful 性          | AC-0004-0020, AC-0004-0021 |
| BR-0004-0016 | canonical aggregator 義務              | AC-0004-0016               |
| BR-0004-0017 | 旧 4-axis ファイル migration warning   | AC-0004-0018               |

### Examples

| ID           | BR-Ref                   | Summary                                      |
| ------------ | ------------------------ | -------------------------------------------- |
| EX-0004-0014 | BR-0004-0013, BR-0004-0016 | UI-bearing パック + 新 3-layer 全完備 → pass |
| EX-0004-0015 | BR-0004-0017            | 旧 4-axis 残存 → migration warning            |
| EX-0004-0016 | BR-0004-0014            | Non-UI パック → UIX skip                      |
| EX-0004-0017 | BR-0004-0015            | render-evidence skipped + 理由明示            |
| EX-0004-0018 | BR-0004-0015            | Browser QA 未実行 → not-run 報告              |

### Test Cases

| ID           | Level       | AC-Refs      | EX-Ref       | Summary                              |
| ------------ | ----------- | ------------ | ------------ | ------------------------------------ |
| TC-0004-0017 | integration | AC-0004-0016 | EX-0004-0014 | Canonical UIX aggregator 動作確認    |
| TC-0004-0018 | integration | AC-0004-0017 | EX-0004-0014 | 新 3-layer ファイル名期待の検証      |
| TC-0004-0019 | integration | AC-0004-0018 | EX-0004-0015 | 旧 4-axis ファイル migration warning |
| TC-0004-0020 | integration | AC-0004-0019 | EX-0004-0016 | Non-UI パック UIX スキップ           |
| TC-0004-0021 | unit        | AC-0004-0020 | EX-0004-0017 | render-evidence truthful state       |
| TC-0004-0022 | unit        | AC-0004-0021 | EX-0004-0018 | Browser QA minimal runner truthful   |

## v1.7.12 Design Decisions

- D-001 採用: 3-layer evaluation model を canonical とし、旧 4-axis モデルを廃止
- D-004 採用: 旧 4-axis テンプレートの完全除去。検出時は migration warning のみ発行
- `runAllUixValidators()` をレガシー互換ラッパーから canonical aggregator に昇格
- render-evidence / Browser QA のプレースホルダー排除、truthful state 導入

## v1.7.12 新 3-layer テンプレートファミリー

| Filename                          | Purpose                    |
| --------------------------------- | -------------------------- |
| 11\_design\_taste\_interview.md   | taste interview validation |
| 20\_design\_eval\_invariant.md    | invariant layer validation |
| 21\_design\_eval\_trend\_derived.md | trend-derived validation |
| 22\_design\_eval\_product\_specific.md | product-specific validation |
| 23\_design\_eval\_aggregate.md    | aggregate/rubric completeness |
| 24\_design\_eval\_dynamic\_overrides.md | dynamic overrides validation |
