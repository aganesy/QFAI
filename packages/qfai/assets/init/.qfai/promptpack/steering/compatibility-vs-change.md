# Compatibility vs Change

互換維持と仕様変更の区分は `rules/conventions.md` に従う。

- 互換維持: 既存の期待値を変えない
- 仕様変更: 期待値/挙動が変わる

必ず `delta.md` に区分と根拠を記録する。

---

## 最小ルール（迷ったらこれ）

- **既存の利用者がそのまま手順・解釈で運用できる**: Compatibility
- **既存の利用者が手順変更・解釈変更・レビュー基準変更を迫られる**: Change/Improvement

「見た目だけ」「文章だけ」でも、運用で機械消費されている可能性がある場合は慎重に扱い、根拠を `delta.md` に残す。

---

## 具体例（最低10件）

| 変更内容 | 区分 | QA/レビュー観点 |
|---|---|---|
| README の誤字修正、リンク切れ修正 | Compatibility | 誤誘導が減る。既存運用は不変。 |
| report（text/markdown）の表現改善・並び順安定化（意味は不変） | Compatibility | 人間レビューの短縮。出力の“解釈”が変わらないこと。 |
| report.json のフィールド追加/並び変更（非契約を維持） | Compatibility | 非契約を明記し続ける。機械消費ユーザーへの注意喚起。 |
| validate の文言改善（issue code/意味/失敗条件は不変） | Compatibility | 次アクションが明確になる。誤爆やノイズ増がないこと。 |
| validate で新しい issue code を追加（warning/info） | Change/Improvement | CIの表示が変わる。ノイズ/誤検知の受容可否。 |
| validate の fail 条件を変更（error→warning で落ちる等） | Change/Improvement | Hard Gate が増減する。既存CIが壊れないか。 |
| init の生成物構成を変更（新規ファイル追加） | Change/Improvement | 既存リポジトリへの導入影響。上書き/衝突/運用導線。 |
| init が既存ファイルを上書きする/保護対象を変える | Change/Improvement | 事故リスクが高い。保護の回帰テスト必須。 |
| Spec/Scenario/Contract のID規約を変更 | Change/Improvement | 既存資産が無効化され得る。移行ガイド必須。 |
| overlay の優先順位/探索規則を変更 | Change/Improvement | 既存の prompts.local 運用が壊れる。回帰テスト必須。 |

---

## QA/レビュー時の判断テンプレ

- **修正が必要**: Hard Gate を増やしていないか、既存の運用手順を壊していないか、保護領域（prompts.local）が破壊されないか
- **許容**: 誤誘導削減、説明の具体化、並び順の安定化などで、意味・失敗条件が変わらないもの
- **要議論**: report.json の変更、validate の新ルール追加、init生成物の変更（CI/運用への波及が読みにくいもの）
