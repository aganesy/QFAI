# 07 Decisions

## Decisions

### DR-0001-0001: 旧 spec-0007/0009/0010 を spec-0001 に統合

- Date: 2026-04-01
- Context: 旧 spec-0007（Skill Orchestration）、spec-0009（Traceability & Spec Architecture）、spec-0010（Steering & Governance）はいずれもフレームワーク設計仕様であり、spec-pack 構造に密接に関連していた
- Options:
  1. 3 spec を独立に維持
  2. 3 spec を 1 つに統合（採用）
  3. 関連部分のみ抽出して新 spec を作成
- Adopted: 3 spec を spec-0001 に統合
- Why: spec-pack 構造定義、トレーサビリティ、Governance は相互参照が多く、1 つの spec として管理する方が整合性の維持が容易
- Rejected: 独立維持は参照コストが高い

### DR-0001-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0024 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: v1421 spec-pack 構造は specLayout.ts と specPack.ts validator で実装済み。specLayout は v1421/v1417 レイアウト検出、必須ファイルセット定義を含む。spec-0001 自体がフレームワーク設計仕様であり、構造的検証で正当性を確認。one-shot GREEN で exception に確定する

### DR-0001-0010: The stage-skill rules cover every skill a built-in plan names

- Status: accepted
- Date: 2026-09-24
- Context: triage settled which skills get `references/orchestrated-mode.md` as
  "every skill a plan dispatches", and listed six. The workflow file contract
  later required every skill a plan names to declare its operations in that file,
  and the `direct` plan names `qfai-maintain`. A typed list and the contract's
  list would then differ by one skill.
- Evidence: `.qfai/contracts/cli/workflow-files.schema.md` (CLI-WFFILE)
  `### Vocabulary` and `### The Operations table`; the triage decisions in
  `_policies/10_delta.md` under `## Triage (2026-09-24 intent-driven entry)`;
  `discussion-20260923171450572#REQ-0050` and `#REQ-0052`.
- Decision: BR-0001-0026 and BR-0001-0028 name their skill set as "every skill a
  built-in plan names", read from the skill column of CLI-WFFILE `### Vocabulary`.
  That set includes `qfai-maintain`, whose files are authored under spec-0018. The
  principle the triage recorded, every skill a plan dispatches, is kept.
- Rejected: the six-skill list as typed at triage
  - DO NOT: type the skill list into a business rule. Temptation: a literal list
    reads as more precise, and it goes stale the first time a plan names another
    skill.
- Consequences: a skill added to the vocabulary is covered without editing this
  spec. The literal set lives in the test case that checks it.
- Related: BR-0001-0026, BR-0001-0028; DL-0001 in `09_delta.md`.
