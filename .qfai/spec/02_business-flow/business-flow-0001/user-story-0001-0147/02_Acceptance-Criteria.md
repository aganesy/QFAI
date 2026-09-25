# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0147-01
# Parent: US-0001-0147
Scenario: Cycle-0 `--emit-skeletons` frozenSurfaceUnion coverage (DR-0261, DR-0273)
  Given `qfai prototyping iterate --cycle 0 --emit-skeletons` invoked over a `frozenSurfaceUnion` resolved from multiple specs,
  When cycle 0 runs,
  Then iterate MUST emit one placeholder HTML per `screens[].id` in `frozenSurfaceUnion`, consuming DESIGN.md tokens (color / font / radius / shadow) for default styling and making no per-screen LLM generation call (token-driven placeholder per DR-0261).
  And the default skeleton mode is `placeholder`; `--skeleton-mode full|placeholder|stub` (DR-0273) overrides it per-run with no config key added.
  And after convergence, every `frozenSurfaceUnion` screen MUST carry at least one `evidenceRefs[]` entry per kind (`screenshot` AND `html`) regardless of which spec it belongs to.
  And On the story tree `frozenSurfaceUnion` holds `CON-UI-NNNN` IDs, and the coverage holds regardless of which UI contract a screen belongs to.

# AC-0001-0147-02
# Parent: US-0001-0147
Scenario: `--emit-skeletons` opt-in default unchanged (DR-0261)
  Given `qfai prototyping iterate --cycle 0` invoked WITHOUT `--emit-skeletons`,
  When cycle 0 runs,
  Then behavior MUST match v1.9.1 bit-for-bit with no skeleton emission and no regression (opt-in posture during the deprecation window).
```
