# 07 Decisions

2 items (IDs: DR-0008-0001, DR-0008-0003; DR-0008-0002 is reserved by the v1.7.15 backfill exception referenced in `tdd/test-list.md` for TDD-0011/0012).

## Decisions

### DR-0008-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0008 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: 対応する実装は既に production で稼働・テスト済み。TC-0008-0002..0005 は atddCodeTraceability.test.ts で既にカバー済み（QFAI-ATDD-111/112/113/121/122）。TC-0008-0001/0006/0007/0008 は ATDD SKILL.md で定義されたワークフロー要件であり、SKILL テンプレートの構造検証で正当性を確認する。TDD strict cycle を今から回すのは ceremonial。one-shot GREEN で実装の正当性を再確認し exception に確定する

### DR-0008-0003: scaffold placeholder escalate cycle count — references DR-0272 (v1.9.2 Second-Wave)

- Decision: `qfai atdd scaffold` skeleton の `// TODO: implement assertion for <TC-ID>` は `qfai validate` 中 `D-SCAFFOLD-PLACEHOLDER` (warning) を fire し、3 validate cycle 後に error へエスカレートする。既定 3、`qfai.config.yaml#atdd.scaffoldEscalateCycles` で設定可能。scaffold は idempotent (non-TODO content を上書きしない)。
- Basis: 上位 DR-0272 (`_policies/08_Decisions.md`)。本 spec slice は同 DR を copy-down して REQ-0157 / US-0008-0007 を実装する (REQ-0157 が "default deferred to /qfai-sdd" としていた escalate-count を resolve)。ID は DR-0008-0002 が既存の backfill 決定 (TDD-0011/0012) で先取り済みのため、次番 DR-0008-0003 を割り当てる。
- Why: 3 cycle は通常の red→green TDD turnaround を許しつつ placeholder の無期限蓄積を防ぐ。
