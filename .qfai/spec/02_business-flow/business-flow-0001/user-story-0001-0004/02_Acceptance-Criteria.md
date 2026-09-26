# Acceptance Criteria

## Criteria

```gherkin
Feature: Steering & Governance フレームワーク定義

# AC-0001-0004-01
# Parent: US-0001-0004
Scenario: Canonical Workflow Stages が定義されている
  Given Steering & Governance 仕様を参照する
  When Canonical Workflow Stages を確認する
  Then Stage 0（steering refresh）～ Stage 7（verify）の 8 ステージが定義されている
  And Stage 0 は全 Skill 開始時に必須である
  And Stage 4（prototyping）はオプショナルである
  And Stage 6（implementation）は EX ごとの TDD を実施する

# AC-0001-0004-02
# Parent: US-0001-0004
Scenario: Stage 0 reuses a validated snapshot inside an active run
  Given an active workflow run in which an earlier stage wrote its Stage 0 output with the key it was computed under
  When a later stage of the same run starts
  Then it recomputes the key and reuses the output only when the key is equal
  And when the key differs it refreshes only what changed
  And no stage-specific check is served from the reused output
  And outside a run Stage 0 runs in full at every stage start

# AC-0001-0004-03
# Parent: US-0001-0004
Scenario: The governance text states what authorizes a run's work
  Given the shipped `constitution.md` and the shared operating and delegation baselines
  When they are read
  Then they state that the operator's first explicit request authorizes the normal change it allows, within the run's checked scope
  And they state that a work order binds its stage to the one target it names
  And every article keeps its text, and none gains an exception

# AC-0001-0004-04
# Parent: US-0001-0004
Scenario: A workflow route is not a change type
  Given the shipped `workflow.md`
  When it is read
  Then it states that the workflow routes are orthogonal to the Change Type values
  And choosing a route selects no Change Type, and a Change Type selects no route

# AC-0001-0004-05
# Parent: US-0001-0004
Scenario: The constitution's articles are non-negotiable
  Given the shipped `constitution.md`
  When its articles are read
  Then it lists Articles I to XI as non-negotiable rules, with no exception
```
