# Review: Runtime Gatekeeper

## Reviewer

- ID: runtime-gatekeeper
- Role: Runtime Gatekeeper

## Checklist

- [x] Verify operational readiness and runtime risk controls.
- [x] Verify mitigation and rollback assumptions.
- [x] Verify fallback and degradation paths.

## Findings

1. **Operational Readiness**: The spec defines clear operational safeguards:
   - `/qfai-verify` always performs full scan regardless of SDP (DR-0007, AC-0011-0016) - the quality gate is never weakened
   - `--full` flag provides user-controlled override to bypass incremental mode (AC-0011-0014)
   - Evidence absence triggers automatic full scan fallback (BR-0011-0007, NFR-0003)
   - Policy changes conservatively trigger all-spec evaluation with user confirmation (BR-0011-0018, DR-0011)

2. **Runtime Risk Controls**:
   - NFR-0001 (zero missed changes): 3-source union means any single source detecting a change is sufficient. The bias is toward over-detection (false positives), not under-detection (false negatives).
   - NFR-0003 (git unavailable fallback): Source A failure is a warning, not an error. Processing continues with Source B (timestamp comparison).
   - NFR-0004 (backward compatibility): Old evidence without Diff Context triggers full scan, not failure.
   - DR-0010 (stale heuristic): Only Behavior/Initial primary specs are stale-eligible, preventing over-regeneration from structural changes.

3. **Fallback and Degradation Paths**: Multiple layers of graceful degradation:
   - Git unavailable -> skip Source A, use Source B only (BR-0011-0023)
   - Invalid last_commit_sha -> Source A error caught, fall through to Source B (EX-0011-0028)
   - Missing evidence -> full scan (BR-0011-0007)
   - Missing Diff Context in evidence -> full scan (BR-0011-0024)
   - User override -> --full flag forces full scan (BR-0011-0017)
     All degradation paths converge to full scan, which is the known-safe behavior.

4. **Rollback Plan**: 10_Plan defines 4-point rollback:
   - Git revert (SKILL.md only, zero build risk)
   - Granular per-SKILL.md rollback
   - --full flag as runtime escape hatch (no code change needed)
   - Evidence cleanup triggers auto-fallback
     All rollback paths are low-risk and do not require coordinated deployment.

5. **No Runtime Infrastructure Impact**: SDP modifies only SKILL.md prompt files (DR-0008). No CI/CD changes, no monitoring changes, no deployment infrastructure changes. The operational footprint is limited to evidence file content (additive Diff Context section).

No issues found.

## Verdict

PASS

## Rationale

Runtime risk controls are comprehensive with multiple fallback layers all converging to full scan (known-safe behavior). The quality gate (/qfai-verify) is explicitly protected from incremental weakening. Degradation paths handle git unavailability, invalid state, missing evidence, and old evidence format. The rollback plan is straightforward for SKILL.md-only changes with the --full flag providing immediate runtime escape.
