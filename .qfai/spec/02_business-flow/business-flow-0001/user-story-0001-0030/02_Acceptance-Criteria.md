# Acceptance Criteria

## Criteria

```gherkin
Feature: Copilot review instructions 配布

# AC-0001-0030-01
# Parent: US-0001-0030
Scenario: Copilot review instructions 新規配置
  Given .github/instructions/ ディレクトリが存在しない新規リポジトリ
  When `qfai init` を実行する
  Then `.github/instructions/code-review.instructions.md` と `principles.instructions.md` が作成される
  And 各ファイルに YAML frontmatter が含まれる

# AC-0001-0030-02
# Parent: US-0001-0030
Scenario: instructions の既存ファイル保護
  Given `.github/instructions/code-review.instructions.md` がカスタム内容で存在する
  When `qfai init` を実行する
  Then 既存ファイルは変更されない
```
