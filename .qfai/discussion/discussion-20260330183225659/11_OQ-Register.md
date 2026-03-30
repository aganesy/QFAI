# 11 OQ Register

## OQ Table

| OQ-ID   | Title | Gate       | Disposition | Owner | Rationale | Options | Recommendation | Next-Decision-Point | Due        | Evidence |
| ------- | ----- | ---------- | ----------- | ----- | --------- | ------- | -------------- | ------------------- | ---------- | -------- |
| OQ-0001 | ベースブランチ名のデフォルト値 | discussion | resolved | user | `origin/main` が一般的だが、`origin/master` や他ブランチを使うプロジェクトもある | Option A: `origin/main` 固定 / Option B: `qfai.config.yaml` で設定可能にし `origin/main` デフォルト (recommended: B) | Option B | ユーザー確認済み | 2026-03-30 | ディスカッション対話ログ |
| OQ-0002 | トレーサビリティ検証の粒度 | discussion | resolved | user | 完全なセマンティック解析は実装コスト高。ファイルレベルで十分かの判断 | Option A: ファイルレベルのdiffチェック (recommended: A) / Option B: 行レベルのBR/AC参照チェック / Option C: 完全セマンティック解析 | Option A | ユーザー確認済み（段階的改善前提） | 2026-03-30 | ディスカッション対話ログ — 「specsのBRやACと紐づく実装部分に差分があるか？だけをチェックでもよいです」 |
| OQ-0003 | 差分検出ゼロ時のフォールバック動作 | discussion | resolved | agent | 変更specが見つからない場合の動作が不明確だと同じ停止問題が再発する | Option A: フルスキャンフォールバック (recommended: A) / Option B: エラー停止 | Option A | spec-0011 REQ-0010準拠 | 2026-03-30 | spec-0011/01_Spec.md REQ-0010 |
| OQ-0004 | Traceability Ledger不在specの扱い | discussion | resolved | agent | `16_Traceability-ledger.md` が存在しないspecのトレーサビリティチェック方法 | Option A: warningを出してチェックスキップ (recommended: A) / Option B: errorで停止 | Option A | TC-7制約準拠 | 2026-03-30 | 09_Constraints.md TC-7 |
| OQ-0005 | implementスキルの複数spec検出時の動作 | discussion | resolved | user | 複数specが検出された場合、自動で全件実行するか選択を促すか | Option A: 優先度順リスト表示 + ユーザー選択 (recommended: A) / Option B: 全件自動実行 | Option A | implementは1spec単位の設計（現行SKILL.md準拠） | 2026-03-30 | ディスカッション対話ログ + SRC-0003 |

## Rules

- Allowed `Gate`: `discussion`, `sdd`, `atdd`, `tdd`, `ops`.
- Allowed `Disposition`: `open`, `resolved`, `deferred`, `rejected`.
- Before discussion completion, `Disposition: open` must be zero.
- For `deferred` and `rejected`, `Rationale` is mandatory.
- `Options` must include at least two alternatives and one recommended option.
- `Recommendation` must explicitly state the recommended option.
- All 11 columns are mandatory for every row.
