# 09 Delta

## Triage (2026-09-23)

`qfai init` stops seeding the project-root work-log surface `.qfai/steering/`,
and leaves an existing one untouched.

| Source                                | Subject                                                                                                                                                                                                     | Existing Spec | Operation | Sub-op | Approved By   | Rationale                                                                                                                                                                                                                                      | Depends-On                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| discussion-20260923060900824#REQ-0001 | Remove project-root seeding: the REQ-0019 line and the CLI-WLOG contract line in 01_Spec.md, AC-0003-0018, BR-0003-0016, EX-0003-0019, TC-0003-0022; ledger row TDD-0022 deleted and its ID tombstoned      | spec-0003     | UPDATE    | REMOVE | yusuke_senaga | The behaviour is removed. TDD-0022 is `done` on the TC-0003-0022 block of `tests/cli/init.test.ts`, which is deleted in the same change                                                                                                        | -                                     |
| discussion-20260923060900824#REQ-0001 | Narrow US-0003-0016 to the four-layer seed: drop the `.qfai/steering/` clause from its title, Goal and Notes                                                                                                | spec-0003     | UPDATE    | MODIFY | yusuke_senaga | The story also carries REQ-0018 and AC-0003-0017, which stay. Before: four-layer seed and work-log seed. After: four-layer seed. Nothing else is added or dropped; E2E row TDD-0064 keeps `US-Refs: US-0003-0016` unchanged                    | -                                     |
| discussion-20260923060900824#REQ-0016 | Resolve OQ-0003-0002 (auto-archival of work-log entries) as moot                                                                                                                                            | spec-0003     | UPDATE    | MODIFY | yusuke_senaga | The question is about a surface that no longer exists. Resolving keeps the record of why it closed                                                                                                                                             | -                                     |
| discussion-20260923060900824#REQ-0010 | Append AC-0003-0039, BR-0003-0049, EX-0003-0052, EX-0003-0053, TC-0003-0059, TC-0003-0060: init creates, modifies and deletes nothing under `.qfai/steering/`                                               | spec-0003     | UPDATE    | APPEND | yusuke_senaga | Carries the absence signal of REQ-0001 and the hash test of REQ-0010 and NFR-0003: an empty directory gets no path there and no work-log line in the generated instructions; a populated one is byte-identical after `init` and `init --force` | discussion-20260923060900824#REQ-0001 |
| discussion-20260923060900824#REQ-0006 | Append BR-0003-0050, EX-0003-0054, TC-0003-0061 under AC-0003-0039: `init --force` deletes a lock-recorded, unedited `catalog/worklog-entry.schema.md` and keeps an edited one with the edited-content note | spec-0003     | UPDATE    | APPEND | yusuke_senaga | No item states the withdrawn-asset retire pass, and REQ-0006's acceptance needs a test. Existing behaviour; no new code                                                                                                                        | discussion-20260923060900824#REQ-0010 |

- Approved By: yusuke_senaga, through AskUserQuestion on 2026-09-23, for this
  target's rows as one set.
- Ledger: Phase 2b deletes TDD-0022, records it under a new
  `## TDD-ID reservations` citing the REMOVE row above, and seeds rows for
  TC-0003-0059..0061.
- Size: AC 38 and TC 58 exceed the slice-policy threshold. The spec owns one
  capability (CAP-0003), so this is recorded and not split.
- Retired row: `spec-0003/TDD-0022` (TC-0003-0022, `done`), under the REMOVE row
  above. Its `Evidence` cell, verbatim:
  `v1.9.0 RED→GREEN 2026-05-23 (README + .gitkeep + \_templates/entry.md, re-init preserved)`.
- The tests and annotations that row drove are `/qfai-implement`'s to delete,
  in the change that removes the seed:
  - `packages/qfai/tests/cli/init.test.ts`: the six `it` blocks named
    `TC-0003-0022 (TDD-0022)` at lines 3580-3760, with their annotation
    comments, and the `WORKLOG_ENTRY_STATUSES` import at line 37, which only
    those blocks use. The file is shared with live rows, so confirm afterwards
    that the selectors of TDD-0018..0021, TDD-0023..0026 are still present.
  - `packages/qfai/tests/integration/initSpec0003.test.ts`: the file-level
    `QFAI:SPEC-0003:TC-0003-0022` annotation at line 29 and the `TC-0003-0022`
    describe block at lines 221-227. The file is shared with live rows, so
    confirm afterwards that the selectors of TDD-0001..0015 and TDD-0025 are
    still present.
  - `tests/integration/qfai-traceability.md`: the carrier entry
    `QFAI:SPEC-0003:TC-0003-0022` at line 59.
- `/qfai-implement` action, with no row change: two tests of TDD-0025 (`done`)
  assert `joinProjectSteering`, which upstream REQ-0005 removes:
  - `packages/qfai/tests/integration/initSpec0003.test.ts:256`, in the
    `TC-0003-0025` describe block;
  - `packages/qfai/tests/cli/init.test.ts:4120`, in the
    `TC-0003-0025 (TDD-0025)` test. It is a string check on `init.ts`, so the
    type check does not catch it.

  Remove both assertions with the symbol. TDD-0025 is not reset, because
  TC-0003-0025's obligation does not change.

- Tier: seeded as T2 on TDD-0094..0099 only. The rows already in the ledger
  keep their cell: no Change Request asks for a re-derivation, and raising the
  tier of an untouched `done` row would reset it to `todo`.

## Update History

| Date       | DL      | Summary                                                                         |
| ---------- | ------- | ------------------------------------------------------------------------------- |
| 2026-09-23 | DL-0001 | REQ-0032 and AC-0003-0039: init seeds and touches no work-log surface           |
| 2026-09-23 | DL-0002 | US-0003-0016 narrows to the four-layer seed                                     |
| 2026-09-23 | DL-0003 | AC-0003-0039 belongs to US-0003-0016                                            |
| 2026-09-23 | DL-0004 | The absence criterion covers init's report                                      |
| 2026-09-23 | DL-0005 | The withdrawn schema's retirement keeps its own BR, EX and TC                   |
| 2026-09-23 | DL-0006 | TC-0003-0060 covers plain init and `init --force`                               |
| 2026-09-23 | DL-0007 | EX-0003-0053 uses a partial seed                                                |
| 2026-09-23 | DL-0008 | Six ledger rows, one per independently failing part                             |
| 2026-09-23 | DL-0009 | Cells of TDD-0094..0099                                                         |
| 2026-09-23 | DL-0010 | `## TDD-ID reservations` holds the TDD-0022 tombstone                           |
| 2026-09-23 | DL-0011 | Tier seeded on the new rows only                                                |
| 2026-09-23 | DL-0012 | The TDD-0025 assertions on `joinProjectSteering` are a `/qfai-implement` action |
| 2026-09-23 | DL-0013 | BR-0003-0050 cites CLI-INIT                                                     |
| 2026-09-23 | DL-0014 | BR-0003-0050's recorded hash resolves through `.assets.lock.json`               |
| 2026-09-23 | DL-0015 | BR-0003-0049 is realized by what init does not write                            |
| 2026-09-23 | DL-0016 | The plan names init's removed symbols and cites spec-0004's plan for the order  |
| 2026-09-23 | DL-0017 | The removal's tests build their own trees                                       |

