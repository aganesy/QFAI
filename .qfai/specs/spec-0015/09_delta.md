# 09 Delta (Migration Record)

## Origin

- Consolidates: old spec-0008 (Agent Delegation), spec-0012 (Review Agent Extension), spec-0016 (Dev Toolkit Hardening -- agent roster parts)
- Old spec-0008 defined agent catalog (39 agents), standard contracts, Orchestrator Protocol, Work Orders
- Old spec-0012 defined devils-advocate and pattern-doubler registration, behavioral principles, infinite loop prevention
- Old spec-0016 defined sub-agent roster formalization and handoff contracts (agent-specific parts)

## Adopted

- AD-0015-0001: Agent catalog -- 19 consolidated agents across planning/implementation/review/operations with routing-based invocation
- AD-0015-0002: Standard contract structure -- Mission, Inputs, Deliverables, Stop Conditions, Sign-off (from spec-0008)
- AD-0015-0003: Orchestrator Protocol -- delegation only, Capability Probe, Simulation Mode (from spec-0008)
- AD-0015-0004: Devils-advocate reviewer -- concrete alternative obligation, 3-FAIL demotion (from spec-0012)
- AD-0015-0005: Pattern-doubler reviewer -- rationale obligation, N/A default (from spec-0012)
- AD-0015-0006: All-reviewer FAIL obligation -- concrete alternative required from all reviewers (from spec-0012)

## Rejected

- RJ-0015-0001: AI implementation code in this spec
  - DO NOT include AI implementation code (TypeScript) in this spec
  - Temptation: implementing agent orchestration as code
  - Reason: this spec is framework design; agents are prompt-based definitions in `.qfai/assistant/agents/*.md`

- RJ-0015-0002: Modification of existing 10 reviewers
  - DO NOT change existing 10 reviewers' behavior, order, or logic
  - Temptation: "improving" existing reviewers alongside new additions
  - Reason: NFR-0003 requires existing reviewer stability

## ID Renumbering

| Old ID                               | New ID       | Notes                    |
| ------------------------------------ | ------------ | ------------------------ |
| spec-0008 US-0008-YYYY               | US-0015-YYYY | Agent Delegation         |
| spec-0012 US-0012-YYYY               | US-0015-YYYY | Review Agent Extension   |
| spec-0016 US-0016-YYYY (agent parts) | US-0015-YYYY | Dev Toolkit agent roster |

## Post-Migration Changes

| Date       | Change Type | IDs Affected       | Summary                                                                                                                                                                                                                             |
| ---------- | ----------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-04-01 | adopted     | —                  | test-design-analyst: Coverage Depth Matrix 出力義務・品質深度チェックリスト参照義務を追加。qa-gatekeeper: テストケース品質深度チェックセクション追加。                                                                              |
| 2026-04-08 | adopted     | REQ-0013, REQ-0014 | Full-Harness Review Profile 追加（review-profiles.yml）、Prototyping Evidence Phase Routing 追加（agent-routing.yml に product-experience-architect）。full-harness インシデントレポートに基づく独立評価パネル構成の routing 反映。 |
