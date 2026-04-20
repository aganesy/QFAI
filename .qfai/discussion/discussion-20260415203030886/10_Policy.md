# 10 Policy

## Security Policy

| Policy | Rule |
|---|---|
| No external network calls during calibration resolution | `CalibrationLoader` must resolve pack files from the local filesystem only. No HTTP/HTTPS fetch, no remote YAML resolution. |
| No secrets in error messages | Error messages in the 6 error classes must not include credentials, tokens, or user-supplied data beyond file paths and version strings. |
| Input validation before processing | Config normalization must validate and reject obsolete scalar fields before any processing occurs (fail-fast; no partial normalize). |

## Error Message Policy

| Policy | Rule |
|---|---|
| Failure category naming | Every error message thrown from `execution.ts` must name the specific failure category. Examples: "CalibrationResolutionError: Failed to load pack at {packPath}", "UiFidelityEvidenceError: uiFidelity.status is '{status}'; expected 'completed'". |
| Affected file or ref named | Error messages for validator failures must name the specific file path or evidenceRef that caused the rejection. |
| No calibration error for non-calibration failures | Messages starting with "Failed to load calibration pack" must only be thrown from the calibration resolution catch block. |

## Unchanged Policies from Rev6

The following policies established by rev6 discussion (discussion-20260415161758193) remain in effect and are not modified by rev7:

| Policy | Status |
|---|---|
| Backward compatibility abandoned (後方互換は完全に捨てる) | Unchanged — still applies |
| Single PR delivery policy | Unchanged — all workstreams in one PR |
| No `standard` / `low-cost` mode re-introduction | Unchanged |
| No non-UI surface re-introduction (`cli`, `api`, `backend`) | Unchanged |
| `PROTOTYPING_SUPPORTED_SURFACES = ["web", "mobile", "desktop", "mixed"]` | Unchanged (WS-7 only syncs the error message to this constant) |
