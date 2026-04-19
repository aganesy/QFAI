# 07 Decisions

2 items.

### DR-0015-0001: TDD Ledger Backfill from Migrated Coverage (v1.7.15)

- Decision: TDD-0001..0010 のテストは既存実装 (v1.7.x) に対する backfill として Exception パターンで確定する
- Context: test-list.md は 06_Test-Cases.md から auto-generate された skeleton ledger で、Test file=TBD/Selector=migrated のまま放置されていた
- Rationale: agent delegation framework は agent-catalog.yml, agent-routing.yml, review-profiles.yml, review-gate.rules.yml, agentDefinition validator, reviewGate validator で実装済み。one-shot GREEN で exception に確定する

### DR-0015-0002: TC-0015-0011 / TC-0015-0012 Concrete Delegation Coverage (2026-04-19)

- Decision: TDD-0011 / TDD-0012 は Exception / placeholder 扱いから外し、shared delegation baseline と `qfai-implement` skill の canonical delegation contract を読む integration coverage に更新したうえで、fresh reviewer PASS と checkpoint pass が揃うまで `refactor` に据え置く
- Context: completion/review 差し戻しで、TC-0015-0011 の human-readable trace 不一致、TC-0015-0012 の stale evidence、completed items に必要な fresh reviewer PASS / checkpoint pass 欠落が指摘された
- Rationale: spec が要求するのは failed first delegation の hard-stop reporting と first real delegation capability probe contract であり、canonical files に対する直接検証へ差し替えることで、stage stop / no simulation-self-execution / remediation details / attempted role-task / retry condition / probe ordering を観測できる。一方、completion contract 上は独立 reviewer rerun と checkpoint が未取得のため `done` 主張はしない
