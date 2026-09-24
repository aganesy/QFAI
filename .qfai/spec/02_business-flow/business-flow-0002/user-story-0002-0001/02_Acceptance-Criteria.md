# Acceptance Criteria

## Criteria

```gherkin
Feature: 配布 workflow の hardening

# AC-0002-0001-01
# Parent: US-0002-0001
Scenario: 配布 workflow bounding + 権限
  Given `packages/qfai/assets/init/root/.github/workflows/` 配下の配布 workflow set
  When 各ファイルの job 定義と checkout step を検査する
  Then 全 job が job-reachable な `permissions:` ブロック（必要最小 scope。orchestrator の verdict job は empty permission map）と `timeout-minutes` を持ち、全ファイルが `cancel-in-progress: true` を伴う ref-scoped `concurrency:` group を宣言し、全 checkout step が `persist-credentials: false` を設定し、artifact upload があれば cancellation で skip / 欠損ファイル許容 / retention 7 日以下である

# AC-0002-0001-02
# Parent: US-0002-0001
Scenario: Distributed header respects the supported Node floor
  Given the package `engines` declaration and the headers of all shipped workflows
  When the headers are inspected
  Then no header claims a Node support floor that the package does not declare
```
