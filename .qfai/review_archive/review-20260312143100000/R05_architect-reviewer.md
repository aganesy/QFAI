# R05_architect-reviewer

## Verdict: PASS

## Checklist

- [x] Architecture constraints are documented (TC-01 through TC-04 in 09_Constraints.md)
- [x] Technical consistency: symlink direction is correct (integration dirs -> canonical SSOT)
- [x] Decision trade-offs are documented for all 5 OQs with options, recommendations, and rejected alternatives
- [x] Rejected-option rationale is recorded in 99_delta.md with recurrence prevention measures
- [x] SSOT principle is preserved: `.qfai/assistant/skills/` and `.qfai/assistant/agents/` remain the single source of truth
- [x] Scope boundaries are consistent across 02_Inception-Deck (NOT list), 05_Scope, and 06_REQ
- [x] Mermaid architecture diagram in 02_Inception-Deck correctly shows all 6 symlink target directories
- [x] Mermaid user flow diagram in 03_Story-Workshop correctly captures the init flow including git config, force branching, and error handling
- [x] Directory symlinks (skills) vs file symlinks (agents) distinction is architecturally justified and documented
- [x] Git mode 120000 tracking is identified as the mechanism for symlink persistence (NFR-0003)
- [x] Non-QFAI skills (pr-fix, pr-merge) are explicitly scoped out (OQ-0003)
- [x] Backward compatibility via `--force` migration path is documented (OC-01, NFR-0005)

## Findings

### F-R05-01: Assumption A3 (AI tools resolve symlinks transparently) is critical and unvalidated (Severity: Medium)

Assumption 3 in 05_Scope states "each AI tool (Claude Code, Codex, GitHub Copilot, Claude Agent SDK) resolves symlinks transparently to read file content." This is a load-bearing assumption for the entire architecture. If any tool treats symlinks as opaque or refuses to follow them, the skill/agent integration for that tool will silently break. The risk table in 02_Inception-Deck acknowledges this (low probability, high impact) with mitigation "verify in SDD/TDD," but it is listed as an assumption rather than a validation requirement.

**Recommendation:** Promote this from an assumption to a gated validation requirement. Before the SDD phase produces implementation details, document evidence (tool documentation, empirical test) that at least Claude Code and GitHub Copilot resolve directory symlinks and file symlinks respectively. If evidence cannot be obtained pre-SDD, add this as an explicit spike task.

### F-R05-02: `.claude/skills/` as a skill registration path is architecturally new (Severity: Low)

The current init.ts does not generate entries for `.claude/skills/`. The discussion introduces this as a replacement for `.claude/commands/` based on the assumption (A1) that Claude Code recognizes `.claude/skills/<name>/SKILL.md` as a skill. This is an architectural change to how QFAI integrates with Claude Code. The discussion correctly identifies this but could be more explicit about the fallback if A1 proves false.

**Recommendation:** In the SDD, document the validation approach for Assumption A1. If `.claude/skills/` is not recognized, the fallback would need to retain `.claude/commands/` -- which contradicts REQ-0001. Consider whether REQ-0001 (commands deletion) should be conditional on A1 validation.

### F-R05-03: Symlink depth consistency across integration directories (Severity: Low)

The architecture creates symlinks at various directory depths:

- `.claude/skills/qfai-*` -> depth 2 from repo root
- `.agents/skills/qfai-*` -> depth 2 from repo root
- `.codex/skills/qfai-*` -> depth 2 from repo root
- `.github/skills/qfai-*` -> depth 2 from repo root
- `.claude/agents/<name>.md` -> depth 2 from repo root
- `.github/agents/<name>.agent.md` -> depth 2 from repo root

All symlinks are at the same depth (2 levels), which simplifies the relative path computation. This uniformity is good but should be documented as an architectural invariant so future directory additions maintain the pattern.

**Recommendation:** Document this depth-2 invariant in the SDD constraints section.

### F-R05-04: OQ-0004 resolution consistency with REQ-0009 wording (Severity: Info)

OQ-0004 resolves to Option C: "error display + do not continue processing." REQ-0009 says "display clear error message... and do not continue processing." These are consistent. However, REQ-0009 title says "Windows symlink fallback" which is misleading since the decision is explicitly NOT to fall back. Consider renaming REQ-0009 to "Windows symlink failure handling" for clarity.

**Recommendation:** Minor wording fix -- rename REQ-0009 title from "Windows symlink fallback" to "Windows symlink failure handling" to match the resolved disposition.

## Notes

- The architecture is clean and well-motivated. Moving from generated wrapper files to symlinks is a sound simplification that eliminates an entire category of drift bugs.
- The trade-off analysis is thorough: 5 OQs all resolved at discussion phase with no deferrals. This is a strong signal that the design space was well-explored.
- The Mermaid diagrams accurately reflect the architecture and user flow. The flowchart in 02_Inception-Deck correctly shows the unidirectional dependency from integration directories to canonical SSOT.
- The decision to use directory symlinks for skills (preserving the `SKILL.md` + supporting files structure) and file symlinks for agents (single `.md` files) is architecturally appropriate.
- No blocking findings. F-R05-01 (assumption validation) is the most important item to address in the SDD phase but does not block discussion completion.
