# 08 Open Questions

## Open Questions

### OQ-0005: CSS value auto-extraction precision (tdd)

- Context: PROT-DS01 requires `prototyping.json.scoringTrace.designSystemCompliance` to be a numeric score representing how well implemented CSS values match the finalized design system spec in `.qfai/contracts/design/design-system.yaml`. The algorithm that extracts actual CSS values (from DOM / compiled bundle / computed styles) and compares them to spec values (hex colors, spacing tokens, type scale) is under-specified.
- Carry-forward source: discussion-20260418093755100 (linked to REQ-0017 / REQ-0018)
- Resolution phase: TDD (will be pinned in spec-0014/tdd during /qfai-implement for PROT-DS01)
- Impact if unresolved: PROT-DS01 reports a score that is either over-strict (mismatches due to unit normalization such as `#FFF` vs `#FFFFFF`) or over-lenient (accepts any numeric value without verification). The BR allows any number in [0, 100]; the algorithm that produces that number is out of scope for this SDD step.
- Decision point needed: canonical normalization rules for color (hex case, short vs long form, rgb/rgba equivalence), spacing (px vs rem), typography (font-family exact match vs family-stack resolution), and the minimum sample size required to compute a representative percentage.

## Resolved (v1.9.2 second-wave, 2026-05-27)

- OQ-0167 (pack-location lint scope dimension) — RESOLVED by `_policies/08_Decisions.md` DR-0274 (staged/changed-dir scope against the three allowed roots). Applies to sibling REQ-0167 (spec-0004 territory); recorded here only as cross-pack context for the v1.9.2 wave. The register row OQ-0167 (`qfai sdd lint --fix` autofix for `surface_type`-absent specs) is a distinct question and remains deferred.
- REQ-0166 certify-side carries no deferred OQ for spec-0014: the scope-seal behavior (`scope: "saas-package"` + `notes:`, no full-DONE claim, `--upgrade-scope full` gating) is fully specified in this slice.
