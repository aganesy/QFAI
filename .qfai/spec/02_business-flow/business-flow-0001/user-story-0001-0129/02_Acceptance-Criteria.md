# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0129-01
# Parent: US-0001-0129
Scenario: `var()` unwrap across scanFonts / scanRadius / scanShadow
  Given a fixture with `:root { --font-sans: system-ui; }` and a declaration `font-family: var(--font-sans)` (analogous fixtures for `--radius-*` / `--shadow-*`),
  When `scanFonts` / `scanRadius` / `scanShadow` evaluate the declaration,
  Then the scanner MUST resolve via `unwrapVarReference(declarationValue, rootDeclarations)` before safety judgment and MUST emit zero `designMdViolations[]` entries for the unwrapped safe value.
```