## Decision Log

### DL-0001

#### Meta

```yaml
id: DL-0001
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Change
scope:
  - spec-0003/01_Spec.md (REQ-0032 replaces REQ-0019)
  - spec-0003/03_Acceptance-Criteria.md (AC-0003-0039)
notes: REQ-0032 states that init seeds and touches no work-log surface, and AC-0003-0039 cites it (DR-0003-0013).
```

#### Migration / Follow-ups

- A project initialised before this change keeps its `.qfai/steering/`, and
  init leaves it as it is.

#### Rejected

- option: Cite the upstream requirements directly in the AC Catalog
  reason: The catalog's Notes column holds one spec-local REQ per row.
  do_not: List upstream requirement ids in the AC Catalog.
  temptation: It avoids minting a local id for three upstream ones.

#### Verification

### Plan

```yaml
- id: VFY-001
  level: integration
  target: init creates, modifies and deletes nothing under .qfai/steering/
  method: TC-0003-0059, TC-0003-0060 and TC-0003-0061 through TDD-0094..0099
  owner: dev
  expected: All six rows reach done, each having failed first against the code that still seeds.
  links:
    - .qfai/specs/spec-0003/tdd/test-list.md
```

### DL-0002

#### Meta

```yaml
id: DL-0002
date: 2026-09-23
primary: Behavior
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0003/02_User-stories.md (US-0003-0016)
notes: US-0003-0016 narrows to the four-layer seed and drops the frontmatter-schema non-goal (DR-0003-0014).
```

#### Migration / Follow-ups

- No migration required. TDD-0064 keeps `US-Refs: US-0003-0016` and stays
  `todo`.

#### Rejected

- option: Keep the frontmatter-schema non-goal
  reason: It names a spec-0004 check that no longer exists.
  do_not: Restore a non-goal that points at a removed check.
  temptation: A non-goal looks harmless to keep.

### DL-0003

#### Meta

```yaml
id: DL-0003
date: 2026-09-23
primary: Behavior
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0003/03_Acceptance-Criteria.md (AC-0003-0039)
notes: AC-0003-0039 is parented on US-0003-0016 (DR-0003-0015).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A new story for the absence of the surface
  reason: The criterion is the negative of the half US-0003-0016 lost.
  do_not: Open a story for behaviour that no longer exists.
  temptation: A removal can look like a feature of its own.

### DL-0004

#### Meta

```yaml
id: DL-0004
date: 2026-09-23
primary: Behavior
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0003/03_Acceptance-Criteria.md (AC-0003-0039)
  - spec-0003/04_Business-Rules.md (BR-0003-0049)
notes: The absence criterion covers init's report; the --force NOTE wording and unrecorded copies get no criterion (DR-0003-0016).
```

#### Migration / Follow-ups

- The NOTE wording changes in the implementation.

#### Rejected

- option: Pin the --force NOTE wording and the unrecorded copy in the criterion
  reason: No upstream acceptance signal needs them.
  do_not: Add criteria the request does not need.
  temptation: Upstream REQ-0001's description names the NOTE.

### DL-0005

#### Meta

```yaml
id: DL-0005
date: 2026-09-23
primary: Behavior
tags: ["@docs", "@test"]
compat: Improvement
scope:
  - spec-0003/04_Business-Rules.md (BR-0003-0050)
  - spec-0003/05_Examples.md (EX-0003-0054)
  - spec-0003/06_Test-Cases.md (TC-0003-0061)
notes: The withdrawn schema's retirement keeps its own rule, example and test case (DR-0003-0017).
```

#### Migration / Follow-ups

- No migration required. The retire pass already exists.

#### Rejected

- option: Rely on the generic retire-pass test in assistantAssetProvenance.test.ts
  reason: It proves neither this file's withdrawal nor the edited-content note, and dropping the rows changes an approved APPEND row.
  do_not: Drop BR-0003-0050, EX-0003-0054 or TC-0003-0061 without the user's approval.
  temptation: The retire pass is already tested.

### DL-0006

#### Meta

```yaml
id: DL-0006
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/06_Test-Cases.md (TC-0003-0060)
notes: TC-0003-0060 covers plain init and init --force (DR-0003-0018).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Cover init --force only
  reason: Upstream REQ-0010 says "with or without --force".
  do_not: Leave the plain run untested.
  temptation: REQ-0010's acceptance names --force alone.

### DL-0007

#### Meta

```yaml
id: DL-0007
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/05_Examples.md (EX-0003-0053)
notes: EX-0003-0053 uses a partial seed so its test fails first (DR-0003-0019).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A fully seeded, unedited directory
  reason: Create-only copying leaves it alone, so the test passes on the code that still seeds.
  do_not: Use a fixture the current code already satisfies.
  temptation: It looks like the most common adopter state.

### DL-0008

#### Meta

```yaml
id: DL-0008
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/tdd/test-list.md (TDD-0094..0099)
notes: Six ledger rows, two per new test case, one per independently failing part (DR-0003-0020).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: One row per test case
  reason: A RED run stops at the first failing assertion and leaves the second part unobserved.
  do_not: Seed one row over two independently failing parts.
  temptation: Fewer rows.

### DL-0009

#### Meta

```yaml
id: DL-0009
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/tdd/test-list.md (TDD-0094..0099)
notes: Cells of the six new rows, with module paths from the repository root (DR-0003-0021).
```

#### Migration / Follow-ups

- `/qfai-implement` fills `Test file` and `Selector` when it advances each row.

#### Rejected

- option: Package-relative module paths such as src/cli/commands/init.ts
  reason: Every path in this ledger is from the repository root.
  do_not: Mix path bases in one column.
  temptation: The package is where the module lives.

### DL-0010

#### Meta

