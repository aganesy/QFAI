# 07 Decisions

1 items.

### DR-0013-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: /qfai-sdd skill の全要件は SKILL.md テンプレートで定義済み。phase order, contract index, slice gate, reference direction, validate gate, mermaid, delta rejected guard 全て SKILL.md に構造として存在。one-shot GREEN で exception に確定する
