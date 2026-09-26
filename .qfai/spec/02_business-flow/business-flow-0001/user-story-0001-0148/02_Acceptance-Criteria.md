# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0148-01
# Parent: US-0001-0148
Scenario: DESIGN.md patch-zone in-zone edit preserves evidence (DR-0262)
  Given DESIGN.md with a front-matter `patch_zone:` block declaring editable line ranges / token names,
  When an edit whose diff is fully contained in the patch zone is made,
  Then only a new `patchHash` field MUST be updated; `frozenDesignMdHash#majorHash` MUST remain stable and prototyping evidence MUST remain valid.

# AC-0001-0148-02
# Parent: US-0001-0148
Scenario: DESIGN.md out-of-zone edit invalidates evidence (DR-0262)
  Given DESIGN.md with a front-matter `patch_zone:` block,
  When an edit touches any line / token outside the zone (or removes the `patch_zone:` block itself),
  Then evidence MUST be invalidated as today AND Reviewer Gate MUST emit `R-DESIGN-MD-PATCH-OUT-OF-ZONE` (severity warning).
```