```yaml
id: DL-0010
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0003/tdd/test-list.md (## TDD-ID reservations)
notes: The reservations section sits after the ledger table and holds the TDD-0022 tombstone (DR-0003-0022).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Place the section above the ledger
  reason: validateTddList reads the first table as the ledger.
  do_not: Put anything table-shaped above the ledger.
  temptation: Reservations read naturally before the rows they reserve.

### DL-0011

#### Meta

```yaml
id: DL-0011
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/tdd/test-list.md (Tier)
notes: Tier is seeded on the new rows only (DR-0003-0023).
```

#### Migration / Follow-ups

- Rows seeded earlier keep their `Tier` until a Change Request re-derives them.

#### Rejected

- option: Re-derive Tier on every row
  reason: No Change Request drives it, and a raise resets an untouched done row to todo.
  do_not: Re-derive Tier on rows this run does not add or reset.
  temptation: Phase 2b asks for Tier on every row it seeds.

### DL-0012

#### Meta

```yaml
id: DL-0012
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - packages/qfai/tests/integration/initSpec0003.test.ts:256 (TDD-0025)
  - packages/qfai/tests/cli/init.test.ts:4120 (TDD-0025)
notes: The two TDD-0025 assertions on the removed joinProjectSteering symbol are a /qfai-implement action (DR-0003-0024).
```

#### Migration / Follow-ups

- `/qfai-implement` removes both assertions in the change that removes the
  symbol.

#### Rejected

- option: Reset TDD-0025 to todo
  reason: TC-0003-0025's obligation does not change.
  do_not: Reset a done row whose obligation is unchanged.
  temptation: Its test fails once the symbol is gone.

### DL-0013

#### Meta

```yaml
id: DL-0013
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0003/04_Business-Rules.md (BR-0003-0050 Contract-Refs)
notes: BR-0003-0050 cites CLI-INIT, the contract of the command that runs the retire pass (DR-0003-0025).
```

#### Migration / Follow-ups

- The obligation-reconciliation phase records the lock hash as init's internal
  record of existing behaviour.

#### Rejected

- option: Contract-Refs "-"
  reason: The rule is realised by the init command, whose contract is CLI-INIT.
  do_not: Leave a rule of the init command bound to no contract.
  temptation: No contract line describes the retire pass.

### DL-0014

#### Meta

```yaml
id: DL-0014
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0003/04_Business-Rules.md (BR-0003-0050)
notes: The recorded hash of BR-0003-0050 resolves through the .assets.lock.json entry retireWithdrawnGovernedAssets reads, with no contract write (DR-0003-0026).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Add a line to qfai-init.md naming the lock record and the retire pass
  reason: It widens the approved contract edits, and REQ-0006 asks for no new behaviour.
  do_not: Add a contract line for the retire pass in this change.
  temptation: Obligation reconciliation asks for a contract field.

### DL-0015

#### Meta

```yaml
id: DL-0015
date: 2026-09-23
primary: Ops
tags: ["@api", "@docs"]
compat: Improvement
scope:
  - spec-0003/04_Business-Rules.md (BR-0003-0049)
notes: BR-0003-0049 is realized by what init does not write; qfai-init.md gains no line (DR-0003-0027).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Restore a "must not touch .qfai/steering/" line in qfai-init.md
  reason: It reverses an approved contract edit.
  do_not: Put a protective line for the removed surface back in the contract.
  temptation: A negative rule has no positive contract line to point at.

### DL-0016

#### Meta

```yaml
id: DL-0016
date: 2026-09-23
primary: Ops
tags: ["@docs"]
compat: Improvement
scope:
  - spec-0003/10_Plan.md
notes: The plan states the init part of the removal by symbol and cites spec-0004's plan for the order (DR-0003-0028).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: Restate the order of the whole change in this plan
  reason: Six copies of one order drift apart.
  do_not: Copy the removal order out of spec-0004's plan.
  temptation: The implementer of this spec reads this plan first.
- option: Rewrite the earlier sections of this plan
  reason: The request does not cover them.
  do_not: Re-audit or rewrite the CHG-007 sections in this change.
  temptation: One line there still calls US-0003-0021..0028 unimplemented.

### DL-0017

#### Meta

```yaml
id: DL-0017
date: 2026-09-23
primary: Ops
tags: ["@test"]
compat: Improvement
scope:
  - spec-0003/10_Plan.md (Test approach)
notes: The removal's tests build their own trees; no shared fixture is planned (DR-0003-0029).
```

#### Migration / Follow-ups

- No migration required.

#### Rejected

- option: A shared fixture for a populated .qfai/steering/ tree
  reason: The three trees differ, so there is no third identical caller.
  do_not: Plan a shared fixture before three callers need the same tree.
  temptation: Three tests put files under the same directory.

## 2026-09-22 — US-0003-0014 retired (README file generation)

- Date: 2026-09-22
- Primary: retired US-0003-0014 and the end-to-end row that carried it
- Tags: init, agents, retirement

The story asked for a `README.md` as a regular file in `.agents/`, `.codex/`,
`.claude/agents/` and `.github/agents/`. Nothing wrote one, and nothing should:
those directories hold agent cards, and what a directory needs to say goes where
the reader already is — the entry point that routed them there, or the rule master
the card cites. `scripts/check-tracked-readmes.mjs` refuses a tracked README outside
the two this project publishes, so implementing the story would have made this
repository's own checks fail on the tree it produced.

| Op ID  | Op Type | Target                            | Summary                                   |
| ------ | ------- | --------------------------------- | ----------------------------------------- |
| OP-001 | DELETE  | 02_User-stories.md (US-0003-0014) | the story and its catalog entry           |
| OP-002 | DELETE  | tdd/test-list.md (TDD-0082)       | the end-to-end row that carried it        |
| OP-003 | DELETE  | tests/e2e/qfai-traceability.md    | the annotation that named the story       |
| OP-004 | UPDATE  | tests/e2e/initE2E.test.ts         | the case now asserts the files are absent |

The case that looked like the story's coverage guarded every assertion behind an
existence check and read two of the four directories, so it passed over the empty
set and would have passed over any tree. It now reads all four and asserts they
carry no README, which is what this change specifies.

## Change Summary

- Change ID: DELTA-0001
- Date: 2026-04-01
- Primary: spec-0003 新規作成（旧 spec-0001, spec-0017, spec-0018 の統合）
- Tags: init, symlink, instructions, codex, consolidation

