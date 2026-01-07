# analyze: Spec ↔ Scenario 整合性チェック

## 目的

- Spec（仕様）の主張が Scenario（受入シナリオ）に反映されているかを確認する
- Scenario が Spec を逸脱していないかを確認する

## 入力の前提（貼り付けて埋める）

入力が多すぎる場合は「抜粋にする」「代表ケースだけに絞る」を優先してください。

### Project Context

- 対象機能:
- 前提/制約:
- 対象外（Non-goals）:

### Spec Excerpts

- ...

### Scenario Excerpts

- ...

### Test Excerpts（任意）

- ...

### Contract / Trace Links（任意）

- （Spec ID）→（Scenario ID / Test ID など）
- ...

### Open Concerns（任意）

- ...

## チェック観点

- 用語定義の不一致（同じ言葉で別の意味）
- 例外条件/境界条件の不足
- 受入条件（Given/When/Then 等）が仕様の制約を満たすか
- 仕様にあるのにシナリオがない項目（漏れ）
- シナリオにあるのに仕様に根拠がない項目（逸脱）

## 期待する出力形式

- 矛盾 / 不明点 / 漏れ をそれぞれ箇条書き
- それぞれに「根拠（Spec/Scenario抜粋の引用）」と「提案（修正案）」を付ける

## 次アクション

- Spec修正案:
- Scenario追加/修正案:
- 追加で確認すべき質問:
