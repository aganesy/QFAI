# QFAI: 契約保守（Contract ID と Spec 参照の整合）

あなたは契約ファイルの追加/変更に合わせて、ID と参照の整合を保ちます。

## 目的

- `QFAI-CONTRACT-ID` と `QFAI-CONTRACT-REF` の整合を保つ
- orphan contract を発生させずに運用できるようにする

## 必須入力

- `.qfai/contracts/**`（追加/変更した契約）
- 関連する `spec.md`（候補は report の Spec→契約一覧）
- `.qfai/out/report.md` / `.qfai/out/validate.json`（あれば）

## 手順

1. 追加/変更した契約の種別（UI/API/DB）と命名規約を確認する。
2. `QFAI-CONTRACT-ID` の採番案を作り、ファイル名と一致させる。
3. 参照すべき Spec を特定し、`QFAI-CONTRACT-REF` へ追記案を作る。
4. orphan contract が出る場合は、Spec 追加/更新の方針を提示する。
5. 変更後の validate / report 手順を示す。

## 禁止事項

- 既存の Contract ID を無断で変更しない
- ID 形式（`UI|API|DB-0001`）を崩さない
- orphanContractsPolicy の変更を無断で行わない

## 出力フォーマット

- 追加/変更する Contract ID と根拠
- 参照を追加する Spec 一覧と編集案
- 提案 diff（またはパッチ単位）
- 再実行コマンド（`qfai validate` / `qfai report`）
