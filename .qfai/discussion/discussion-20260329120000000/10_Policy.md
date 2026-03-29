# 10 Policy

## Metadata

| Key           | Value                        |
| ------------- | ---------------------------- |
| Discussion ID | discussion-20260329120000000 |
| Date          | 2026-03-29                   |

## Validation vs. Review Separation Policy

UIX-VAL-_ (hard gate) と UIX-REV-_ (semantic review) の責務は厳密に分離する。

### Hard Gate に入れるもの (UIX-VAL)

- Artifact の存在 / 不在
- Required field の空 / 非空
- 構造の完全性 (states, outcomes, transitions の有無)
- 明らかな矛盾 (mode 宣言と evidence の不整合)
- Template version の新旧比較

### Hard Gate に入れないもの (UIX-REV)

- Aesthetic taste judgment
- Trend quality 自体の評価
- Strategy の "bestness" 判定
- Originality quality
- Pivot recommendation の適切性

**違反検知**: reviewer が hard gate として実装されている場合、code review で即座に reject する。

## Migration Enforcement Policy

1. **Phase 1 (v1.7.4 initial)**: stale asset / missing sidecar は `warning` severity
   - **Exit criterion**: Phase 1 は v1.7.4 リリース後 30 日経過、または `uiux.migration.strict: true` の採用が 1 件以上確認された時点で終了する
2. **Phase 2 (v1.7.4 hardened)**: config で `uiux.migration.strict: true` 設定時に `error` に昇格。v1.7.4 patch release で `strict` opt-in のドキュメントを明示する
   - **Entry criterion**: Phase 1 exit criterion が満たされていること
3. **Phase 3 (v1.8+)**: `error` がデフォルト、`warning` は deprecated。deprecation notice を v1.8 CHANGELOG に記載する

## Rollback Policy

- Validator registration は config flag で個別に無効化可能にする
- Reviewer prompt 変更は独立して revert 可能にする
- Migration checks は soft launch -> harden の段階を踏めるようにする

## Test Policy

- 各 UIX-VAL-\* ルールに最低 1 pass + 1 fail の fixture test を用意する
- Verify-pack test は redesign path の end-to-end をカバーする
- Non-UI project fixture で zero-noise を確認する
- Reviewer prompt の structure-level test は prompt 形式のみを検証する (semantic quality は対象外)
