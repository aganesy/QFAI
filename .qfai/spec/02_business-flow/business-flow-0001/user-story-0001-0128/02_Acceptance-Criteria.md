# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0128-01
# Parent: US-0001-0128
Scenario: Tailwind ↔ gate alignment (preflight allowlist + body-scope)
  Given an iter authored faithfully to the shipped `generator-prompt.md`,
  When `findDesignMdViolations(html, designMd)` runs with OQ-0103 = β (preflight literal allowlist) + γ (gate scope narrowed to `<body>`),
  Then `designMdViolations[]` MUST be empty for every preflight literal enumerated in the source pack §B-4 / §3 (Tailwind CDN preflight literals, internal `--tw-*` custom properties, alpha-modifier `rgba()`, standard utility shorthand names).
  And async fixture loading paths in the scanner unit tests MUST propagate read errors explicitly (no silent swallow).
```
