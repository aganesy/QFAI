# 09 Delta

## Change Summary

- Change ID: DELTA-0001-0001
- Date: 2026-04-01
- Primary: spec-0001 統合初回作成
- Tags: spec-pack, traceability, governance, consolidation
- Summary: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）を spec-0001（spec-pack 構造定義）に統合

## Rationale

- 旧 3 spec はいずれもフレームワーク設計仕様であり、spec-pack 構造、トレーサビリティ連鎖、Governance は密接に関連
- v1421 layered spec-pack 構造への移行に伴い、構造定義を 1 つの spec に集約
- 実装 SSOT（specLayout.ts, specPack.ts）との整合性を優先

## Consolidation Mapping

| 新 ID 範囲        | 旧 spec   | 旧 ID 範囲              | 概要                              |
| ----------------- | --------- | ----------------------- | --------------------------------- |
| US-0001-0001~0003 | spec-0009 | US-0009-0001~0003       | Layered Spec 構造、レイアウト検出 |
| US-0001-0004~0007 | spec-0009 | US-0009-0001, 0003~0005 | トレーサビリティ、参照方向、Drift |
| US-0001-0008      | spec-0007 | US-0007-0001~0005       | Skill オーケストレーション        |
| US-0001-0009      | spec-0010 | US-0010-0001~0006       | Steering & Governance             |

## Candidates Considered

1. 旧 3 spec を独立に維持し ID のみ再採番
2. 3 spec を 1 つの spec-0001 に統合（採用）

## Adopted

- Adopted: 統合
- Why: 構造定義・トレーサビリティ・Governance は相互参照が密接で、分離管理のコストが統合コストを上回る

## Rejected

- Candidate: 独立維持
- Reason: spec 間の相互参照が多く、変更時の整合性維持が困難
- DO NOT: spec-pack 構造に関する仕様を複数 spec に分散させない

## Impact

- Affects: `.qfai/specs/spec-0001/` 配下の全ファイル
- 旧 spec-0007, spec-0009, spec-0010 は `.qfai/archive/specs-v1.7.x/` に退避済み
- Validation: `qfai validate` でエラー 0

## Follow-ups

- qfai validate 構造検証の実行
- Owner: /qfai-sdd
- Due: 本バッチ完了時

## Implementation Delta Notes

- specLayout.ts の REQUIRED_LAYERED_SPEC_FILES_V1421 は 9 ファイル（10_Plan.md は含まない）。旧 spec-0009 は 10 ファイル（10_Plan 含む）と記載していたが、実装に合わせて 9 + optional 10_Plan.md に修正
- 旧 spec-0007 の AskUserQuestion Protocol 関連 BR/EX/TC は Steering & Governance の一部として US-0001-0009 に包含

## Triage

| Source             | Subject                                                                                                                | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| REQ-0001 (CHG-003) | 4-layer assistant-tree (constitution / manifest / catalog / process + agents / skills) を structural definition に追加 | spec-0001     | UPDATE    | APPEND | pin-implied | spec-pack structural definition の責務 (CAP-0001)。subject-token overlap (`asset`, `tree`, `assistant`). 新 CAP 不要。 |

## CHG-003 (v1.9.0) — Assistant-layer Recut Structural Definition

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Operation: UPDATE:APPEND
- Subject: `.qfai/assistant/` の top-level entry を 6 つに固定 (`constitution/`, `manifest/`, `catalog/`, `process/`, `agents/`, `skills/`) — `assistantAssets.ts` がこの enum を SSOT として参照する
- Cascade:
  - downstream spec-0003 (init) が新 layer 構造を seed
  - downstream spec-0004 (validate) が新 layer 構造を enforce
- Out-of-scope (this spec): 旧 layout の deprecation 受理は spec-0004 が記述。`assistantPaths.ts` SSOT module は spec-0003 / spec-0004 が記述
- Implementation-phase 詳細 US/AC/BR/EX/TC は次回の per-spec SDD pass で append される
- Source: REQ-0001

## Triage (2026-09-24 intent-driven entry)

Source IDs are `discussion-20260923171450572#<ID>`. The `CREATE` of `spec-0018` and the policy rows are in `_policies/10_delta.md` under the same heading. None of the rows below needs approval. `REQ-0033` in `Depends-On` stands for the `CREATE` row: the row cites items `spec-0018` defines, so it waits until that spec has them.