- Change ID: DELTA-0002
- Date: 2026-09-23
- Primary: Behavior
- Tags: @api, @docs, @test
- Summary: `qfai init` no longer seeds `.qfai/steering/` and leaves an existing
  one untouched. REQ-0019 and its AC, BR, EX and TC are removed with ledger row
  TDD-0022. REQ-0032, AC-0003-0039, BR-0003-0049, BR-0003-0050,
  EX-0003-0052..0054 and TC-0003-0059..0061 are added, seeded as
  TDD-0094..0099. OQ-0003-0002 is resolved as moot.

## Migration Record

This spec consolidates the following archived specs:

| Old Spec  | Title                       | Key Changes                                                                 |
| --------- | --------------------------- | --------------------------------------------------------------------------- |
| spec-0001 | qfai init                   | Core init functionality retained as-is. IDs renumbered to 0003-XXXX         |
| spec-0017 | Copilot Review Instructions | Merged as US-0003-0011..US-0003-0013. create-only protection retained       |
| spec-0018 | Codex Sub-Agent TOML        | TOML files are static assets; init.ts does not auto-generate them (DR-0003) |

## Outdated Content Removed

- 旧 spec-0001 の US-0001-0011..US-0001-0014（マイグレーション/バージョン正規化/内部モジュールドキュメント/カノニカルテンプレート）は未実装のため除外
- 旧 spec-0018 の TOML ファイル生成詳細（39 ファイル仕様）は旧体系として残し、新体系では 19 consolidated agents の静的 TOML 配布に更新した
- REQ-0005 は旧「マルチツールラッパー生成」から「マルチツール symlink 統合」に更新（実装と一致）

## Adopted

- Adopted: 旧 3 スペックの統合（1 CAP = 1 spec directory 原則に準拠）
- Why: init コマンドは単一 CLI コマンドであり、CAP-0003 として統合管理する方が保守性が高い
- Evidence: `packages/qfai/src/cli/commands/init.ts` が全機能を単一ファイルで実装している

## Rejected

- Candidate: 旧スペックをそのまま維持（3 スペック体制）
- Reason: 1 CAP = 1 spec directory の原則に反し、init 関連の変更時に 3 スペック間の整合性管理が必要になる
- DO NOT: init コマンドの機能を複数スペックに分割しないこと
- Temptation: 「instructions 配布は独立機能」だが、実装上は init.ts の一部であり分離は不要

## v1.7.13 (2026-04-04) — Canonical Sidecar Convergence

- adopted: contracts/design/ ディレクトリを init 対象に追加（design contracts 格納用）
- rationale: v1.7.13 で assets/init/.qfai/contracts/design/README.md が追加された実装の反映

## v1.7.18 (2026-04-19) — Gitignore Managed Block Formalization and review-\*/ default-ignore

- adopted: REQ-0016（ルート `.gitignore` 管理ブロック追記）と REQ-0017（レガシー行自動移行）を spec-0003 に追加。US-0003-0015, AC-0003-0015/0016, BR-0003-0013/0014, EX-0003-0016/0017, TC-0003-0018/0019/0020, DR-0003-0007 を新規登録
- adopted: 管理ブロックから `!.qfai/review/review-*/` と `!.qfai/review/review-*/**` を除去し、`review-*/` 配下をデフォルトで gitignore 対象とする
- adopted: `QFAI_GITIGNORE_LEGACY_LINES` による旧ブロックからの自動 migration ロジックを追加（`removeManagedBlock` を set-based matching に変更し、冪等性の判定にレガシー行の不在も条件に追加）
- rationale: 従来 spec-0003 は `.gitignore` 追記挙動を明文化しておらず、実装と spec の traceability gap が存在した。今回の review-\*/ default-ignore 変更と合わせて REQ/AC/BR/EX/TC を一括登録し、spec-code 整合性を回復
- impact:
  - `_policies/07_Constraints.md` の OC-03 を `.qfai/evidence/` 単独から `.qfai/report/*` + `.qfai/evidence/*` + `.qfai/review/review-*/` + `.qfai/discussion/discussion-*/` を含む範囲に拡張
  - `_policies/06_Glossary.md` の Review Pack 定義に「default gitignore」の注記を追加
  - テストは `packages/qfai/tests/cli/init.test.ts` に 2 ケース追加済み（legacy migration, review-\*/ ignore）
- migration: v1.7.17 以前の managed block を持つプロジェクトは `qfai init` 再実行で自動的に新形式へ移行。既コミット済みの `review-*/` を untrack したい場合は `git rm -r --cached .qfai/review/review-*/` を別途実行

## Triage

