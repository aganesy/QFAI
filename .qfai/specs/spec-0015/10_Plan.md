# 10 Plan

## Implementation Strategy

1. Agent catalog: document 19 consolidated agents with standard contract structure in `.qfai/assistant/agents/*.md`
2. Orchestrator Protocol: define delegation rules, phase gates, and review handoff rules
3. Work Orders schema: define table format used across all skills
4. Review profiles: move devils-advocate and pattern-doubler into optional advisory modes
5. Agent routing: define mandatory, conditional, blocking, and parallel agents per skill phase
6. Skill integration: update all SKILL.md files to reference routing-driven delegation
7. RCP footer: update skill-specific footers for targeted rerun policy
8. Gate rules: update `review-gate.rules.yml` for routing-based reviewer gates

## Test Strategy

- Unit tests: agent contract structure validation, routing/profile integrity, gate rule parsing
- Integration tests: skill-agent integration, RCP footer consistency, Codex TOML parity
- Asset tests: required/forbidden phrase guardrails across docs, wrappers, and skill files

## Dependencies

- Requires: QFAI skill framework (SKILL.md structure)
- Consumed by: all QFAI skills reference this framework

## Risk

- Routing drift between SKILL.md and steering SSOT can break delegation
- Mitigation: central routing files become the only dispatch SSOT; tests validate Codex/init parity

## CHG-005 (2026-05-24) — qfai-prototyping defect remediation

- Implement REQ-0015-0013..0014 per AC-0015-0013..0014:
  1. Reviewer-Gate adds `R-CERTIFY-VERIFY-CIRCULAR` (severity error) structural check: if a future PR wires `certify` to read a validator output whose profile requires `/qfai-atdd` or `/qfai-implement` artifacts, the gate fires with a 3-part justification (offending certify code path, offending validator-output file/profile, option-B contract clause violated).
  2. Reviewer-Gate emits `R-PROMPT-SCANNER-DRIFT` with the 3-part justification SSOT shared with spec-0004's validate ingestion (one contract, two enforcers).
- Pair with spec-0004 wave: the validate-ingestion gate in spec-0004 is the rejector; this spec defines the emitter shape.

## CHG-006 (2026-05-27) — second-wave agent-collective + cross-skill governance

- Implement REQ-0158 / 0160 / 0161 / 0168 / 0171 / 0172 / 0173 per AC-0015-0015..0021:
  1. Add a `R-AUTOPILOT-POLICY-MISSING` Reviewer-Gate check that asserts every SKILL.md carries the `## Default Autopilot Policy` section with the three DR-0269 buckets (auto-decide / ask-user / hard-required); fail at severity error with a non-empty justification when the section is absent OR is present but missing one or more required buckets (heading-only / partial population — the `justification:` MUST name the missing bucket(s)).
  2. In the skill body, write an envelope-deviation decision record to `.qfai/evidence/decisions/<ISO8601-ts>.json` when an `AskUserQuestion` names one of the four DR-0270 contexts; keep the path tracked in version control by negating it in the managed `.gitignore` block (unlike the regenerable `.qfai/evidence/prototyping/`).
  3. Reference the canonical CLI-HANDOFF schema (`packages/qfai/src/core/schemas/handoff.ts`, doc `references/handoff.md`) from every handoff writer; add the `R-HANDOFF-SCHEMA-DRIFT` check covering non-conforming writes and asymmetric SSOT-sync Pair IV edits; accept legacy files with `D-HANDOFF-LEGACY-FORMAT` during the window.
  4. Register the eight-code catalog (BR-0015-0013) as membership only — the catalog declares no per-code severity column, each code keeping the severity its own detector emits (`R-DESIGN-MD-PATCH-OUT-OF-ZONE` stays warning per REQ-0151) — with a mandatory non-empty `justification:` on every entry; rely on the shared `qfai validate` advisory-failing ingestion, which rejects an empty / whitespace-only value at severity error for every one of the eight. Do not touch the OQ-0119-deferred prompt-augmentation timing.
  5. Wire `qfai audit log` (CLI-AUDIT) per DR-0271 filters + `--format table|json`; wire `qfai handoff upgrade` to emit a conforming handoff preserving originals under `legacy:`.
  6. Realign `references/*.md` + each SKILL.md in the same atomic PR as the OQ-0152..0157 implementation; rely on `qfai validate --report` for the zero-stale-reference obligation (warning in window, error at sunset).
- Cross-spec: the new finding-code catalog severity/justification SSOT and the doc-realignment rule are recorded in `_policies` (REQ-0168 / REQ-0173); spec-0015 owns the cross-skill governance surface. CLI surfaces (`qfai-audit.md`, `references/handoff.md`) and the handoff TS-module SSOT live under authoring zones (not distributed).