| Source                                 | Subject                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                      | Depends-On        |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| REQ-0001, REQ-0049                     | The skill catalog gains `qfai-run` and `qfai-maintain`                                                                                                                                                      | spec-0001     | UPDATE    | MODIFY | -           | AC-0001-0010 and BR-0001-0020 enumerate the catalog, and the enumeration changes with two more skills. No other catalog entry changes in this row                                                                                                                                                                                                              | REQ-0033          |
| REQ-0006                               | The skill order gains the entry above the stage skills, and the built-in route plans                                                                                                                        | spec-0001     | UPDATE    | MODIFY | -           | AC-0001-0011 and BR-0001-0021 fix one stage order. Each route plan selects part of it, so the rule has to say that the order holds within a plan and that `qfai-run` sits above it                                                                                                                                                                             | REQ-0033, OQ-0009 |
| REQ-0050, REQ-0051, REQ-0052, REQ-0053 | Shared contract for stage skills: descriptions as trigger conditions, an entry check that hands over to `qfai-run`, one `references/orchestrated-mode.md` cited by one line, and standalone invocation kept | spec-0001     | UPDATE    | APPEND | -           | spec-0001 owns the skill orchestration contract every skill shares. OQ-0015 and OQ-0016 were settled as A: the skills a built-in plan dispatches (`qfai-sdd`, `qfai-atdd`, `qfai-implement`, `qfai-verify`, `qfai-discussion`, `qfai-prototyping`), plus `qfai-maintain` for the description rewrite. Each skill spec carries its own behaviour in its own row | REQ-0033          |
| REQ-0056                               | Inside an active run, Stage 0 validates and reuses the shared snapshot and refreshes only what changed                                                                                                      | spec-0001     | UPDATE    | MODIFY | -           | AC-0001-0012 and BR-0001-0023 make Stage 0 mandatory at every skill start. Inside a run a validated shared snapshot satisfies it. Outside a run it is unchanged, and stage-specific checks are never served from the cache                                                                                                                                     | REQ-0033          |
| REQ-0057                               | The constitution and `workflow.md` state request authority and orchestrated binding, and that routes are orthogonal to change types                                                                         | spec-0001     | UPDATE    | APPEND | -           | Steering & Governance belongs to this spec. BR-0001-0024 (the articles are non-negotiable) is unchanged: the new text adds statements and excepts no article                                                                                                                                                                                                   | REQ-0033, OQ-0008 |
| REQ-0046, REQ-0047                     | Drift protocol: a spec-unchanged bugfix raises no Change Request, and a diagnosed missing-test row is appended without one                                                                                  | spec-0001     | UPDATE    | MODIFY | -           | BR-0001-0018 sends every upstream change through a Change Request, and BR-0001-0019 lists the only exception. D13 adds a second exception for the Phase 2b append, which leaves AC and BR untouched. REQ-0046 forbids a Change Request that states a change which did not happen. The five steps for real drift stand                                          | REQ-0033, OQ-0009 |

## 2026-09-24 — Intent-driven entry: change summary

- Modified in place, IDs kept, no `Source` added: AC-0001-0010 and BR-0001-0020
  (the catalog gains `qfai-run` and `qfai-maintain`; the count is dropped),
  AC-0001-0011 and BR-0001-0021 (the order holds within each built-in plan, and
  `qfai-run` sits above it), AC-0001-0012 and BR-0001-0023 (Stage 0 reuse inside
  a run), BR-0001-0019 (three drift exceptions). BR-0001-0018 and AC-0001-0009
  stand.
- Appended: US-0001-0010; AC-0001-0013..0019; BR-0001-0025..0031; the
  `## Contract Realization` table in `04_Business-Rules.md`.
- Resolved pack questions this entry waited on:
  - `discussion-20260923171450572#OQ-0008`, settled by CLI-WF `## Authorizations`;
  - `discussion-20260923171450572#OQ-0009`, settled by CLI-WFFILE `### Vocabulary`
    and DR-0297.
- Not changed by this entry: the other catalog entries of AC-0001-0010 and
  BR-0001-0020, including the deprecated `tdd-*` skills, and US-0001-0008. The
  triage row bounds the edit to the two added skills.
- Reserved IDs: US-0001-0011..0014 name stories of the former spec-0001 in
  `spec-0003/09_delta.md`, so the next new story here is US-0001-0015. New test
  cases stay below TC-0001-0050, because a test fixture carries
  `QFAI:SPEC-0001:TC-0001-0050`, `-0051`, `-0100` and `-0101` as strings.
- Size: AC 12 → 19, under the threshold.

## Decision Log

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-24
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0001
  - assistant/constitution/shared-skill-operating-baseline.md
  - assistant/skills/*/SKILL.md
notes: The stage-skill rules name their skill set as every skill a built-in plan names (DR-0001-0010).
```

#### Migration / Follow-ups

- `qfai-maintain` is in the set. Its description and `orchestrated-mode.md` are
  authored under spec-0018.

#### Rejected

- option: The six-skill list typed at triage
  reason: The workflow file contract requires every skill a plan names to declare its operations, and the `direct` plan names `qfai-maintain`.
  do_not: Type the skill list into a business rule.
  temptation: A literal list reads as more precise.

#### Verification

- The test case for BR-0001-0028 holds the literal skill set.

## 2026-09-24 — Phase 2c.1 obligation amendment

- BR-0001-0019 is reworded, ID kept. The rule no longer counts the exceptions. It
  says the drift protocol's minimal whitelist keeps every exception it lists and
  gains the two bugfix exceptions (DR-0297). The whitelist itself is not copied
  into this spec.

## Change Requests

| CR ID            | Upstream artifact                                                                      | Mode      | Approved by | Applied at           |
| ---------------- | -------------------------------------------------------------------------------------- | --------- | ----------- | -------------------- |
| CR-20260924-0002 | `.qfai/contracts/cli/qfai-workflow.md`                                                 | re-derive | user        | 2026-09-24T18:26:35Z |
| CR-20260925-0004 | `.qfai/contracts/cli/qfai-workflow.md`; `.qfai/contracts/cli/workflow-files.schema.md` | re-derive | user        | 2026-09-24T19:00:08Z |
