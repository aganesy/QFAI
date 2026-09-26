# Acceptance Criteria

## Criteria

```gherkin
Feature: doctor --autoremediate mode

# AC-0003-0009-01
# Parent: US-0003-0009
Scenario: --autoremediate が install / clean / config を --yes 確認付きで修復する
  Given active skill manifest が未 install の runtimeDependencies を宣言し、stale review pack が存在し、qfai.config.yaml に default-keyed フィールドが欠落している
  When `qfai doctor --autoremediate --yes` を実行する
  Then 宣言 dep に対し `npm install` が実行される
  And stale review pack が `_archive/` へ TTL-archive される (`--clean` 相当)
  And 欠落 default-keyed フィールドが qfai.config.yaml に書き込まれる (user-authored 値は上書きしない)

# AC-0003-0009-02
# Parent: US-0003-0009
Scenario: CI では autoremediate off、--dry-run は副作用なし (error/boundary)
  Given 標準 CI env var (例: CI=true) が設定された環境
  When `qfai doctor --autoremediate` を実行する
  Then autoremediate は実行されず "autoremediate disabled in CI" line が出力される (既定 off)
  And 別途 `qfai doctor --autoremediate --dry-run` は予定された修復を preview するが、npm install / archive / config write のいずれの副作用も発生させない

# AC-0003-0009-03
# Parent: US-0003-0009
Scenario: --autoremediate without a skill profile skips the install phase
  Given no `--profile <skill>` is passed, outside CI
  When `qfai doctor --autoremediate --yes` runs
  Then no `npm install` runs
  And the output says the install phase is skipped
```
