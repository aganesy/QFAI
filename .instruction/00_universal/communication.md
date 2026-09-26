---
category: universal
update-frequency: rare
dependencies: none
version: 1.1.0
---

# コミュニケーションと確認プロセス

効果的に合意形成し、手戻りを防ぐための連絡タイミングと進め方を定義する。

## 基本原則

- **不明点は即質問**: 憶測や仮定で進める作業は禁止。

## 作業を止めて確認すべきケース

1. **要件が不明確**: 複数解釈がありうる、完了条件が曖昧。
2. **技術選択が分岐する**: 実装案が複数ありトレードオフ判断が必要、既存パターンから外れる。
3. **高リスク変更**: 影響範囲が広い、大規模改修、データ不整合の懸念がある。
4. **前提変更が発生**: 依存更新、要件追加/変更、新しい制約の発覚。
5. **抽象的な指示**: 「適切に」「効率的に」など具体基準や測定可能な完了条件がない。

## 質問の書き方（型）

The shape of a question is owned by `.agents/rules/user-questions.md`: what parts
it carries, when it offers choices, and when it recommends one. Follow that file.

A form restated here is a copy that drifts, and the drift is invisible until
someone follows the copy — which is what this directory says about every rule it
points at.

## Progress and completion reports

What to say while the work runs, how to correct an earlier statement, and the
shape of the closing report are owned by
`.qfai/assistant/rule/communication.md`. Follow that article.
