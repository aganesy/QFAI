# 09 Delta

## Change Summary

- Change ID: DELTA-0002-0003
- Date: 2026-04-23
- Primary: exploration-first discussion planner rewrite
- Tags: discussion-pack, planner-first, sidecar-family, selected-direction-removal
- Summary: spec-0002 を exploration-first / planner-first 実装に再同期し、旧 single-winner selection、legacy comparison、legacy 3-layer sidecar family、discussion 時点の design-system 固定を active path から除去

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

| CR ID            | Upstream artifact            | Mode      | Approved by             | Applied at |
| ---------------- | ---------------------------- | --------- | ----------------------- | ---------- |
| CR-20260924-0003 | `spec-0002/tdd/test-list.md` | re-derive | user (2026-09-24 reply) | 2026-09-24 |

### CR-20260924-0003: Correct unsupported ledger completion claims

`TC-0002-0009` remains outstanding. `TDD-0009` returns to `todo` with no test file or selector because its former skill-guidance test did not prove the planner-first violation. Its former Evidence was `current e2e guidance test pass`.

`TDD-0010` is retired and its ID is reserved. Its former preflight test covered optional artifact handling rather than the cited case. Its former Evidence was `current preflight unit test pass`. The runtime tests belong to `spec-0013` under `CR-20260913-0012`. The separate product decision remains open in `CR-20260912-0003`.
