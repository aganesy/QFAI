# UIX-REV: Migration Review

Review migration status of UI-bearing specs.

## Sidecar Presence

- UI-bearing specs must have uiux/ directory
- Default: warning; strict mode: error

## Version Check

- .sidecar-version must match current template version
- Stale versions emit warning with upgrade steps

## Configuration

- uiux.migration.strict: boolean (default false)
