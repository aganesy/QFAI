# US-0001-0148: Design patch zone and hash

## User Story

As a brand-SSOT maintainer, I want `DESIGN.md` to declare a front-matter `patch_zone:` block in which an edit updates only `patchHash` and leaves `frozenDesignMdHash#majorHash` and the prototyping evidence valid, while an edit outside the zone still invalidates the evidence with an `R-DESIGN-MD-PATCH-OUT-OF-ZONE` warning, so that small token tweaks do not force a full cycle-0 re-run.
