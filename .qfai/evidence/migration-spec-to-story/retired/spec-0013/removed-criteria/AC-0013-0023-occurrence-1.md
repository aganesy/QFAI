## AC-0013-0023: `D-SURFACE-TYPE-MISSING` warns on companion-without-frontmatter

- US-Refs: US-0013-0013
- Given a spec with a `.qfai/contracts/ui/<spec>-*.yaml` companion but no `surface_type: ui-bearing` frontmatter,
- When `qfai sdd lint` (or equivalent) runs,
- Then it emits `D-SURFACE-TYPE-MISSING` at severity warning during the deprecation window (sunsets to error at window close); specs without a UI companion emit no finding.

