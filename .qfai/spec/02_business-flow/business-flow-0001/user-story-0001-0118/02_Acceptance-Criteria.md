# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0118-01
# Parent: US-0001-0118
Scenario: AC-0001-0118-01
  Given a story-tree project contains non-UI work and a UI contract file without a `CON-UI-NNNN` ID or a `screens[]` entry
  When prototyping scope is resolved
  Then the file is excluded from the UI-bearing contract set and no spec-level marker is read
  And missing screen contracts do not trigger UI-only requirements for the non-UI work

# AC-0001-0118-02
# Parent: US-0001-0118
Scenario: Multi-spec resolver covers every UI-bearing spec per invocation (case 1)
  Given a consumer project with N UI-bearing specs (N ≥ 1; each spec EITHER (a) carries `surface_type: ui-bearing` in its `01_Spec.md` frontmatter OR (b) ships a matching `.qfai/contracts/ui/<spec-id>.yaml` contract (also accepted: any of the documented 5 candidate layouts in `.qfai/contracts/ui/README.md` — including the per-spec subdirectory layout `<contractsDir>/ui/spec-<id>/<sub>.yaml`, candidate #5, treated as UI-bearing when the subdir contains at least one `*.yaml` file; `*.yml` single-l is excluded for parity with the top-level convention) — the two signals are OR-ed; legacy `01_Context.md ui_bearing: true` is superseded by these per CHG-002),
  When `/qfai-prototyping` is invoked exactly once,
  Then `resolveAllUiBearingSpecs()` returns every UI-bearing spec ID, the previous primary-spec selection prompt is not emitted, and cycle-0 evidence records the resolved spec set verbatim.

Scenario: Multi-spec resolver covers every UI-bearing spec per invocation (case 2)
  Given a consumer project with zero UI-bearing specs **at cycle 0** (no in-progress `prototyping.json#frozenSurfaceUnion` recorded yet),
  When `/qfai-prototyping` is invoked at cycle 0,
  Then the run exits 0 deterministically as a no-op (not an error).
  And the legacy `01_Context.md ui_bearing: false` exclusion guidance (AC-0001-0118-01) is retained as a non-detection-source convenience marker; the new detection signal set above is the SSOT.
  And at cycle ≥ 1 the zero-UI-bearing live result is a hard-stop drift class (see AC-0001-0122-02 class (d) for the "UI markers removed mid-loop" path and class (e) for the "missing cycle-0 seed" path), NOT a no-op. The no-op semantic is intentionally scoped to cycle 0 only.
  And On the story tree the resolved unit is the UI contract: a file under `<paths.contractsDir>/ui/` is UI-bearing when it declares a `CON-UI-NNNN` ID and at least one `screens[]` entry, and nothing read from `01_Spec.md` or from a contract file named after a spec counts. The resolver returns every UI-bearing `CON-UI-NNNN` ID, cycle-0 evidence records them in `uiContractsCovered[]`, and zero UI-bearing UI contracts at cycle 0 is the same no-op.
```
