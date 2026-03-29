# 09 Constraints

## Technical Constraints

| ID   | Constraint | Rationale | Impact |
| ---- | ---------- | --------- | ------ |
| TC-1 | Must maintain backward compatibility with existing qfai.config.yaml schema | Existing projects depend on current config format | All workstreams must verify config compatibility |
| TC-2 | Internal module APIs (harness, critique, calibration) must remain stable | Other modules and potential external consumers depend on them | Workstream A/B changes must not break internal APIs |
| TC-3 | TypeScript strict mode must be maintained | Project rule from CLAUDE.md | All new code must pass strict type checking |
| TC-4 | Test coverage required for all source changes | Project rule from CLAUDE.md | Every fix must include corresponding tests |

## Operational Constraints

| ID   | Constraint | Rationale | Impact |
| ---- | ---------- | --------- | ------ |
| OC-1 | Phased delivery: Hotfix A → Correction B → Correction C | Preserve rollback boundaries and avoid mixing conceptual changes | Release planning must follow phase sequence |
| OC-2 | No runtime-heavy default in any phase | Core architectural decision from audit | All prototyping changes must verify default mode is static |
| OC-3 | Full-harness must never collapse into standard path | Explicit architectural boundary | Mode gating must be enforced at skill and CLI level |

## Legal / Compliance Constraints

| ID   | Constraint | Regulation / Standard | Impact |
| ---- | ---------- | --------------------- | ------ |
| LC-1 | No applicable legal constraints identified | N/A | None |

## Budget Constraints

- Budget range: Not applicable (open-source project maintenance)
- Cost drivers: Developer time only

## Timeline Constraints

- Hard deadlines: None specified
- Milestones: Hotfix A (P0 fixes first), Correction B (P1 fixes), Correction C (P2 fixes)
