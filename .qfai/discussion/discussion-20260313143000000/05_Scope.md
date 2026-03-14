# 05_Scope

## In Scope

- Capability 1: 共通 Preflight Diff Protocol の定義（SKILL.md レベル）
- Capability 2: `/qfai-atdd` SKILL.md へのインクリメンタルモード追加
- Capability 3: `/qfai-prototyping` SKILL.md へのインクリメンタルモード追加
- Capability 4: Evidence スキーマ拡張（Diff Context セクション追加）
- Capability 5: `--full` フラグによる強制フルスキャンモードの定義

## Out of Scope

- Item 1: TypeScript コード（packages/qfai/src/）の変更
- Item 2: `/qfai-verify` のインクリメンタル対応（常にフルスキャン維持）
- Item 3: qfai validate コマンド自体の改修
- Item 4: delta.md パーサー（deltaV1.ts）の機能追加
- Item 5: CI/CD パイプラインの変更
- Item 6: 新規スキルの追加

## Constraints

- Technical constraints: SKILL.md（プロンプト定義）の改修のみ。TypeScript コード変更不可。
- Operational constraints: 既存の evidence ファイルとの後方互換性を維持する。
- Legal / compliance constraints: N/A

## Success Criteria

| Criterion | Measurement                                              | Target                           | Priority |
| --------- | -------------------------------------------------------- | -------------------------------- | -------- |
| SC-001    | spec 変更後の /qfai-atdd 実行で変更 spec のみ処理される  | changed_specs のみ処理           | must     |
| SC-002    | spec 変更後の /qfai-prototyping 実行で変更 spec のみ更新 | changed_specs のみスケルトン更新 | must     |
| SC-003    | /qfai-verify は常に全 spec をフルスキャンする            | 全 spec 検証                     | must     |
| SC-004    | evidence に差分基点情報が記録される                      | last_commit_sha + timestamp      | must     |
| SC-005    | --full フラグで強制フルスキャンが可能                    | 全 spec 処理                     | should   |

## Assumptions

- Assumption 1: スキル実行環境は git リポジトリ内であることが多い（ただし必須ではない）
- Assumption 2: SKILL.md の改修でスキルの実行挙動を十分に制御できる
- Assumption 3: QFAI アノテーション（`QFAI:SPEC-XXXX:US-YYYY`）が既存テストに正しく付与されている
- Assumption 4: evidence ファイルは前回実行後に改変されていない