| Source                                                                                                       | Subject                                                                                                                                                                                       | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | --------- | ------ | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002 (CHG-003) | `qfai init` で新 layer tree を seed、project-root `.qfai/steering/` を seed、`--upgrade-assistant-tree` flag を実装、migration memo を author、`assistantPaths.ts` SSOT を参照                | spec-0003     | UPDATE    | APPEND | pin-implied | Primary capability owner (CAP-0003)。subject-token overlap (`init`, `seed`, `assistant`)。`packages/qfai/src/cli/commands/init.ts` が直接実装する。                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| discussion-20260804173914356#REQ-0014                                                                        | 配布 workflow の hardening（permissions / concurrency+cancel / persist-credentials / bounding / header の Node floor 主張撤回 / lockfile 検出 cache 式の保持）                                | spec-0003     | UPDATE    | APPEND | -           | `qfai init` が既に `.github/workflows/qfai-validate.yml` を配布しており、`copyTemplateTree` を所有する。DR-0276 の境界は **distributed-or-not** であり、`packages/qfai/assets/init/root/.github/workflows/**` は本 spec、QFAI 自身の `.github/workflows/**` は spec-0017。**Size signal**: append 前 AC 24 / TC 26（閾値 30 AC / 50 TC）、append 後 AC 36 / TC 54 で **両方の閾値を超過**する。`11_Slice-Policy.md` step 4 は閾値超で SPLIT を示唆するが、`sdd-triage.md` の通り閾値超過は **signal であって operation ではない**。capability-ownership review の結果: spec-0003 は `CAP-0003` を exactly 1 つだけ所有するため SPLIT は違法（`validateSpecSplitByCapability` が `QFAI-SPLIT-102` / `QFAI-SPLIT-104` を error で raise し、合法な終状態が存在しない）。したがって operation は APPEND のまま変わらず、reasoned non-split をここに記録する。加えて本 spec 09_delta の Rejected 節が「init コマンドの機能を複数スペックに分割しないこと」を DO NOT として既に固定している |
| discussion-20260804173914356#REQ-0015                                                                        | 配布 action pin ポリシーと trailer 解決（40-hex SHA pin、可読 version は step name に leading `v` なし、closed sanctioned third-party allow-list）                                            | spec-0003     | UPDATE    | APPEND | -           | 配布ファイルの内容は本 spec の所有物。comment-blind な leakage guard（`\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b` を配布サーフェス全体に再帰 grep）が慣例的 trailer を構造的に禁じるため、解決は配布側の綴り変更に限定し guard は触らない（DR-0003-0008）。pre-build 規則を置く `lint-shipping.ts` と guard script 自体は `toolchain` = spec-0017 の所有物なので、本 spec は配布ファイル側の observable のみを assert する。co-change: `packages/qfai/tests/assets/assets.test.ts` の floating major 参照 assertion                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0016                                                                        | layer 分離された credential-free 配布 workflow set（`qfai-` prefix、複数ファイル、layer 分離は orchestrator 内 job、declared-script による inertness、zero-secret）                           | spec-0003     | UPDATE    | APPEND | -           | 配布 asset ツリーの追加は `copyTemplateTree` の write-set 拡張であり、所有者は本 spec。composite-action テンプレートは `scripts/verify-pack.mjs` の `allowedRootGithubEntries` が `workflows` のみを許可するため構造的に不可能で、scope 外として DR-0003-0009 に記録した                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0017                                                                        | 配布 change detection（third-party action なしの name-only diff + JSON filter、fail-open、green-on-skip verdict）                                                                             | spec-0003     | UPDATE    | APPEND | -           | 配布 orchestrator ファイルの内容なので本 spec。QFAI 自身の CI 側 detection（上流 pack REQ-0007、third-party action 使用）は spec-0017 の別実装であり、surface による意図的な二重実装（上流 OQ-0011）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| discussion-20260804173914356#REQ-0018                                                                        | 配布 runner label 間接化（repository variable 経由、public default、header table に variable / default / 無期限 queue 失敗モード）                                                            | spec-0003     | UPDATE    | APPEND | -           | 配布ファイルの内容。`qfai.config.yaml` への CI キー追加は上流 OQ-0006 で reject 済みなので、tuning は GitHub repository variable のみを経由する（spec-0009 の adopter config 探索とは surface が異なる）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| discussion-20260804173914356#REQ-0019                                                                        | 配布 Node version / package manager portability（version ファイル優先 + fail open、package manager 解決不能で fail closed、lockfile 検出 install branch の保持と拡張）                        | spec-0003     | UPDATE    | APPEND | -           | 既存配布 workflow の install 分岐を保持・拡張する変更なので所有者は本 spec。同じ setup-install 列の 2 前提条件が逆方向に degrade する点（NFR-C0013 の substitution test）が load-bearing であり、1 つの AC に畳まず AC-0003-0033 の 2 clause として分けて記録した                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| discussion-20260804173914356#REQ-0020                                                                        | 配布 workflow 所有権コントラクト（shipped 半分）— `qfai-` prefix reservation、in-binary write / prune name list、provenance、closed 5-state enum、`declined` の copy 前除外、primitive 再利用 | spec-0003     | UPDATE    | APPEND | -           | 上流 REQ-0020 は `Surface: both`。本 spec の担当は所有権コントラクトの**定義**（`qfai init` が write / prune の主体であるため）。**overwrite 動詞は含まない** — unconditional-overwrite refresh は上流 OQ-0021 で deferred（OQ-0003-0003 に mirror）。detection 半分は spec-0006（`qfai doctor`）に allocate 済みで、その state vocabulary は CLI-WFSET §3 の enum をそのまま使う。`init.ts` はルート asset を `force: false` / `conflictPolicy: "skip"` でハードコード copy するため `--force` は既導入 workflow を更新しない（DR-0003-0010）                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| discussion-20260804173914356#REQ-0021                                                                        | 配布 set の structural contract gate（宣言形状に対する diff、load-bearing semantic 値、`pnpm ci:lint` 配置、既存 asset test assertion の subsume）                                            | spec-0003     | UPDATE    | APPEND | -           | 配布 set に対する gate なので所有者は本 spec。**Ordering**: spec-0017 が担う上流 pack REQ-0025（リポジトリ自身の配布 validate workflow 複製の廃止）と**同一変更またはそれ以前**に着地しなければならない — 当該複製は現時点で reviewer が目視できる唯一の cross-check であり、自動 check の不在下で削除すると弱い control を no control に置換することになる。gate は `pnpm ci:lint` に置き `pnpm ci:gate` には置かない（`ci:gate` は release workflow のみが invoke するため pull request を red にできない）。宣言形状の**値**は test suite 側 1 箇所が SSOT で、CLI-WFSET は dimension 集合のみを固定する                                                                                                                                                                                                                                                                                                                                                                            |
| discussion-20260804173914356#REQ-0014..0021                                                                  | `06_Test-Cases.md` に `Type` 列、`04_Business-Rules.md` に `Contract-Refs` 列を追加（schema conformance）                                                                                     | spec-0003     | UPDATE    | APPEND | -           | 追加は purely additive。既存 ID の renumber は 0 件、既存 `Title` / `Rule` テキストの書き換えも 0 件で、既存行には新列のセル値のみを埋めた。理由: quality gate が `06_Test-Cases.md` に `TC-ID` / `Level` / `EX-Ref` / `AC-Refs` / `Type` を要求し、traceability rules が `Contract-Refs` を要求する一方、spec-0003 の表にはどちらの列も無かった。`collectTestCaseIds` と TDD coverage report が `parseFirstMarkdownTable` を読むため、新 TC 行を第 2 の表に分離すると spec 全体で `TDDLIST_TC_NOT_COVERED` が無効化される — 列追加が唯一の合法な選択肢                                                                                                                                                                                                                                                                                                                                                                                                                                |

## CHG-003 (v1.9.0) — Assistant-layer Recut + Work-log Surface Seed

