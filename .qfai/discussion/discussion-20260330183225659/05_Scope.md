# 05 Scope

## In Scope

- Capability 1: SKILL.md改修 — `/qfai-prototyping` と `/qfai-implement` に「Spec Auto-Discovery Protocol」セクション追加
- Capability 2: TypeScript差分検出モジュール — 4ソース統合差分検出（git diff + ローカル変更 + timestamp + delta.md）
- Capability 3: TypeScriptトレーサビリティバリデータ — specのBR/AC変更と実装ファイル差分の整合性チェック
- Capability 4: `qfai validate` 拡張 — トレーサビリティ検証の統合
- Capability 5: Evidence Diff Contextセクション — 差分検出結果の記録
- Capability 6: spec-0011 Preflight Diff Protocol のSKILL.md統合

## Out of Scope

- Item 1: `/qfai-verify` のインクリメンタル対応（verifyは常にフルスキャン維持: REQ-0013 of spec-0011）
- Item 2: delta.md パーサーの根本的改修
- Item 3: CI/CDパイプラインの変更
- Item 4: 完全なセマンティック解析によるBR/AC一致検証（ファイルレベルの差分チェックで十分）
- Item 5: `/qfai-atdd` のインクリメンタル対応（別ディスカッション対象）

## Constraints

- Technical constraints: git CLIへの依存はオプショナル（不在時フォールバック必須 per DR-0006）
- Operational constraints: 既存のvalidateパイプラインの後方互換性を維持する
- Legal / compliance constraints: なし

## Success Criteria

| Criterion | Measurement | Target | Priority |
| --------- | ----------- | ------ | -------- |
| SC-001 | spec引数省略時にエージェントが停止せず作業開始できる | 100% | must |
| SC-002 | 4ソース差分検出の偽陰性率 | 0%（変更specの検出漏れなし） | must |
| SC-003 | git不在時のフォールバック動作 | timestamp + delta.mdで検出可能 | must |
| SC-004 | specのBR変更と実装差分の不整合検出 | validate errorとして報告 | must |
| SC-005 | 既存evidenceとの後方互換性 | Diff Contextセクションなしでも正常動作 | must |
| SC-006 | 差分サマリの可読性 | テーブル形式で一目把握可能 | should |

## Assumptions

- Assumption 1: 主なターゲット環境にはgitがインストールされている
- Assumption 2: `origin/main` がデフォルトのベースブランチ（カスタマイズ可能にする）
- Assumption 3: Traceability Ledger（`16_Traceability-ledger.md`）が存在するspecのみトレーサビリティチェック対象
