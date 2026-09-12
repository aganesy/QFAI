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
- **長時間タスクはこまめに共有**: 30分以上かかりそうなら途中経過を報告。
- **完了時は具体的に報告**: 変更内容・変更ファイル・テスト結果をセットで示す。

## 作業を止めて確認すべきケース

1. **要件が不明確**: 複数解釈がありうる、完了条件が曖昧。
2. **技術選択が分岐する**: 実装案が複数ありトレードオフ判断が必要、既存パターンから外れる。
3. **高リスク変更**: 影響範囲が広い、大規模改修、データ不整合の懸念がある。
4. **前提変更が発生**: 依存更新、要件追加/変更、新しい制約の発覚。
5. **抽象的な指示**: 「適切に」「効率的に」など具体基準や測定可能な完了条件がない。

## 質問の書き方（型）

```
1. What is understood so far
2. What is unclear, stated specifically
3. The choices, where the answer has a listable set of candidates
4. The recommended one and why, where a choice is being made
5. What else would settle it
```

Rows 3 and 4 follow the answer's shape rather than being filled in every time.
An answer with no listable set of candidates is a plain request for the value,
and a question asking for a fact carries no recommendation at all:
`.agents/rules/user-questions.md` settles both, and inventing candidates to fill
a row is the guess it exists to prevent.

## 進捗報告

報告には以下を含め、箇条書きで簡潔に伝える。

- **進捗状況**: 完了/着手中/未着手を分けて記載。
- **課題・問題**: 発生事象、対応済み、未解決のもの。
- **次の一手**: 直近の作業と、ユーザーに確認が必要な点、想定リスク。

## 完了報告

完了時は次をセットで共有する。

- **概要**: 何を、何のために変えたか。
- **変更ファイル**: ファイルごとの目的と主な変更。
- **テスト**: 実行したテストと結果、未実施なら理由。
- **注意点/リスク**: 影響範囲、残タスク、確認が必要な点。
