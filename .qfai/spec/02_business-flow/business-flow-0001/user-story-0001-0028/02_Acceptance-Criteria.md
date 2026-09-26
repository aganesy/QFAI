# Acceptance Criteria

## Criteria

```gherkin
Feature: Git symlink 設定 + Windows 対応

# AC-0001-0028-01
# Parent: US-0001-0028
Scenario: git config core.symlinks 設定
  Given Git リポジトリ内で `qfai init` を実行する
  When init 処理が開始される
  Then `git config core.symlinks true` が実行される

# AC-0001-0028-02
# Parent: US-0001-0028
Scenario: Windows symlink 失敗時エラー
  Given Windows 環境で Developer Mode が無効である
  When `qfai init` で symlink 作成を試みる
  Then Developer Mode 有効化の案内を含むエラーメッセージが表示される
  And 処理が中断される
```