- Discussion pack: `.qfai/discussion/discussion-20260522081618995/`
- Contract: `.qfai/contracts/cli/qfai-init.md` (CLI-INIT、Contract Index)、`.qfai/contracts/cli/worklog-entry.schema.md` (CLI-WLOG)
- Operation: UPDATE:APPEND
- New REQs (to be appended to `01_Spec.md#Relevant Requirements` in this CHG):
  - REQ-0018: 4-layer asset-tree seeding (`constitution/`, `manifest/`, `catalog/`, `process/`)
  - REQ-0019: project-root `.qfai/steering/` seeding (`README.md` + `.gitkeep` + `_templates/entry.md`); user-authored entries preserved on reinit
  - REQ-0020: `qfai init --upgrade-assistant-tree` one-shot migration helper; user edits preserved via `W-USER-EDIT-PRESERVED`
  - REQ-0021: migration memo authored at `.qfai/assistant/process/migrations/v<X.Y.Z>-assistant-layer-recut.md` (immutable after commit per OC-53)
  - REQ-0022: `assistantPaths.ts` SSOT module is the sole producer of distributed assistant-tree path strings consumed by `init`; hard-coded literals lint-rejected (NFR-0001)
  - REQ-0023: backwards-compatibility — old-layout files remain readable for exactly one minor release window (NFR-0002); sunset version named in `D-DEPRECATED-PATH` warning text
- New US (CHG-003 v1.9.0 — fully landed in 02_User-stories.md):
  - US-0003-0016: 4-layer asset-tree seed + work-log surface seed (REQ-0018, REQ-0019)
  - US-0003-0017: `--upgrade-assistant-tree` migration helper (REQ-0020)
  - US-0003-0018: migration memo authoring (REQ-0021)
  - US-0003-0019: assistantPaths.ts SSOT module (REQ-0022)
  - US-0003-0020: legacy layout backwards-compatibility window (REQ-0023)
- Cascade:
  - spec-0004 references `assistantPaths.ts` for validate-side path strings (companion row in spec-0004 09_delta)
  - downstream skill specs (spec-0008/0010/0011/0012/0013/0014/0016) consume the new layer paths via `project_memory:` block (companion rows in each spec)
- Out-of-scope (this spec): validation of frontmatter schema (spec-0004); Reviewer-Gate findings (spec-0015); skill-side `project_memory:` block (each skill spec)
- Implementation-phase 詳細 US/AC/BR/EX/TC は同じ v1.9.0 の per-spec SDD pass で append 済み — US-0003-0016..0020, AC-0003-0017..0024, BR-0003-0015..0020, EX-0003-0018..0023, TC-0003-0021..0026 すべて 02..06 に追加完了。
- Classifier routing contract (REQ-0020, `classifyLegacySteeringEntry`): the migration helper routes legacy entries using **exact basename (stem) Set membership** for catalog / manifest / constitution layers, and **top-segment matching** (`segments[0] === "process"` OR `segments[0] === "migrations"`) for the process layer. The `process/...` form strips its leading prefix on relocation; the `migrations/...` form is preserved as-is (lands at `.qfai/assistant/process/migrations/...`). Non-top-level `migrations` segments (e.g. `foo/migrations/bar.md`) explicitly fall through to the default `catalog/` layer so user docs are not pulled out from under their intended location. User docs whose filenames contain layer-relevant tokens (e.g. `agent-routing-notes.md`, `review-gate-overview.md`, `foo-migration-bar.md`, `quality-gate-summary.md`) are NOT mis-routed; previously the substring `.includes()` form would have pulled them into the canonical layers. This is a behavior change from the v1.9.0-alpha implementation; the unknown-stem fallback remains `catalog/` so unrouted user docs still land in a defensible default layer.
- Source: REQ-0001, REQ-0002, REQ-0008, REQ-0009, REQ-0011, REQ-0012, REQ-0013, REQ-0018, NFR-0001, NFR-0002

## CHG-004 — Codex agent profile を init 生成へ (RE-OPEN DR-0003-0003 / DR-0030)

- Operation: UPDATE:APPEND
- Re-opened decisions: spec-0003 DR-0003-0003（Codex サブエージェントは静的配置）、`_policies/08_Decisions.md` DR-0030（静的配置方式）
- Superseded by: DR-0003-0012（Codex サブエージェント TOML を init で自動生成する）
- Trigger: 「静的配置 + 手動管理」は配布物が `.codex/agents/` を含むことを前提にしていたが、`packages/qfai/assets/init/` に当該ツリーは存在しない。`qfai init` を実行したプロジェクトには Claude / Copilot の agent wrapper だけが届き、`--force` を付けても Codex は空のままだった
- adopted: `qfai init` が canonical agent markdown + `agent-catalog.yml#agents[].kind` から `.codex/agents/<name>.toml` を生成する。plain run は create-only、`--force` で再生成、roster を外れた生成物は `--force` で prune
- adopted: 本リポジトリの `.codex/agents/*.toml` も生成物として扱い、generator 出力との byte 一致をテストで固定する
- rejected: 配布 asset へ TOML を静的同梱する（canonical markdown との二重管理を配布物へ持ち込むだけで、drift の構造は変わらない）
- Cascade:
  - AC-0003-0037 を `03_Acceptance-Criteria.md` に登録（US-0003-0006 / REQ-0009 配下）
  - TC-0003-0055 を `06_Test-Cases.md` に登録、`tdd/test-list.md` に TDD-0057 を追加
  - 実装: `packages/qfai/src/core/codexAgentToml.ts`（新規）、`packages/qfai/src/cli/commands/init.ts` step 6
  - テスト: `packages/qfai/tests/integration/codexAgentWrappers.test.ts`
  - ドキュメント: `README.md` / `packages/qfai/README.md` の Codex 統合記述
- impact: 既存プロジェクトが `qfai init` を再実行すると `.codex/agents/` が新規作成される。手書きの Codex profile は生成マーカー行を持たないため prune 対象外

## CHG-007 (2026-08-05) — Shipped GitHub Actions Workflow Set

- Discussion pack: `.qfai/discussion/discussion-20260804173914356/`
- Approval: `_policies/10_delta.md#2026-08-05 — CHG-007` (ApprovedBy: user@2026-08-05)
- Governing policy decisions: DR-0275 (spec-0017 / CAP-0017 reservation revoked), DR-0276 (`toolchain` slice category; the shipped-versus-distributed boundary)
- Contracts: `.qfai/contracts/cli/shipped-workflows.md` (CLI-WFSET, **new — the authoritative source for these requirements**), `.qfai/contracts/cli/qfai-init.md` (CLI-INIT, updated with `## Shipped GitHub Actions workflows`)
- Operation: UPDATE:APPEND — no existing ID renumbered, no accepted sentence rewritten

### Requirement mapping (upstream pack REQ -> spec-local REQ)

The pack's `REQ-0014..0021` collide with spec-local `REQ-0014..0021`, which are already in use
(instructions activation guidance, Windows symlink fallback, the `.gitignore` managed block, the
CHG-003 assistant-tree work). Spec-local IDs therefore continue from the current maximum, and the
pack IDs stay in the `Source` column of the Triage table above — the same convention CHG-003 used.

