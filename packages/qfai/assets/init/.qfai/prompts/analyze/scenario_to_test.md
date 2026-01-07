# analyze: Scenario ↔ Test 網羅性/ズレチェック

## 目的

- Scenario（受入条件）が Test で担保されているかを確認する
- Test が Scenario の意図を誤解していないかを確認する

## 入力の前提（貼り付けて埋める）

入力が多すぎる場合は「抜粋にする」「代表ケースだけに絞る」を優先してください。

### Project Context（任意）

- 対象機能:
- 前提/制約:
- 対象外（Non-goals）:

### Scenario Excerpts

- ...

### Test Excerpts

- ...

### Spec Excerpts（任意）

- ...

### Contract / Trace Links（任意）

- （Scenario ID）→（Test名/ファイル など）
- ...

### Open Concerns（任意）

- ...

## チェック観点

- シナリオの各条件がテストに対応しているか（対応表を作る）
- 例外系・境界条件がテストされているか
- テスト名/説明がシナリオ用語と一致しているか
- テストが多すぎる/少なすぎることによるリスク

## 期待する出力形式

- 対応表（Scenario項目 → Test名/箇所）
- 漏れ（未テスト）とズレ（誤解）のリスト
- 優先度（高/中/低）を付ける

## 次アクション

- Test追加/修正案:
- Scenario追加/修正案:
- 追加で確認すべき質問:
