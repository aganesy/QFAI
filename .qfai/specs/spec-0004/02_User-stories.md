# 02 User Stories

### US-0004-0001

As a maintainer, I want `qfai validate` to remain the deterministic machine gate, so that schema and evidence integrity can be checked without human judgment.

### US-0004-0016

As a prototyping maintainer, I want declared screen evidence gaps to fail validation, so that missing screenshot or HTML artifacts never pass silently.

### US-0004-0020

As a CI operator, I want canonical validators only in the production validate path, so that removed compatibility surfaces do not reappear.

### US-0004-0027

As a maintainer, I want validate to enforce current `/qfai-prototyping` skill contracts and UI evidence paths, so that skill-first prototyping stays mechanically auditable.

### US-0004-0028

As a release manager validating a v1.9.0 project, I want `qfai validate` to enforce that `.qfai/assistant/` only contains the 4 canonical layers (`constitution/`, `manifest/`, `catalog/`, `process/`), so that drift back to the legacy single-layer `steering/` is mechanically caught (REQ-0023).

### US-0004-0029

As an AI agent reading/writing work-log entries under `.qfai/steering/`, I want `qfai validate` to verify the YAML frontmatter schema and check that `links: [...]` resolve to real specs/discussions/entries, so that broken-link rot and ad-hoc schema drift are caught at gate time (REQ-0024, REQ-0028).

### US-0004-0030

As a Reviewer-Gate consumer, I want `qfai validate` to require non-empty `justification:` on every `R-WORKLOG-DRIFT` / `R-REJECTED-READOPT` finding and to flag `kind: handoff` entries missing any of the 5 required body sections via `R-HANDOFF-INCOMPLETE`, so that reviewer findings are auditable and handoffs are operationally complete (REQ-0025, REQ-0031).

### US-0004-0031

As an engineer closing decision loops, I want `qfai validate` to surface `W-PENDING-PROMOTION` until a work-log decision is fully promoted (`07_Decisions.md` row + archive + `promoted-to` back-ref) AND to surface `W-WORKLOG-STALE` for `status: active` entries with `updated` older than 90 days, so that stale or unfinished decisions don't silently linger (REQ-0026, REQ-0027).

### US-0004-0032

As a v1.9.0 migration adopter, I want `qfai validate` to emit `D-DEPRECATED-PATH` (with the sunset minor version named in-text) when legacy `.qfai/assistant/steering/` is detected AND to enforce that every `qfai-*` SKILL.md declares a `project_memory:` YAML block, so that read paths are explicit and the deprecation timeline is unambiguous (REQ-0029, REQ-0030).

### US-0004-0033

As a SKILL.md author and `qfai init --upgrade-assistant-tree` user, I want `qfai validate` to surface `W-SKILL-DOC-BROKEN-REF` for SKILL.md references that don't resolve in the new layout AND to recognize the `W-USER-EDIT-PRESERVED` informational note from the migration helper as a pass-through note (not an error), so that documentation drift is caught while migration progress is non-blocking (REQ-0032, REQ-0033).
