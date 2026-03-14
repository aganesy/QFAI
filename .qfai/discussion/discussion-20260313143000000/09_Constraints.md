# 09_Constraints

## Technical Constraints

| ID    | Constraint                                 | Rationale                                                               | Impact                                       |
| ----- | ------------------------------------------ | ----------------------------------------------------------------------- | -------------------------------------------- |
| TC-01 | SKILL.md のみの改修（TypeScript 変更不可） | 迅速な導入とリリースサイクルの短縮。TS 変更はビルド・テスト影響が大きい | 差分検出ロジックはプロンプト記述に制約される |
| TC-02 | git diff の利用は任意（必須でない）        | git がない環境やシャローコピーでの動作を保証                            | Source B, C でのフォールバックが必須         |
| TC-03 | 既存 evidence ファイルとの後方互換         | Diff Context セクションがない旧 evidence でも動作すること               | フルモードフォールバックの実装が必要         |

## Operational Constraints

| ID    | Constraint                                    | Rationale                                            | Impact                                         |
| ----- | --------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------- |
| OC-01 | /qfai-verify は常にフルスキャン               | 品質ゲートとして全 spec の一貫性を保証する必要がある | verify のみインクリメンタル対象外              |
| OC-02 | \_policies 変更時は保守的に全 spec 影響とする | policy 変更の影響範囲を正確に判定することは困難      | false positive（過大評価）は許容、漏れは不許容 |

## Legal / Compliance Constraints

| ID    | Constraint | Regulation / Standard | Impact |
| ----- | ---------- | --------------------- | ------ |
| LC-01 | N/A        | N/A                   | N/A    |

## Budget Constraints

- Budget range: N/A（内部開発）
- Cost drivers: N/A

## Timeline Constraints

- Hard deadlines: v1.5.5 リリース
- Milestones: 共通 Protocol 定義 → atdd 対応 → prototyping 対応 → 統合テスト
