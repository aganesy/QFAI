# R11 Devil's Advocate (devils-advocate)

## Reviewer ID

R11

## Scope

Challenge assumptions, identify concrete improvements, and verify that pushback findings are acknowledged in the spec update for spec-0019..0022.

## Verdict

**PASS**

## Checklist

- [x] Core assumptions challenged (text-first, 3-reference minimum, 7 anti-pattern rules, 4-state mandate)
- [x] Each challenge either finds an existing mitigation or identifies a concrete improvement already documented
- [x] No circular reasoning in DR rationales (each DR justified against a concrete tension, not just "because we said so")
- [x] The 2x target for pattern doubling (R12) is not the only basis for PASS — quality of new items verified independently

## Findings

### Finding 1 — Challenge: "7 anti-patterns is arbitrary; real codebases will trigger false positives"

**Challenge accepted and partially sustained.** The selection of 7 anti-pattern rules in REQ-0018 lacks explicit justification for why these 7 and not others. However, examination of spec-0019/10_Plan.md Risk R-006 shows the false-positive risk is acknowledged, and the mitigation (`uiux_policy.anti_pattern_severity` config key allowing ERROR→WARNING downgrade) is specified. Furthermore, TC-0019-0023 verifies the downgrade behavior. The `excess_required_fields` and `button_variant_proliferation` rules use WARNING (not ERROR) severity, which reduces false-positive blocking impact. **Mitigation pre-existing; improvement documented in risk table. Finding does not block PASS.**

### Finding 2 — Challenge: "Competitive UI reference as text-only is insufficient; agents need visual examples"

**Challenge partially sustained; DR-0040 provides rationale.** A text description of a competitor UI (URL or prose) cannot convey the same design information as a screenshot. However, DR-0040 explicitly rejected mandatory screenshot storage on grounds of Figma-independence and SSOT purity (screenshots create version drift). The translation_policy field compensates by requiring explicit articulation of adaptation intent. The spec acknowledges this limitation: "Figma 非依存でテキストベースの参照記述を標準とする" (US-0019-0010 Notes). The trade-off is accepted and documented. **Concrete limitation acknowledged in spec; DR-0040 rationale sufficient. Finding does not block PASS.**

### Finding 3 — Challenge: "Research-to-Constraint conversion has no feedback loop; bad constraints will persist"

**Challenge noted; improvement identified as in-scope.** REQ-0013 defines a one-way flow (research*summary → contracts/design/*.yaml) without a mechanism to review or retire stale constraints. TC-0019-0017 tests that constraints without `source_research` field generate a traceability warning, which is a partial mitigation. However, there is no requirement for periodic constraint review or expiry. This is a legitimate concern for long-lived projects. \*\*Improvement recommendation: consider adding a constraint-age or review-cycle field to contracts/design/\_.yaml in v1.6.6. Current v1.6.5 scope is acceptable; PASS maintained.\*\*
