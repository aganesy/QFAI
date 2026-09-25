# 09 Delta

## 2026-09-25 — Two statements restated to the product

Two rules in this pack were contradicted by the product that satisfies them.

| Rule         | Stated before                                        | Stated now                                                                                                                            |
| ------------ | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Direction    | discussion selects no direction and no design system | discussion ranks no screen exploration and finalizes no design system; the user chooses the brand direction                           |
| Requiredness | a UI-bearing pack requires `prototyping.yaml`        | the file is optional for a pack with a visual prototyping surface, a cli-only pack carries none, and readiness requires it of no pack |

| Op ID  | Op Type | Target                                                                         | Summary                                                                 |
| ------ | ------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| OP-001 | UPDATE  | REQ-0012, US-0002-0005, AC-0002-0008, BR-0002-0008, EX-0002-0008, EX-0002-0009 | the direction rule binds the screen explorations                        |
| OP-002 | UPDATE  | TC-0002-0008, TC-0002-0009                                                     | observed against the shipped completion conditions                      |
| OP-003 | UPDATE  | REQ-0005, AC-0002-0010, BR-0002-0010, EX-0002-0011, TC-0002-0011               | the artifact is optional, and absent from a cli-only pack               |
| OP-004 | UPDATE  | DR-0002-0001, DR-0002-0003                                                     | the decisions narrowed the same way                                     |
| OP-005 | UPDATE  | tdd/test-list.md (TDD-0008, -0009, -0012, -0016)                               | reset to `todo`; TDD-0012 re-pointed at the three-document wording case |
| OP-006 | DELETE  | tdd/test-list.md (TDD-0010)                                                    | retired and reserved; its case stays in the suite unledgered            |

### Rejected

- Candidate: restore a single-winner validator and make `prototyping.yaml` a readiness blocker.
- Reason: both narrowings were made on purpose, and a cli-only pack cannot produce the file.
- DO NOT: require `prototyping.yaml` of a cli-only pack.
- Temptation: a UI-bearing flag looks like the natural predicate for the file.

## Change Summary

- Change ID: DELTA-0002-0003
- Date: 2026-04-23
- Primary: exploration-first discussion planner rewrite
- Tags: discussion-pack, planner-first, sidecar-family, selected-direction-removal
- Summary: spec-0002 を exploration-first / planner-first 実装に再同期し、旧 single-winner selection、legacy comparison、legacy 3-layer sidecar family、discussion 時点の design-system 固定を active path から除去

- Change ID: DELTA-0002-0004
- Date: 2026-09-25
- Primary: CR-20260912-0003 option 1, owner re-derivation
- Tags: planner-first, design-direction, prototyping-yaml
- Summary: the direction rule binds the screen explorations, and `prototyping.yaml` is optional for a pack with a visual prototyping surface

## Rationale

- 直近実装 `cf5080f2` では discussion が visual winner を決めず、prototyping が `5->3->2->1` funnel と breakthrough loop を持つ
- discussion spec が旧 sidecar family を前提にしていると、実装と spec の責務分離が崩れる

## Adopted

- exploration-first sidecar family を canonical に更新
- planner-first / no winner rule を active requirement に昇格
- discussion-to-SDD handoff を exploration brief / rubric / calibration / screen contracts 中心に更新

## Rejected

- Candidate: 旧 single-winner selection / legacy comparison を historical active path として残す
- Reason: 現行実装と矛盾し、読者が旧フローを現行と誤認する
- DO NOT: discussion で winner direction や finalized design system を確定させない

## Impact

- Affects: `spec-0002/01..07,09`
- Downstream relation: `/qfai-sdd` は exploration-first sidecar を contracts に正規化し、winner 系 contract は prototyping 後半で生成される

## Follow-ups

- `_policies/05_Contracts.md` と `spec-0013` の contract normalization 記述を同期
- `spec-0012` / `spec-0014` の prototyping / verify 記述を winner-derived design system 前提に同期

## Change Requests

| CR ID            | Upstream artifact                                                       | Mode      | Approved by | Applied at           |
| ---------------- | ----------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260912-0003 | `spec-0002/01_Spec.md` (REQ-0012, REQ-0005) and the layers beneath them | re-derive | user        | 2026-09-25T00:21:41Z |
