## AC-0013-0022: `/qfai-sdd` auto-populates `surface_type: ui-bearing`

- US-Refs: US-0013-0013
- Given a spec that has a `.qfai/contracts/ui/<spec>-*.yaml` companion,
- When `/qfai-sdd` runs,
- Then it sets `surface_type: ui-bearing` frontmatter on that spec; `resolveAllUiBearingSpecs()` continues to require the frontmatter as the strict ui-bearing signal (no downstream behavior change).

