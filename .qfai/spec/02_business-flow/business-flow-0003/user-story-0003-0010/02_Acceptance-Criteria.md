# Acceptance Criteria

## Criteria

```gherkin
Feature: per-skill manifest runtimeDependencies probe

# AC-0003-0010-01
# Parent: US-0003-0010
Scenario: --profile <skill> probes the manifest's runtimeDependencies
  Given `<paths.skillsDir>/<skill>/manifest.json` declares `runtimeDependencies`, and some of them are absent from `node_modules`
  When `qfai doctor --profile <skill>` runs
  Then `node_modules/.bin/...` / `node_modules/<name>/` is probed for each entry
  And a missing dependency is reported with its install command

# AC-0003-0010-02
# Parent: US-0003-0010
Scenario: 空 manifest は probe せず、manifest↔probe drift は error (error/boundary)
  Given `runtimeDependencies` が空配列の manifest
  When `qfai doctor --profile <skill>` を実行する
  Then probe finding は 1 件も emit されない (false positive なし)
  And 別ケースで manifest 宣言と probe 結果が drift した場合は `R-SKILL-MANIFEST-DRIFT` (SSOT-sync Pair III) が emit される
```
