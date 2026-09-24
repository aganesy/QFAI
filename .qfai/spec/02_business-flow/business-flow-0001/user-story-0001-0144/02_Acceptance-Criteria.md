# Acceptance Criteria

## Criteria

```gherkin
Feature:

# AC-0001-0144-01
# Parent: US-0001-0144
Scenario: `--license-patch` add-only path (SHOULD)
  Given `qfai prototyping iterate --license-patch <file>` invoked with an add-only diff,
  When the patch is applied,
  Then the new frozen catalog MUST be written AND an audit row MUST be appended to `prototyping.json#licensePatchAudit[]` carrying `{appliedAt, patchSha256, addedSources[]}`.
  And deletions or modifications MUST be rejected with the hint to use the cycle-0-restart path.
  And async patch I/O errors MUST be surfaced with explicit operator-facing diagnostic.
```
