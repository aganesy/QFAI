# 07 Decisions

4 items.

## Decisions

### DR-0013-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: /qfai-sdd skill の全要件は SKILL.md テンプレートで定義済み。phase order, contract index, slice gate, reference direction, validate gate, mermaid, delta rejected guard 全て SKILL.md に構造として存在。one-shot GREEN で exception に確定する

### DR-0013-0002: Active discussion pointer reader — single helper over `state.json` (cites \_policies DR-0266)

- Decision: REQ-0155 reader side は \_policies **DR-0266** に従い、downstream `/qfai-sdd` skills が active discussion pack を `.qfai/state.json#discussion.currentId`（spec-0010 が writer の単一 SSOT）から single helper 経由で resolve する。filesystem mtime からの推論は禁止。missing/duplicate `currentId` は candidate dirs と `qfai discussion use <id>` を名指しした error で reject する。
- Context: REQ-0155 は spec-0010（writer）と spec-0013（reader）にまたがる。Source REQ は共通、file-local ID は spec ごと。
- Rationale: ephemeral session state を runtime-state surface（`state.json`）に集約し、19+ candidate dirs からの曖昧な推論を排除するため。

### DR-0013-0003: `primary_tasks` recommended count band 3..7 (cites \_policies DR-0267)

- Decision: REQ-0164 の band は \_policies **DR-0267** に従い **3..7** とし、`templates/contracts/ui-spec.yaml` comments と `references/ui-contract-guide.md` に文書化し、`QFAI-AUD-020` warning text が band を名指しする。
- Rationale: reporter projects の multi-screen SaaS surface で 5–6 primary task が常用される。2..5 / 1..3 は too strict。
- Rejected: ceiling を 5 に絞る / 1..3 minimal band — いずれも実 dashboard を過剰に flag する（DR-0267）。
  - DO NOT: recommended ceiling を 5 に固定しない。Temptation: tighter discipline。

### DR-0013-0004: `primary_tasks` structured shape `{id,label,acceptance}` all-required closed (cites \_policies DR-0268)

- Decision: REQ-0164 の structured shape は \_policies **DR-0268** に従い `{id, label, acceptance}` all-required・closed schema とし、`auditProfile.ts` は deprecation window 中 string-only と structured の双方を accept する。
- Rationale: `acceptance` field が task を testable にし、downstream atdd scaffolding (REQ-0157) の TODO assertion の anchor になる。
- Rejected: minimal `{id, label}`（`acceptance` を落とす）/ open `{...}` with `additionalProperties: true`（`priority?`/`owner?` は speculative / YAGNI）。
  - DO NOT: schema を open にしない / `acceptance` を省かない。Temptation: smallest schema / future-proofing（DR-0268）。
