# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 set の structural contract gate

# AC-0002-0008-01
# Parent: US-0002-0008
Scenario: 配布 set structural contract gate
  Given テストスイート内に 1 箇所だけ保持された配布 set の宣言された期待形状（値の SSOT はそこであり、spec も contract も値を再記載しない）
  When 配布 set を clean な状態で gate に掛け、続いて profile 値と failure threshold を planted divergence させて `pnpm ci:lint` を走らせる
  Then clean では exit 0、planted では exit 1 となり failure code は `R-SHIPPED-WORKFLOW-SHAPE-DRIFT`。The expected shape pins all ten dimensions `CLI-WFSET` §5 fixes as a closed set (the file set / the header block / per job, the permissions, timeout and runner selector / per matrix, `fail-fast: false` / per lane, the subcommand, profile and fail-on threshold / the condition that governs whether a lane runs — its inertness condition and, for an aggregate lane, its always-run condition and exact `needs` list / the third-party allow-list / zero secrets / no reference between shipped files / per aggregate, the external check name it carries). A shape missing any one of them is a contract violation. gate の invocation path は `pnpm ci:lint` に現れ、`pnpm ci:gate` には現れない。既存 asset test の ad-hoc 配布 workflow string assertion は subsume して置き換えられ、その test-case 参照は保持または再登録されている
```
