# 08 Open Questions

## OQ-0010-v1716-01: DESIGN.md auto-customization quality (tdd)

- Context: Step 11.3 Phase B customizes the selected archetype's DESIGN.md template into `uiux/12_design_system.md` using the taste interview as input. The heuristic that determines how aggressively to override archetype defaults (e.g., custom color overrides vs archetype-preserved palette) is under-specified.
- Carry-forward source: discussion-20260418093755100 (OQ-0004)
- Resolution phase: TDD (will be pinned in spec-0010/tdd during `/qfai-implement` for Phase B customization)
- Impact if unresolved: Phase B may either (a) overwrite archetype defaults too aggressively, losing archetype identity, or (b) preserve defaults too conservatively, producing generic output. Either extreme degrades DS02 section content quality and PROT-DS01 downstream scoring.
- Decision point needed: canonical override rules (which interview fields dominate, conflict resolution when interview pulls away from archetype, minimum preserved archetype invariants) and evaluation rubric for "did customization preserve archetype identity."
