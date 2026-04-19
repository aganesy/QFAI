# 07 Decisions

## Decisions

1 item.

### DR-0007-0001: RFC 2119 キーワードベース検出

- ガードレール検出は RFC 2119 キーワード（MUST, MUST NOT, SHALL, SHALL NOT, SHOULD, SHOULD NOT, MAY）を大文字小文字区別なしで検索して行う
- Why: H2 見出し限定では検出漏れリスクがあるため、キーワードベースの方が網羅的
- Source: 旧 spec-0005 DELTA-0002

### DR-0007-0002: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0009 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: guardrails コマンドは tests/cli/guardrails.test.ts と tests/core/decisionGuardrails.test.ts で既に広範にカバー済み。one-shot GREEN で exception に確定する