| Upstream pack REQ | Spec-local REQ | Subject                                              |
| ----------------- | -------------- | ---------------------------------------------------- |
| REQ-0014          | REQ-0024       | Shipped workflow hardening                           |
| REQ-0015          | REQ-0025       | Shipped action-pin policy and trailer resolution     |
| REQ-0016          | REQ-0026       | Layer-separated credential-free shipped set          |
| REQ-0017          | REQ-0027       | Shipped change detection, fail-open, green-on-skip   |
| REQ-0018          | REQ-0028       | Shipped runner-label indirection with public default |
| REQ-0019          | REQ-0029       | Shipped Node-version and package-manager portability |
| REQ-0020          | REQ-0030       | Shipped-workflow ownership contract (shipped half)   |
| REQ-0021          | REQ-0031       | Shipped-set structural contract gate                 |

### Appended items

| Artifact                    | Appended range                      | Count |
| --------------------------- | ----------------------------------- | ----- |
| `01_Spec.md`                | REQ-0024..REQ-0031                  | 8     |
| `02_User-stories.md`        | US-0003-0021..US-0003-0028          | 8     |
| `03_Acceptance-Criteria.md` | AC-0003-0025..AC-0003-0036          | 12    |
| `04_Business-Rules.md`      | BR-0003-0021..BR-0003-0046          | 26    |
| `05_Examples.md`            | EX-0003-0024..EX-0003-0049          | 26    |
| `06_Test-Cases.md`          | TC-0003-0027..TC-0003-0054          | 28    |
| `07_Decisions.md`           | DR-0003-0008..DR-0003-0011          | 4     |
| `08_Open-questions.md`      | OQ-0003-0003                        | 1     |
| `tdd/test-list.md`          | TDD-0027..TDD-0054 (`Status: todo`) | 28    |

### Size signal and reasoned non-split

- Before: 24 AC, 26 TC. After: 36 AC, 54 TC. Thresholds in `_policies/11_Slice-Policy.md` step 2 are `acCount <= 30 && tcCount <= 50`, so **both are breached**.
- Per `sdd-triage.md`, a threshold breach is a **signal, not an operation**. The signal triggered a capability-ownership review, recorded here.
- Review outcome: `spec-0003` declares `Parent: CAP-0003` and owns exactly that one capability. `validateSpecSplitByCapability` enforces one capability per spec and raises `QFAI-SPLIT-102` / `QFAI-SPLIT-104` at `error`, so a count-driven SPLIT of a single-capability spec has **no legal end state**. The operation already selected therefore stands: APPEND stays APPEND.
- Independently, this file's `## Rejected` section already fixes `DO NOT: init コマンドの機能を複数スペックに分割しないこと` as a recurrence-prevention rule from the 2026-04-01 consolidation. A split here would reverse an accepted decision.
- Residual: both counts now sit above the ceiling (AC 36 vs 30, TC 54 vs 50), so the next append to this spec re-runs the capability-ownership review rather than assuming APPEND. The reasoned non-split does not expire — `CAP-0003` remains one capability — but the review is owed each time, and a genuine second capability appearing inside `qfai init` is the only thing that would make SPLIT legal.

### Boundary held (what this append deliberately does not absorb)

| Subject                                                                                         | Owner     | Why not here                                                                                       |
| ----------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------- |
| QFAI's own `.github/workflows/**`, root `scripts/**`, `packages/qfai/scripts/**`, runner config | spec-0017 | DR-0276: the boundary is **distributed-or-not**; none of these are in `package.json#files`         |
| Workflow-hygiene lint rule set                                                                  | spec-0017 | The rule set and the script are `toolchain`; this spec asserts only the shipped file's observables |
| `pnpm ci:lint` lane registry                                                                    | spec-0004 | spec-0004 owns the lane inventory; the lane's rules and its shipped target live elsewhere          |
| Adopter drift detection (`workflows.integrity`)                                                 | spec-0006 | Upstream REQ-0022's detection half; `qfai doctor` already has an advisory bucket                   |
| Worker-scoped credential-reuse guidance                                                         | spec-0008 | ATDD-layer prose, backend-agnostic                                                                 |
| Layer-to-CI-lane mapping document                                                               | spec-0009 | Cascade only; the layer vocabulary must not grow (NFR-0015)                                        |
| Reviewer-gate ingestion of the new finding codes                                                | spec-0015 | Established precedent: one spec emits, spec-0015 defines ingestion                                 |

### Contract citation posture

CLI-WFSET is cited, not restated. In particular the **values** of REQ-0031's declared expected
shape (which subcommand, which profile, which failure threshold) are SSOT in exactly one place —
the test suite. Neither this spec nor CLI-WFSET carries a second copy, because a second copy
reproduces the drift class `DTC-5` records: the repository's own copy of the shipped validate
workflow diverged from the shipped one precisely because two copies existed with no gate between
them. What CLI-WFSET fixes is the closed set of **dimensions** the shape must pin (§5), so a shape
that silently omits one is a contract violation rather than a judgement call.

### Blocking constraints encoded (measured, not assumed)

1. `packages/qfai/scripts/check-no-internal-version-leakage.sh` is comment-blind: `INTERNAL_VERSION_RE` is `\bv[0-9]+\.[0-9]+(\.[0-9]+)?\b|\bv1\.x\b`, grepped recursively over every path in `package.json#files`. A conventional `# v<X.Y.Z>` pin trailer in a shipped file therefore fails the build. Encoded as BR-0003-0025 / BR-0003-0027 and DR-0003-0008: the version moves into the step `name:` spelled without the leading letter, and no pragma, allow-list entry or pattern narrowing is introduced.
2. `scripts/verify-pack.mjs#allowedRootGithubEntries` permits only `workflows` under the shipped `.github/` and throws on any other immediate child. A shipped `actions/` directory is a hard pack failure, so composite-action templates cannot ship. Recorded as out of scope in `01_Spec.md` and DR-0003-0009, with the asset-test / pack-verifier asymmetry (DTC-15) noted so "fix the test" is not mistaken for a path.
3. `packages/qfai/src/cli/commands/init.ts` copies root assets with `force: false` and `conflictPolicy: "skip"` hard-coded, so `qfai init --force` never refreshes an already-installed workflow. REQ-0030 specifies the ownership contract only; the unconditional-overwrite refresh verb is deferred on upstream `OQ-0021` (mirrored as OQ-0003-0003). Encoded as DR-0003-0010.

### Phase 0 alignment (contract-driven additions)

