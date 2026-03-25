# R10 Runtime Gatekeeper

## Verdict: PASS

### N/A Justification (if N/A)

N/A — verdict is PASS. While this feature has no runtime service to manage (no deployment, no server, no process), there are runtime risk and operational readiness aspects worth evaluating in the context of Codex agent behavior and rollback strategy.

## Checklist

- [x] Verify operational readiness and runtime risk controls.
- [x] Verify mitigation and rollback assumptions.

## Findings

### Operational Readiness

**Nature of the change:** This feature delivers 40 static files (39 agent TOML + 1 config.toml) committed to the repository. There is no runtime service, no deployment pipeline, no process to start/stop, and no infrastructure to provision. The files are consumed by the Codex CLI runtime on developers' local machines at agent invocation time.

**Operational readiness is addressed through:**

1. **Pre-merge validation (POL-T1):** All TOML files must pass syntax validation before merge. This prevents broken configuration from reaching the repository.
2. **Agent count verification (POL-T2):** File count check ensures no agents are missing or duplicated.
3. **Repository-level version control (POL-D1):** Files are committed to the repository, providing full change history, diff capability, and the ability to revert any change.
4. **Development workflow compliance (POL-D2):** Changes follow the standard branch → PR → review → merge flow, ensuring human review before any configuration reaches `main`.

**sandbox_mode as a runtime risk control:**

- 25 review/analysis agents are restricted to `read-only` sandbox mode (POL-S1). This is the primary runtime risk control — it prevents review agents from accidentally modifying the codebase during Codex sessions.
- 14 implementation agents inherit parent session permissions (POL-S2), which is appropriate for agents that need write access.
- The classification is documented in `05_Scope.md` with a complete enumeration of all 39 agents. The cross-reference source is `review-roster.yml` (SRC-0008).

### Mitigation and Rollback

**Rollback strategy:** Since all deliverables are static files committed to the repository:

- **Immediate rollback:** `git revert` of the merge commit removes all 40 files.
- **Selective rollback:** Individual agent TOML files can be edited or removed independently.
- **No service restart required:** Codex re-reads TOML files at each agent invocation (per US-001 example seed: "Agent TOML is re-read on each invocation — no stale state between invocations"). This means file changes take effect immediately without requiring a session restart.

**Risk mitigations from the Inception Deck:**

| Risk                            | Mitigation                             | Assessment                                                                        |
| ------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------- |
| TOML drift from canonical MD    | Update checklist + future codegen      | Adequate for v1.6.4. OC-1 and OC-2 acknowledge the manual sync burden explicitly. |
| Codex sub-agent API changes     | Pin to current spec; monitor changelog | Reasonable. API instability risk is external and low-probability.                 |
| sandbox_mode misclassification  | Cross-reference with review-roster.yml | Strong. The enumerated list in 05_Scope.md provides a verifiable checklist.       |
| TOML multi-line string escaping | Validate all 39 files with TOML parser | Adequate. Parser validation catches escaping issues at build time.                |

**Blast radius is limited:**

- Files are scoped to `.codex/` directory — no impact on existing Claude Code or Copilot agent definitions.
- No changes to `init.ts`, `AGENTS.md`, or any executable code.
- A broken TOML file affects only the specific Codex agent, not the entire system.

### Observations

1. **No runtime monitoring needed:** Since these are static config files, there are no runtime metrics, health checks, or alerting requirements. This is appropriate.
2. **config.toml error handling:** The story workshop (US-003) considers the case where `config.toml` has invalid syntax (Codex reports parse error) and where it's empty (falls back to platform defaults). These failure modes are handled by the Codex runtime, not by QFAI — the discussion correctly treats Codex as the consumer.
3. **Operational constraint OC-1** (manual sync) is the primary long-term operational concern. The discussion acknowledges this and defers automation (OQ-0007). The recurrence prevention in `99_delta.md` states: "Revisit in v1.7.x if sync automation is needed." This is a responsible deferral.

## Required Changes

None.

## Confidence

High — The feature's operational profile is straightforward: static configuration files with no runtime service. Risk controls are well-defined (sandbox_mode classification, TOML validation, agent count check). Rollback is trivial via git revert. The discussion pack correctly identifies the main long-term risk (manual sync drift) and explicitly defers the automation solution.
