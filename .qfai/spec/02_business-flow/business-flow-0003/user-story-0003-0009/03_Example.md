# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                                                    | Expected                                                                                                                |
| --------------- | --------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| EX-0003-0009-01 | AC-0003-0009-01 | `qfai doctor --autoremediate --yes` (未 install dep + stale pack + 欠落 config key)      | `npm install` 実行 + stale pack を `_archive/` へ + 欠落 default-keyed フィールドを config に書き込み; user 値は不変    |
| EX-0003-0009-02 | AC-0003-0009-02 | `CI=true` で `qfai doctor --autoremediate`、別途 `qfai doctor --autoremediate --dry-run` | 前者は "autoremediate disabled in CI" を出力し修復せず; 後者は preview のみで install/archive/config write の副作用なし |
