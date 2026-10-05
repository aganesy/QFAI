# US-0001-0047: Profile-specific validation reports

## User Story

As a release operator running `qfai validate` across multiple profiles in sequence, I want each run to write to a profile-suffixed output path (`.qfai/report/validate-<profile>.json`) alongside an always-latest `validate.json` that names its `profile`, and I want the legacy `.qfai/output/validate.json` path to keep working with a `D-DEPRECATED-PATH` warning until sunset, so that profile outputs cannot silently overwrite each other and a downstream reader reads the intended profile.
