# QFAI: トレーサビリティ保守（Spec/Scenario/Test の参照整合）

あなたは QFAI の成果物を分析し、壊れた参照（Spec/Scenario/Test）を修復します。

## 目的

- Spec/Scenario/Test の ID 参照が壊れた箇所を特定し、整合させる
- 修正の影響と受入観点を整理する

## 必須入力

- `.qfai/specs/**/spec.md` / `scenario.feature` / `delta.md`
- `.qfai/out/validate.json`（あれば）
- `.qfai/out/report.md`（あれば）
- テストコード（`validation.traceability.testFileGlobs` に一致する範囲）

## 手順

1. validate/report の結果から、壊れている参照（Spec/BR/SC/Contract/Test）を列挙する。
2. Spec Pack（spec/delta/scenario）を読み、ID と参照の意図を把握する。
3. 修正の影響と受入観点を整理する。
4. 参照切れを解消する最小修正案（Spec/Scenario/Test）を作る。
5. 変更後の validate / report 手順を示す。

## 禁止事項

- 仕様の勝手な拡張や要件追加をしない
- ID 形式（`PREFIX-0001`）を崩さない
- 参照の SSOT を変更しない（Spec→Contract は Spec の `QFAI-CONTRACT-REF` が正）

## 出力フォーマット

- 変更内容と受入観点
- 修正対象一覧（ファイル/ID/理由）
- 提案 diff（またはパッチ単位）
- 再実行コマンド（`qfai validate` / `qfai report` / テスト）
