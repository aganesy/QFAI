# Discussion Artifact Rules

Use this file when `/qfai-discussion` creates or reviews `.qfai/discussion/discussion-*` packs.

## Required Pack

Each pack uses immutable timestamp naming: `.qfai/discussion/discussion-YYYYMMDDhhmmssSSS/`.

Required files:

- `01_Context.md`
- `02_Inception-Deck.md`
- `03_Story-Workshop.md`
- `04_Sources.md`
- `05_Scope.md`
- `06_REQ.md`
- `07_NFR.md`
- `08_Glossary.md`
- `09_Constraints.md`
- `10_Policy.md`
- `11_OQ-Register.md`
- `12_OQ-Resolution-Log.md`
- `13_Deferred.md`
- `14_Review-Request.md`
- `99_delta.md`

UI-bearing discussion packs may include `prototyping.yaml` as an optional recommendation artifact; non-ui discussion packs typically omit it. For `ui_bearing: false`, typically omit `prototyping.yaml`. Current discussion-pack readiness does not block on missing `prototyping.yaml`.

## Rules

- Run interview and requirement capture until `Disposition: open` is zero in `11_OQ-Register.md`.
- OQ `Gate` values are `discussion`, `sdd`, `atdd`, `tdd`, or `ops`.
- `deferred` is allowed only when `13_Deferred.md` has complete metadata.
- Discussion outputs are rationale and intake logs; do not duplicate `.qfai/specs/**` SSOT.
- `03_Story-Workshop.md` must include at least one Mermaid diagram.
- Use Mermaid fences only for diagrams.
- `14_Review-Request.md` must reference `.qfai/assistant/manifest/agent-routing.yml` and `review-profiles.yml`.

## UI/UX Exploration Family

For UI-bearing packs, use:

- `04_Sources.md` for trend translation and competitive reference registry
- `DESIGN.md` (root) — brand SSOT draft (front-matter + `# Brand Philosophy` body); `/qfai-sdd` Phase 0 freezes it into `.qfai/contracts/design/DESIGN.md.lock.yaml`
- `uiux/40_screen_contracts.md`

Discussion is exploration-first and must not choose a single visual winner or final design system. The brand decision is captured once in root `DESIGN.md`; downstream prototyping consumes the frozen tokens.

## `prototyping.yaml`

When `prototyping.yaml` is present, use the single-thread schema:

```yaml
prototyping:
  surface: web # web | mobile | desktop | mixed
```

Mode-tier fields (`recommended_mode` / `allowed_modes` / `mode_expectations`)
are not supported. The single-thread evolution loop owns its iteration
budget; see `.qfai/assistant/skills/qfai-prototyping/SKILL.md`.