Two obligations were added after CLI-WFSET landed, because the contract made them separately
observable:

- **AC-0003-0036 / BR-0003-0045 / EX-0003-0048 / TC-0003-0051 — `declined`-name pre-copy exclusion.** Create-only behaviour alone does not satisfy "a declined file is never recreated": the file is absent, so create-only writes it. A test asserting only create-only would pass while init recreates a file the adopter deliberately deleted. TC-0003-0051 therefore observes the copy set itself and carries a control run with create-only disabled, which is what falsifies the weaker reading.
- **BR-0003-0046 / EX-0003-0049 / TC-0003-0052 — `pruneMatchingEntries` must become exported.** REQ-0030's "the refresh path contains no copy or removal call of its own" is structurally unsatisfiable while that helper is module-private, because the only alternative is re-implementing it. The named hazard is recorded in BR-0003-0039: `init.ts#pruneStaleQfaiWrappers` uses `entry.name.startsWith("qfai-")` at all three call sites, and passing that predicate to `pruneMatchingEntries` for the workflows directory is forbidden by CLI-WFSET §1.

### Cascade (companion rows live in the named spec's own delta)

- spec-0012: its delta records the shipped workflow's current shape (Node pin, lockfile-detection description); hardening makes that stale — UPDATE:MODIFY there
- spec-0004: the `pnpm ci:lint` lane registry gains the workflow-hygiene lane and the shipped-shape gate — UPDATE:MODIFY there
- spec-0006: `workflows.integrity` advisory finding, consuming CLI-WFSET §3's state enum — UPDATE:APPEND there
- spec-0015: reviewer-gate ingestion of `R-SHIPPED-WORKFLOW-SHAPE-DRIFT` and `R-WORKFLOW-HYGIENE-DRIFT` — UPDATE:APPEND there
- spec-0017: the own-CI surface, the hygiene rule set, the pre-build shipped-YAML version rule, and the retirement of the repository's duplicate — CREATE there

### Schema conformance (additive columns)

- `06_Test-Cases.md` gained a `Type` column (`normal` / `error` / `boundary` / `edge`) and `04_Business-Rules.md` gained a `Contract-Refs` column. Both are required by `sdd-quality-gate.md` and `spec-traceability-rules.md` respectively and were absent from this spec.
- The addition is purely additive: no ID was renumbered and no existing `Title` or `Rule` text was rewritten. Only the new cells were filled on pre-existing rows.
- A second table was not an option: `collectTestCaseIds` and the TDD coverage report both read `parseFirstMarkdownTable`, so splitting the new TC rows into a second table would find no `TC-ID` column there and silently disable `TDDLIST_TC_NOT_COVERED` for the whole spec.
- Pre-existing `Contract-Refs` values: BR-0003-0001..0014 are `-`; BR-0003-0015..0020 are `CLI-INIT`, which the Contract Index row for CLI-INIT names explicitly as the CHG-003 surface (assistant-tree seed, `--upgrade-assistant-tree`, work-log surface seed, deprecation window, path SSOT enforcement).

## Change Requests

| CR ID            | Upstream artifact                                                                                                                       | Mode      | Approved by                                                    | Applied at           |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------- | -------------------- |
| CR-20260923-0003 | `spec-0003/04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`                                              | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T03:05:00Z |
| CR-20260923-0006 | `spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `04_Business-Rules.md`, `05_Examples.md`, `06_Test-Cases.md` | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T08:13:56Z |
| CR-20260923-0007 | `spec-0003/06_Test-Cases.md`, `tdd/test-list.md`                                                                                        | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T08:26:35Z |
| CR-20260923-0011 | `spec-0003/01_Spec.md`, `02_User-stories.md`, `03_Acceptance-Criteria.md`, `05_Examples.md`, `06_Test-Cases.md`, `tdd/test-list.md`     | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T11:15:07Z |
| CR-20260923-0013 | `spec-0003/tdd/test-list.md`                                                                                                            | re-derive | claude-code (the user's standing instruction for this session) | 2026-09-23T11:52:00Z |

## Triage (2026-09-15)

Source: the user's explicit instruction to parallelize independent work in both QFAI's own CI and its distributed workflows. These rows cover only the distributed workflows owned by CAP-0003.

| Source           | Subject                                                                                          | Existing Spec | Operation | Sub-op | Approved By | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------- | --------- | ------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| User instruction | Preserve validation coverage across independent profile jobs                                     | spec-0003     | UPDATE    | MODIFY | -           | Update REQ-0031, US-0003-0028, AC-0003-0035 and BR-0003-0043, and amend section 5 of `.qfai/contracts/cli/shipped-workflows.md` in the same change, since the spec cites that section rather than restating it. Replace the same-lane ordering requirement with the invocation set each lane carries, and widen the lane dimension to cover an aggregate lane. Preserve every subcommand, profile, failure threshold and trigger; no validation obligation is added or dropped. EX-0003-0046 and TC-0003-0049 retain their negative coverage.                                                                                                 |
| User instruction | Account for dependency installs after matrix expansion                                           | spec-0003     | UPDATE    | MODIFY | -           | Update NFR-C0016, AC-0003-0030, BR-0003-0031, EX-0003-0034 and TC-0003-0037. The one-install statement is stale because document checks and validation already install dependencies. Count executing job instances by event, including matrix expansion, and record the scheduling cost. Preserve zero secret references, zero unopted test lanes and install-free detection and aggregate jobs. Keep the existing TC and ledger IDs.                                                                                                                                                                                                         |
| User instruction | Require independent document checks and validation profiles to complete before aggregate success | spec-0003     | UPDATE    | APPEND | -           | Add narrowly scoped acceptance, rule, example and test coverage within the existing shipped-workflow capability, and extend the US-0003-0023 note that AC-0003-0038 hangs from. Independent checks are declared as legs of one job; aggregate success requires every required result to succeed. Failure, cancellation and unexpected skipping cannot produce aggregate success. Preserve create-only installation, declined files, existing check coverage and the prohibition on cross-file workflow references. CAP-0003 remains the sole capability: the existing AC/TC count threshold breach warrants review, not a count-driven SPLIT. |

The capability-ownership review keeps all three rows in spec-0003. The existing size signal does not identify a second capability. The own-CI implementation and hygiene lane remain owned by spec-0017; this scheduling change alters none of that spec's obligations and needs no companion edit there. The derived byte pins under `.github/` move with `scripts/dogfood-backlog.json` whenever its contents change, and carry no obligation of their own. No workflow refresh, overwrite, version change or publishing operation is introduced.
