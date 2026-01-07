# analyze: Spec ↔ Contract トレーサビリティチェック

## 目的
- Spec と Contract（参照関係）が噛み合っているかを確認する
- 紐付け漏れ・参照の根拠薄弱を抽出する

## 入力の前提（貼り付けて埋める）

入力が多すぎる場合は「抜粋にする」「代表ケースだけに絞る」を優先してください。

### Project Context
- 対象機能:
- 前提/制約:
- 対象外（Non-goals）:

### Spec Excerpts
- ...

### Contract / Trace Links
- （Spec ID）→（Scenario ID / Test ID など）
- ...

### Scenario Excerpts（任意）
- ...

### Test Excerpts（任意）
- ...

### Open Concerns（任意）
- ...

## チェック観点
- Spec に対してリンクが存在しない箇所（紐付け漏れ）
- Contract で参照しているが、Spec 側に根拠が見当たらない箇所
- 参照の向きが不自然な箇所（誤ったID、転記ミスの疑い）

## 期待する出力形式
- 「紐付け漏れ」「根拠薄弱」「参照ミス疑い」に分類
- それぞれに修正案（Contract修正 / Spec補強 / Scenario追加）を付ける

## 次アクション
- Contract修正案:
- Spec補強案:
- 追加で確認すべき質問:
