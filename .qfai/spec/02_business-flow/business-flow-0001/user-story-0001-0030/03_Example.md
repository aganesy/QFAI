# Examples

## Examples

| EX-ID           | AC-Ref          | Input                                                              | Expected                                          |
| --------------- | --------------- | ------------------------------------------------------------------ | ------------------------------------------------- |
| EX-0001-0030-01 | AC-0001-0030-01 | 新規リポジトリで `qfai init`                                       | `.github/instructions/` に 2 ファイルが作成される |
| EX-0001-0030-02 | AC-0001-0030-02 | An existing instructions file, including a 0-byte one; `qfai init` | 既存ファイルは skip、レポートに skipped 表示      |
