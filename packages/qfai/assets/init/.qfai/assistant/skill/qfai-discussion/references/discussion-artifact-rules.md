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

Discussion packs with a visual prototyping surface (`web`, `mobile`, `desktop`, `mixed`) may include `prototyping.yaml` as an optional recommendation artifact; cli-only packs omit it, and non-ui discussion packs typically omit it. For `ui_bearing: false`, typically omit `prototyping.yaml`. Current discussion-pack readiness does not block on missing `prototyping.yaml`.

## Rules

- Run interview and requirement capture until `Disposition: open` is zero in `11_OQ-Register.md`.
- OQ `Gate` values are `discussion`, `sdd`, `atdd`, `tdd`, or `ops`.
- `deferred` is allowed only when `13_Deferred.md` has complete metadata.
- Discussion outputs are rationale and intake logs; do not duplicate the story tree under `<paths.specsDir>`.
- `03_Story-Workshop.md` must include at least one Mermaid diagram.
- Use Mermaid fences only for diagrams.
- `14_Review-Request.md` must reference `.qfai/assistant/rule/agent-selection.md` and the resolved review profile.

## UI/UX Exploration Family

For UI-bearing packs, use:

- `04_Sources.md` for trend translation and both reference registries
- `uiux/40_screen_contracts.md`

Discussion is exploration-first and must not choose a single visual winner or final design system. It records the design direction; `/qfai-sdd`'s `03_contract` step turns that record into root `DESIGN.md` and freezes it into `<paths.contractsDir>/design/DESIGN.md.lock.yaml`, and prototyping then iterates under the frozen tokens.

## `prototyping.yaml`

When `prototyping.yaml` is present, use the single-thread schema:

```yaml
prototyping:
  surface: web # web | mobile | desktop | mixed
```

Mode-tier fields (`recommended_mode` / `allowed_modes` / `mode_expectations`)
are not supported. The single-thread evolution loop owns its iteration
budget; see `.qfai/assistant/skill/qfai-prototyping/SKILL.md`.
