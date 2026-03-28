# 09 Constraints

## Technical Constraints

- TC-01: Core 15-file discussion pack structure must remain intact; sidecar is additive only.
- TC-02: Sidecar YAML schemas must be forward-compatible with future UIX-VAL-* validators (v1.7.4 scope).
- TC-03: `qfai init` must distribute all new assets without breaking existing init paths.
- TC-04: Template changes must not introduce dependencies on external runtime (no browser, no network).
- TC-05: Mermaid diagrams in templates must use only ` ```mermaid ` fences.

## Operational Constraints

- OC-01: Changes must be deployable via standard `npm publish` pipeline.
- OC-02: No additional infrastructure required (all artifacts are static files).
- OC-03: Rollback must be achievable per internal slice (sidecar, SKILL.md, direct templates, batch templates).

## Legal / Compliance Constraints

- LC-01: No third-party licensed content in templates or sidecar defaults.

## Budget / Resource Constraints

- BC-01: Implementation by single QFAI maintainer + AI assistant; no additional staffing.

## Deadline Constraints

- DC-01: Target release as v1.7.3; blocks v1.7.4 (validation/review stabilization).
