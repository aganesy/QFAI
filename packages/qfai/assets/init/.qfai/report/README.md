# report

## 1. 目的

`report` は QFAI が生成するレポートや診断成果物の置き場です。作業の証跡（トレーサビリティ）と検証結果を保存します。

## 2. 背景

検証結果が散逸すると、失敗の原因追跡や再現が困難になります。`report` に集約し、作業の証拠を残します。

## 3. ここに配置するもの

- report コマンドが生成するレポート（例: report.md, report.json）
- validate コマンドが生成する結果（例: validate.json）
- doctor コマンドが生成する結果（例: doctor.json）

## 4. ここに配置してはならないもの

- アプリのソースコード
- 大容量の生成物を無秩序に蓄積すること

## 5. ディレクトリ構造

```text
.
└─ README.md
```

## 6. テンプレート

レポート本文を Markdown で残す場合のテンプレートです（ファイル名は運用で決めます）。

```md
# Report

## Summary

- <what passed / failed>

## Evidence

- <commands>
- <paths>

## Findings

- <items>

## Next actions

- <actions>
```

## 7. 完成例

```md
# Report

## Summary

- validate が通過
- contract 参照整合が成立

## Evidence

- pnpm test:assets
- pnpm verify:pack

## Findings

- SPEC-0001 は api-0001-user-registration を参照し、contracts/api に実在

## Next actions

- 次の Spec Pack を作成する
```

## 8. チェックリスト

- [ ] 実行したコマンドと結果が記録されている
- [ ] 再現に必要な情報が含まれている
