# 07 Decisions

## Decisions

3 items.

### DR-0007-0001: RFC 2119 キーワードベース検出

- Status: Superseded by DR-0007-0003 at the P7 story-tree cutover.
- ガードレール検出は RFC 2119 キーワード（MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY）を大文字小文字区別なしで検索して行う
- Why: H2 見出し限定では検出漏れリスクがあるため、キーワードベースの方が網羅的
- Source: 旧 spec-0005 DELTA-0002

### DR-0007-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0009 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: guardrails コマンドは tests/cli/guardrails.test.ts と tests/core/decisionGuardrails.test.ts で既に広範にカバー済み。one-shot GREEN で exception に確定する

### DR-0007-0003: Explicit decision-guardrail entries in policy and contracts

- Decision: On the story tree, `qfai guardrails` reads explicit `DG-NNNN` entries from policy and contract Markdown. It preserves each entry's ID, type, guardrail statement, rationale, and reconsideration condition. RFC 2119 words elsewhere do not create entries. This decision supersedes DR-0007-0001's automatic keyword detection and resolves OQ-0180.
- Context: The existing parser already recognizes `DG-NNNN` entries, while the previous spec rule described keyword detection from a retired spec-pack path. The user selected explicit entries for the P7 cutover.
- Rationale: An explicit decision has a stable identity and retains the reason and reopening condition needed by downstream work. A normative sentence alone does not carry that decision context.
