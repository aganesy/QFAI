# Output (.qfai/out)

`qfai validate` と `qfai report` の出力先です。

## 生成されるファイル

- `validate.json` : 検証結果（JSON）
- `report.md` / `report.json` : レポート

## 運用メモ

- 原則として **コミットしない** ことを推奨します
- `.gitignore` への追記例:

```
.qfai/out/
```
