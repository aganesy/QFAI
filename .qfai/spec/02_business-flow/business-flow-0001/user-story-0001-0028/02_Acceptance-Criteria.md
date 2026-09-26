# Acceptance Criteria

## Criteria

```gherkin
Feature: Git symlink 設定 + Windows 対応

# AC-0001-0028-01
# Parent: US-0001-0028
Scenario: git config core.symlinks 設定
  Given `qfai init` runs
  When init starts
  Then inside a Git repository it runs `git config core.symlinks true`
  And outside a Git repository it changes no `core.symlinks` setting

# AC-0001-0028-02
# Parent: US-0001-0028
Scenario: Windows symlink 失敗時エラー
  Given Windows 環境で Developer Mode が無効である
  When `qfai init` で symlink 作成を試みる
  Then Developer Mode 有効化の案内を含むエラーメッセージが表示される
  And 処理が中断される
```
